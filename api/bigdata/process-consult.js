import crypto from 'node:crypto';
import { supabaseAdmin } from '../_utils/supabaseAdmin.js';

const BIGDATA_BASE_URL = process.env.BIGDATA_BASE_URL || 'https://plataforma.bigdatacorp.com.br';
const BIGDATA_TOKEN_ID = process.env.BIGDATA_TOKEN_ID;
const BIGDATA_ACCESS_TOKEN = process.env.BIGDATA_ACCESS_TOKEN;
const PROCESS_CREDITS = 1;

function onlyDigits(value) {
  return String(value || '').replace(/\D/g, '');
}

function hasUsefulResult(value) {
  if (!value || typeof value !== 'object') return false;
  const keys = Object.keys(value).map((key) => key.toLowerCase());
  return keys.some((key) => !['matchkeys', 'queryid', 'querydate', 'status'].includes(key));
}

function findMatchingProcess(value, processNumber, candidates = [], depth = 0) {
  if (!value || depth > 12) return candidates;
  if (Array.isArray(value)) {
    value.forEach((item) => findMatchingProcess(item, processNumber, candidates, depth + 1));
    return candidates;
  }
  if (typeof value !== 'object') return candidates;

  const normalizedTarget = onlyDigits(processNumber);
  const numberKeys = ['number', 'processnumber', 'lawsuitnumber', 'casenumber', 'cnjnumber', 'numeroprocesso'];
  const ownNumber = Object.entries(value).find(([key]) => numberKeys.includes(String(key).toLowerCase()));
  if (ownNumber && onlyDigits(ownNumber[1]) === normalizedTarget) {
    candidates.push(value);
  }
  Object.values(value).forEach((item) => findMatchingProcess(item, processNumber, candidates, depth + 1));
  return candidates;
}

function selectBestProcessResult(payload, processNumber) {
  const candidates = findMatchingProcess(payload, processNumber);
  const best = candidates
    .filter(hasUsefulResult)
    .sort((a, b) => JSON.stringify(b).length - JSON.stringify(a).length)[0];
  return best || null;
}

function hashPersonCpf(cpf) {
  const salt = process.env.BIGDATA_CACHE_HASH_SALT || process.env.SUPABASE_SERVICE_ROLE_KEY || 'locacheck-cache';
  return crypto.createHash('sha256').update(`${salt}:cpf:${cpf}`).digest('hex');
}

async function callBigData(path, body) {
  const response = await fetch(`${BIGDATA_BASE_URL.replace(/\/$/, '')}${path}`, {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      AccessToken: BIGDATA_ACCESS_TOKEN,
      TokenId: BIGDATA_TOKEN_ID,
    },
    body: JSON.stringify(body),
  });
  const raw = await response.json().catch(() => ({}));
  return { response, raw };
}

function flattenProcess(value, path = [], output = [], depth = 0) {
  if (output.length >= 250 || depth > 8 || value === null || value === undefined || value === '') return output;
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    output.push({
      label: path.join(' › ') || 'Informação',
      value: String(value),
    });
    return output;
  }
  if (Array.isArray(value)) {
    value.slice(0, 80).forEach((item, index) => flattenProcess(item, [...path, `Item ${index + 1}`], output, depth + 1));
    return output;
  }
  if (typeof value === 'object') {
    Object.entries(value).forEach(([key, item]) => flattenProcess(item, [...path, key], output, depth + 1));
  }
  return output;
}

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ success: false, message: 'Método não permitido.' });
    }
    if (!BIGDATA_TOKEN_ID || !BIGDATA_ACCESS_TOKEN) {
      return res.status(500).json({ success: false, message: 'Credenciais BigDataCorp não configuradas na Vercel.' });
    }

    const token = String(req.headers.authorization || '').replace('Bearer ', '').trim();
    const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(token);
    const user = authData?.user;
    if (authError || !user?.id) {
      return res.status(401).json({ success: false, message: 'Usuário não autenticado.' });
    }

    const processNumber = onlyDigits(req.body?.processNumber || req.body?.process_number);
    if (processNumber.length !== 20) {
      return res.status(400).json({ success: false, message: 'Número de processo inválido ou incompleto.' });
    }

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('id, credits, account_status, is_blocked, blocked_reason')
      .eq('id', user.id)
      .maybeSingle();

    if (!profile) return res.status(400).json({ success: false, message: 'Perfil não encontrado.' });
    if (profile.is_blocked || ['bloqueado', 'blocked'].includes(String(profile.account_status || '').toLowerCase())) {
      return res.status(403).json({ success: false, message: profile.blocked_reason || 'Conta bloqueada.' });
    }
    if (Number(profile.credits || 0) < PROCESS_CREDITS) {
      return res.status(402).json({ success: false, message: 'Créditos insuficientes. A consulta completa do processo consome 1 crédito.' });
    }

    const subjectCpf = onlyDigits(req.body?.cpf || req.body?.subjectCpf || '');
    let response = { ok: true, status: 200 };
    let raw = {};
    let result = null;

    if (subjectCpf.length === 11) {
      const { data: cachedPerson } = await supabaseAdmin
        .from('external_consultation_cache')
        .select('raw_response')
        .eq('cpf_hash', hashPersonCpf(subjectCpf))
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (cachedPerson?.raw_response) {
        raw = cachedPerson.raw_response;
        result = selectBestProcessResult(raw, processNumber);
      }

      if (!result) {
        const fallback = await callBigData('/pessoas', {
          q: `doc{${subjectCpf}}, returnupdates{true}, updateslimit{100}, partieslimit{100}`,
          Datasets: 'processes',
          Limit: 1,
        });
        raw = fallback.raw;
        response = fallback.response;
        result = selectBestProcessResult(raw, processNumber);
      }
    }

    if (!response.ok || !hasUsefulResult(result)) {
      await supabaseAdmin.from('process_consultation_logs').insert({
        user_id: user.id,
        process_number: processNumber,
        process_hash: crypto.createHash('sha256').update(processNumber).digest('hex'),
        credits_charged: 0,
        status: response.ok ? 'not_found' : 'error',
        raw_response: raw,
      });
      return res.status(response.ok ? 404 : 502).json({
        success: false,
        message: response.ok
          ? 'Não foi possível recuperar os detalhes completos deste processo. Nenhum crédito foi descontado.'
          : 'A consulta do processo falhou. Nenhum crédito foi descontado.',
      });
    }

    const { data: debit, error: debitError } = await supabaseAdmin.rpc('consume_user_credits_v46', {
      p_user_id: user.id,
      p_amount: PROCESS_CREDITS,
    });
    if (debitError || !debit?.success) {
      return res.status(402).json({ success: false, message: debit?.message || 'Créditos insuficientes.' });
    }

    await supabaseAdmin.from('credit_movements').insert({
      user_id: user.id,
      amount: -PROCESS_CREDITS,
      movement_type: 'process_consult',
      description: `Consulta completa do processo ${processNumber}`,
    });

    await supabaseAdmin.from('process_consultation_logs').insert({
      user_id: user.id,
      process_number: processNumber,
      process_hash: crypto.createHash('sha256').update(processNumber).digest('hex'),
      credits_charged: PROCESS_CREDITS,
      credits_balance_after: Number(debit.balance_after),
      status: 'success',
      result_summary: { fields_count: flattenProcess(result).length },
      raw_response: raw,
    });

    return res.status(200).json({
      success: true,
      processNumber,
      creditsCharged: PROCESS_CREDITS,
      creditsBalanceAfter: Number(debit.balance_after),
      details: flattenProcess(result),
    });
  } catch (error) {
    console.error('Erro na consulta completa de processo:', error);
    return res.status(500).json({ success: false, message: 'Erro inesperado ao consultar o processo.' });
  }
}
