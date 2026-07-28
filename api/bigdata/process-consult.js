import crypto from 'node:crypto';
import { supabaseAdmin } from '../_utils/supabaseAdmin.js';

const BIGDATA_BASE_URL = process.env.BIGDATA_BASE_URL || 'https://plataforma.bigdatacorp.com.br';
const BIGDATA_TOKEN_ID = process.env.BIGDATA_TOKEN_ID;
const BIGDATA_ACCESS_TOKEN = process.env.BIGDATA_ACCESS_TOKEN;
const PROCESS_DATASETS = process.env.BIGDATA_PROCESS_DATASETS || 'processes';
const PROCESS_CREDITS = 2;

function onlyDigits(value) {
  return String(value || '').replace(/\D/g, '');
}

function firstResult(payload) {
  if (Array.isArray(payload?.Result)) return payload.Result[0] || null;
  return payload?.Result || null;
}

function hasUsefulResult(value) {
  if (!value || typeof value !== 'object') return false;
  return Object.keys(value).length > 0;
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
      return res.status(402).json({ success: false, message: 'Créditos insuficientes. A consulta completa do processo consome 2 créditos.' });
    }

    const response = await fetch(`${BIGDATA_BASE_URL.replace(/\/$/, '')}/processos`, {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        AccessToken: BIGDATA_ACCESS_TOKEN,
        TokenId: BIGDATA_TOKEN_ID,
      },
      body: JSON.stringify({
        q: `processnumber{${processNumber}}, all{true}`,
        Datasets: PROCESS_DATASETS,
        Limit: 1,
      }),
    });

    const raw = await response.json().catch(() => ({}));
    const result = firstResult(raw);
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
          ? 'Processo não encontrado. Nenhum crédito foi descontado.'
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
