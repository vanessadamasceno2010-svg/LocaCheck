import crypto from 'node:crypto';
import { supabaseAdmin } from '../_utils/supabaseAdmin.js';

const BIGDATA_BASE_URL = process.env.BIGDATA_BASE_URL || 'https://plataforma.bigdatacorp.com.br';
const BIGDATA_TOKEN_ID = process.env.BIGDATA_TOKEN_ID;
const BIGDATA_ACCESS_TOKEN = process.env.BIGDATA_ACCESS_TOKEN;
const CACHE_DAYS = Number(process.env.BIGDATA_CACHE_DAYS || 7);
const BASIC_CREDITS = Number(process.env.EXTERNAL_BASIC_CREDITS || 2);
const COMPLETE_CREDITS = Number(process.env.EXTERNAL_COMPLETE_CREDITS || 3);
const ADVANCED_CREDITS = Number(process.env.EXTERNAL_ADVANCED_CREDITS || 5);
const ADVANCED_DATASETS = String(
  process.env.BIGDATA_ADVANCED_DATASETS || 'basic_data,registration_data,processes.limit(10)'
)
  .split(',')
  .map((item) => item.trim())
  .filter(Boolean);

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

function normalizeDatasetName(dataset) {
  return String(dataset || '').trim();
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

  if (type === 'external_advanced') {
    return {
      type,
      label: 'Consulta Externa Avançada',
      credits: ADVANCED_CREDITS,
      datasets: ADVANCED_DATASETS.length ? ADVANCED_DATASETS : ['basic_data', 'registration_data', 'processes.limit(10)'],
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

function findAllDeep(obj, keys) {
  if (!obj || typeof obj !== 'object') return [];
  const queue = [obj];
  const lowerKeys = keys.map((key) => key.toLowerCase());
  const found = [];

  while (queue.length) {
    const current = queue.shift();
    if (!current || typeof current !== 'object') continue;

    for (const [key, value] of Object.entries(current)) {
      if (lowerKeys.includes(String(key).toLowerCase()) && value !== null && value !== undefined && value !== '') {
        found.push(value);
      }
      if (value && typeof value === 'object') queue.push(value);
    }
  }

  return found;
}

function asArray(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (typeof value === 'object') return [value];
  return [value];
}

function uniqueByText(items, limit = 10) {
  const seen = new Set();
  const result = [];
  for (const item of items) {
    const key = JSON.stringify(item).toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    result.push(item);
    if (result.length >= limit) break;
  }
  return result;
}

function countFromAny(value) {
  if (typeof value === 'number') return value;
  if (Array.isArray(value)) return value.length;
  if (value && typeof value === 'object') {
    const direct = findDeep(value, ['TotalLawsuits', 'TotalProcesses', 'Total', 'Count', 'ProcessesCount', 'LawsuitsCount', 'NumberOfProcesses']);
    const parsed = Number(direct);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
}

function formatMaybeDate(value) {
  if (!value) return null;
  const text = String(value);
  const date = new Date(text);
  if (Number.isNaN(date.getTime())) return text;
  return date.toISOString().slice(0, 10);
}

function normalizePhone(item) {
  if (!item) return null;
  if (typeof item === 'string' || typeof item === 'number') {
    const digits = onlyDigits(item);
    return digits.length >= 8 ? { number: String(item) } : null;
  }
  const number =
    findDeep(item, ['Number', 'PhoneNumber', 'Telefone', 'Phone', 'FormattedNumber', 'FullNumber']) ||
    [findDeep(item, ['AreaCode', 'DDD']), findDeep(item, ['Number', 'Numero'])].filter(Boolean).join(' ');
  if (!number) return null;
  return {
    number: String(number),
    type: findDeep(item, ['Type', 'Tipo']) || null,
    ranking: findDeep(item, ['Ranking', 'Priority', 'Score']) || null,
  };
}

function normalizeEmail(item) {
  if (!item) return null;
  if (typeof item === 'string') return item.includes('@') ? { email: item } : null;
  const email = findDeep(item, ['Email', 'EmailAddress', 'Address', 'EnderecoEmail']);
  if (!email || !String(email).includes('@')) return null;
  return {
    email: String(email),
    ranking: findDeep(item, ['Ranking', 'Priority', 'Score']) || null,
  };
}

function normalizeAddress(item) {
  if (!item) return null;
  if (typeof item === 'string') return { full: item };
  const street = findDeep(item, ['Street', 'AddressMain', 'Logradouro', 'Address', 'Endereco']);
  const number = findDeep(item, ['Number', 'Numero']);
  const complement = findDeep(item, ['Complement', 'Complemento']);
  const neighborhood = findDeep(item, ['Neighborhood', 'Bairro']);
  const city = findDeep(item, ['City', 'Cidade']);
  const state = findDeep(item, ['State', 'UF', 'Estado']);
  const zip = findDeep(item, ['ZipCode', 'PostalCode', 'CEP']);

  const full = [street, number, complement, neighborhood, city, state, zip].filter(Boolean).join(', ');
  if (!full) return null;

  return { full, street: street || null, number: number || null, complement: complement || null, neighborhood: neighborhood || null, city: city || null, state: state || null, zip: zip || null };
}

function normalizeProcess(item, index = 0) {
  if (!item || typeof item !== 'object') return null;
  const number = findDeep(item, ['Number', 'ProcessNumber', 'LawsuitNumber', 'CaseNumber', 'CNJNumber', 'NumeroProcesso']);
  const court = findDeep(item, ['CourtName', 'Court', 'Tribunal', 'ForumName']);
  const state = findDeep(item, ['State', 'UF', 'Estado']);
  const type = findDeep(item, ['CourtType', 'Type', 'Nature', 'Natureza', 'ProcedureType', 'CnjProcedureType']);
  const subject = findDeep(item, ['MainSubject', 'Subject', 'Assunto', 'CnjSubject']);
  const status = findDeep(item, ['Status', 'Situation', 'Situacao']);
  const distributionDate = formatMaybeDate(findDeep(item, ['NoticeDate', 'DistributionDate', 'DataDistribuicao', 'FilingDate']));
  const value = findDeep(item, ['Value', 'Amount', 'Valor']);
  const parties = asArray(findDeep(item, ['Parties', 'Partes']));
  const userParty = parties.find((party) => {
    const polarity = String(findDeep(party, ['Polarity', 'Polaridade']) || '').toUpperCase();
    const type = String(findDeep(party, ['Type', 'PartyType', 'Tipo']) || '').toUpperCase();
    return polarity || type;
  });
  const polarity = userParty ? findDeep(userParty, ['Polarity', 'Polaridade']) : findDeep(item, ['PartyPolarity', 'Polaridade']);
  const partyType = userParty ? findDeep(userParty, ['Type', 'PartyType', 'Tipo']) : findDeep(item, ['PartyType', 'TipoParte']);

  if (!number && !court && !type && !subject && !status) return null;

  return {
    title: number ? `Processo ${number}` : `Processo ${index + 1}`,
    number: number || null,
    court: court || null,
    state: state || null,
    type: type || null,
    subject: subject || null,
    status: status || null,
    distribution_date: distributionDate || null,
    value: value || null,
    person_role: simplifyProcessRole(polarity, partyType),
  };
}

function simplifyProcessRole(polarity, partyType) {
  const pol = String(polarity || '').toUpperCase();
  const typ = String(partyType || '').toUpperCase();
  if (pol === 'ACTIVE') return 'Entrou com a ação';
  if (pol === 'PASSIVE') return 'Foi acionado no processo';
  if (typ.includes('DEFEND') || typ.includes('CLAIMED')) return 'Foi acionado no processo';
  if (typ.includes('AUTHOR') || typ.includes('CLAIMANT')) return 'Entrou com a ação';
  if (typ) return 'Aparece como parte relacionada';
  return null;
}

function collectContacts(firstResult) {
  const phoneNodes = findAllDeep(firstResult, ['Phones', 'PhoneNumbers', 'Telefones', 'PhoneData', 'MobilePhones']);
  const emailNodes = findAllDeep(firstResult, ['Emails', 'EmailAddresses', 'E-mails', 'EmailData']);
  const addressNodes = findAllDeep(firstResult, ['Addresses', 'Enderecos', 'Endereços', 'AddressData']);

  const phones = uniqueByText(phoneNodes.flatMap(asArray).map(normalizePhone).filter(Boolean), 8);
  const emails = uniqueByText(emailNodes.flatMap(asArray).map(normalizeEmail).filter(Boolean), 8);
  const addresses = uniqueByText(addressNodes.flatMap(asArray).map(normalizeAddress).filter(Boolean), 6);

  return { phones, emails, addresses };
}

function collectProcesses(firstResult) {
  const processNodes = findAllDeep(firstResult, ['Processes', 'Lawsuits', 'LawsuitData', 'Processos']);
  const flattened = [];
  for (const node of processNodes) {
    if (Array.isArray(node)) flattened.push(...node);
    else if (node && typeof node === 'object') {
      const nested = findDeep(node, ['Items', 'Results', 'Processes', 'Lawsuits']);
      if (Array.isArray(nested)) flattened.push(...nested);
      else flattened.push(node);
    }
  }
  return uniqueByText(flattened.map(normalizeProcess).filter(Boolean), 10);
}

function buildSummary(rawResponse, consultationType, cached = false, cpf = '') {
  const firstResult = Array.isArray(rawResponse?.Result) ? rawResponse.Result[0] : rawResponse?.Result || rawResponse || {};

  const name = findDeep(firstResult, ['Name', 'FullName', 'Nome', 'nome']);
  const documentStatus = findDeep(firstResult, ['TaxIdStatus', 'CPFStatus', 'Status', 'StatusCPF', 'RegistrationStatus']);
  const birthDate = findDeep(firstResult, ['BirthDate', 'Nascimento', 'DateOfBirth']);
  const motherName = findDeep(firstResult, ['MotherName', 'NomeMae', 'MothersName', 'Mother']);
  const fatherName = findDeep(firstResult, ['FatherName', 'NomePai', 'FathersName', 'Father']);
  const socialNumber = findDeep(firstResult, ['SocialNumber', 'NIS', 'PIS', 'PASEP', 'NisPisPasep', 'SocialSecurityNumber']);
  const lawsuitsNode = findDeep(firstResult, ['Processes', 'Lawsuits', 'LawsuitsDistributionData', 'LawsuitsDistribution']);
  const lawsuitsTotal = countFromAny(lawsuitsNode || firstResult);
  const queryId = rawResponse?.QueryId || rawResponse?.QueryID || findDeep(rawResponse, ['QueryId', 'QueryID']);
  const contacts = consultationType === 'external_advanced' ? collectContacts(firstResult) : { phones: [], emails: [], addresses: [] };
  const processes = consultationType === 'external_advanced' ? collectProcesses(firstResult) : [];

  return {
    source: 'BigDataCorp',
    cached,
    consultation_type: consultationType,
    name: name || null,
    cpf: cpf || null,
    cpf_masked: cpf || null,
    document_status: documentStatus || null,
    birth_date: birthDate || null,
    mother_name: motherName || null,
    father_name: fatherName || null,
    social_number: socialNumber || null,
    mother_name_available: Boolean(motherName),
    lawsuits_total: lawsuitsTotal || processes.length || 0,
    has_lawsuit_indicators: Boolean(lawsuitsTotal > 0 || lawsuitsNode || processes.length),
    phones: contacts.phones,
    emails: contacts.emails,
    addresses: contacts.addresses,
    processes: processes,
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
          Datasets: config.datasets.map(normalizeDatasetName).join(','),
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

      resultSummary = buildSummary(rawResponse, config.type, false, cpf);

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
      resultSummary = resultSummary || buildSummary(rawResponse, config.type, true, cpf);
      resultSummary = { ...resultSummary, cached: true, cpf, cpf_masked: cpf };
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
      description: `${config.label} - CPF ${cpf}`,
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
      message: 'Consulta externa realizada com sucesso.',
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
