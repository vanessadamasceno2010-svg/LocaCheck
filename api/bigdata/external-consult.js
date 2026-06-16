import crypto from 'node:crypto';
import { supabaseAdmin } from '../_utils/supabaseAdmin.js';

const BIGDATA_BASE_URL = process.env.BIGDATA_BASE_URL || 'https://plataforma.bigdatacorp.com.br';
const BIGDATA_TOKEN_ID = process.env.BIGDATA_TOKEN_ID;
const BIGDATA_ACCESS_TOKEN = process.env.BIGDATA_ACCESS_TOKEN;
const CACHE_DAYS = Number(process.env.BIGDATA_CACHE_DAYS || 7);
const BASIC_CREDITS = Number(process.env.EXTERNAL_BASIC_CREDITS || 2);
const COMPLETE_CREDITS = Number(process.env.EXTERNAL_COMPLETE_CREDITS || 3);

function onlyDigits(value) {
  return String(value || '').replace(/\D/g, '');
}

function isValidCpf(value) {
  const cpf = onlyDigits(value);
  if (cpf.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cpf)) return false;

  let sum = 0;
  for (let i = 0; i < 9; i += 1) sum += Number(cpf[i]) * (10 - i);
  let firstDigit = (sum * 10) % 11;
  if (firstDigit === 10) firstDigit = 0;
  if (firstDigit !== Number(cpf[9])) return false;

  sum = 0;
  for (let i = 0; i < 10; i += 1) sum += Number(cpf[i]) * (11 - i);
  let secondDigit = (sum * 10) % 11;
  if (secondDigit === 10) secondDigit = 0;
  return secondDigit === Number(cpf[10]);
}

function hashCpf(cpf) {
  const salt = process.env.BIGDATA_CACHE_HASH_SALT || process.env.SUPABASE_SERVICE_ROLE_KEY || 'locacheck-cache';
  return crypto.createHash('sha256').update(`${salt}:${cpf}`).digest('hex');
}

function getConsultConfig(type) {
  if (type === 'external_basic') {
    return {
      type,
      label: 'Consulta Externa Básica',
      credits: BASIC_CREDITS,
      datasets: ['basic_data'],
    };
  }

  return {
    type: 'external_complete',
    label: 'Consulta Externa Completa',
    credits: COMPLETE_CREDITS,
    datasets: ['basic_data', 'lawsuits_distribution_data'],
  };
}

function findDeep(obj, keys) {
  if (!obj || typeof obj !== 'object') return null;
  const queue = [obj];
  const lowerKeys = keys.map((key) => key.toLowerCase());

  while (queue.length) {
    const current = queue.shift();
    if (!current || typeof current !== 'object') continue;

    for (const [key, value] of Object.entries(current)) {
      if (lowerKeys.includes(String(key).toLowerCase()) && value !== null && value !== undefined && value !== '') {
        return value;
      }
      if (value && typeof value === 'object') queue.push(value);
    }
  }

  return null;
}

function countFromAny(value) {
  if (typeof value === 'number') return value;
  if (Array.isArray(value)) return value.length;
  if (value && typeof value === 'object') {
    const direct = findDeep(value, ['TotalLawsuits', 'TotalProcesses', 'Total', 'Count', 'ProcessesCount', 'LawsuitsCount']);
    const parsed = Number(direct);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
}

function buildSummary(rawResponse, consultationType, cached = false) {
  const firstResult = Array.isArray(rawResponse?.Result) ? rawResponse.Result[0] : rawResponse?.Result || rawResponse || {};

  const name = findDeep(firstResult, ['Name', 'FullName', 'Nome', 'nome']);
  const documentStatus = findDeep(firstResult, ['TaxIdStatus', 'CPFStatus', 'Status', 'StatusCPF', 'RegistrationStatus']);
  const birthDate = findDeep(firstResult, ['BirthDate', 'Nascimento', 'DateOfBirth']);
  const motherName = findDeep(firstResult, ['MotherName', 'NomeMae', 'MothersName']);
  const lawsuitsNode = findDeep(firstResult, ['Processes', 'Lawsuits', 'LawsuitsDistributionData', 'LawsuitsDistribution']);
  const lawsuitsTotal = countFromAny(lawsuitsNode || firstResult);
  const queryId = rawResponse?.QueryId || rawResponse?.QueryID || findDeep(rawResponse, ['QueryId', 'QueryID']);

  return {
    source: 'BigDataCorp',
    cached,
    consultation_type: consultationType,
    name: name || null,
    cpf_masked: '***.***.***-' + String(findDeep(firstResult, ['Cpf4']) || '').slice(-4),
    document_status: documentStatus || null,
    birth_date: birthDate || null,
    mother_name_available: Boolean(motherName),
    lawsuits_total: lawsuitsTotal || 0,
    has_lawsuit_indicators: Boolean(lawsuitsTotal > 0 || lawsuitsNode),
    query_id: queryId || null,
    message: 'Resultado externo tratado para apoio à análise. Use com responsabilidade e finalidade legítima.',
  };
}

async function insertSafe(table, payload) {
  const { error } = await supabaseAdmin.from(table).insert(payload);
  if (error) console.error(`Erro ao inserir em ${table}:`, error);
}

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ success: false, message: 'Método não permitido.' });
    }

    if (!BIGDATA_TOKEN_ID || !BIGDATA_ACCESS_TOKEN) {
      return res.status(500).json({
        success: false,
        message: 'Credenciais BigDataCorp não configuradas na Vercel.',
      });
    }

    const authHeader = req.headers.authorization || '';
    const accessToken = authHeader.replace('Bearer ', '').trim();

    if (!accessToken) {
      return res.status(401).json({ success: false, message: 'Sessão inválida. Faça login novamente.' });
    }

    const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(accessToken);
    const user = authData?.user;

    if (authError || !user?.id) {
      return res.status(401).json({ success: false, message: 'Usuário não autenticado.' });
    }

    const cpf = onlyDigits(req.body?.cpf || req.body?.document || '');
    const requestedType = String(req.body?.consultationType || req.body?.consultation_type || 'external_complete');
    const config = getConsultConfig(requestedType);

    if (!isValidCpf(cpf)) {
      return res.status(400).json({ success: false, message: 'Informe um CPF completo e válido para consulta externa.' });
    }

    const cpf4 = cpf.slice(-4);
    const cpfHash = hashCpf(cpf);

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id, nome, email, role, credits, consultas')
      .eq('id', user.id)
      .maybeSingle();

    if (profileError || !profile) {
      return res.status(400).json({ success: false, message: 'Perfil do usuário não encontrado.' });
    }

    if (Number(profile.credits || 0) < config.credits) {
      return res.status(402).json({
        success: false,
        message: `Créditos insuficientes. A ${config.label} consome ${config.credits} créditos.`,
      });
    }

    const now = new Date().toISOString();
    const { data: cached } = await supabaseAdmin
      .from('external_consultation_cache')
      .select('*')
      .eq('cpf_hash', cpfHash)
      .eq('consultation_type', config.type)
      .gt('expires_at', now)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    let rawResponse = cached?.raw_response || null;
    let resultSummary = cached?.result_summary || null;
    let cacheHit = Boolean(cached?.id && rawResponse);
    let bigDataStatus = 'cache_hit';
    let bigDataError = '';

    if (!cacheHit) {
      const response = await fetch(`${BIGDATA_BASE_URL.replace(/\/$/, '')}/pessoas`, {
        method: 'POST',
        headers: {
          accept: 'application/json',
          'content-type': 'application/json',
          AccessToken: BIGDATA_ACCESS_TOKEN,
          TokenId: BIGDATA_TOKEN_ID,
        },
        body: JSON.stringify({
          q: `doc{${cpf}}`,
          Datasets: config.datasets.join(','),
          Limit: 1,
        }),
      });

      let parsed;
      try {
        parsed = await response.json();
      } catch {
        parsed = { message: await response.text() };
      }

      rawResponse = parsed;
      bigDataStatus = response.ok ? 'success' : 'provider_error';

      if (!response.ok) {
        bigDataError = parsed?.message || parsed?.Message || `Erro externo HTTP ${response.status}`;
        await insertSafe('external_consultation_logs', {
          user_id: user.id,
          cpf_hash: cpfHash,
          cpf4,
          provider: 'BigDataCorp',
          consultation_type: config.type,
          datasets: config.datasets,
          credits_charged: 0,
          cache_hit: false,
          status: 'error',
          result_summary: {},
          raw_response: rawResponse,
          error_message: bigDataError,
        });
        return res.status(502).json({ success: false, message: 'A consulta externa falhou. Nenhum crédito foi descontado.' });
      }

      resultSummary = buildSummary(rawResponse, config.type, false);
      resultSummary.cpf_masked = `***.***.***-${cpf4}`;

      const expiresAt = new Date(Date.now() + CACHE_DAYS * 24 * 60 * 60 * 1000).toISOString();
      const { error: cacheError } = await supabaseAdmin
        .from('external_consultation_cache')
        .upsert({
          cpf_hash: cpfHash,
          cpf4,
          consultation_type: config.type,
          datasets: config.datasets,
          result_summary: resultSummary,
          raw_response: rawResponse,
          expires_at: expiresAt,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'cpf_hash,consultation_type' });

      if (cacheError) console.error('Erro ao salvar cache externo:', cacheError);
    } else {
      resultSummary = resultSummary || buildSummary(rawResponse, config.type, true);
      resultSummary = { ...resultSummary, cached: true, cpf_masked: `***.***.***-${cpf4}` };
    }

    const newCredits = Number(profile.credits || 0) - config.credits;
    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({
        credits: newCredits,
        consultas: Number(profile.consultas || 0) + 1,
      })
      .eq('id', user.id);

    if (updateError) {
      console.error('Erro ao descontar créditos:', updateError);
      return res.status(500).json({ success: false, message: 'Não foi possível descontar os créditos da consulta externa.' });
    }

    await insertSafe('credit_movements', {
      user_id: user.id,
      amount: -config.credits,
      movement_type: 'external_consult',
      description: `${config.label} - CPF ***.***.***-${cpf4}`,
    });

    const { data: logData, error: logError } = await supabaseAdmin
      .from('external_consultation_logs')
      .insert({
        user_id: user.id,
        cpf_hash: cpfHash,
        cpf4,
        provider: 'BigDataCorp',
        consultation_type: config.type,
        datasets: config.datasets,
        credits_charged: config.credits,
        cache_hit: cacheHit,
        status: 'success',
        result_summary: resultSummary,
        raw_response: rawResponse,
        error_message: bigDataError || null,
      })
      .select('id')
      .maybeSingle();

    if (logError) console.error('Erro ao salvar log externo:', logError);

    await insertSafe('activity_logs', {
      user_id: user.id,
      action: 'external_consultation_completed',
      details: {
        consultation_type: config.type,
        credits_charged: config.credits,
        cpf4,
        cache_hit: cacheHit,
        datasets: config.datasets,
        log_id: logData?.id || null,
      },
    });

    return res.status(200).json({
      success: true,
      message: cacheHit
        ? 'Consulta externa realizada com resultado em cache seguro.'
        : 'Consulta externa realizada com sucesso.',
      consultationType: config.type,
      consultationLabel: config.label,
      creditsCharged: config.credits,
      cacheHit,
      results: [resultSummary],
    });
  } catch (error) {
    console.error('Erro inesperado na consulta externa:', error);
    return res.status(500).json({ success: false, message: 'Erro inesperado na consulta externa.' });
  }
}
