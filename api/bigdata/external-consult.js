import crypto from 'node:crypto';
import { supabaseAdmin } from '../_utils/supabaseAdmin.js';

const BIGDATA_BASE_URL = process.env.BIGDATA_BASE_URL || 'https://plataforma.bigdatacorp.com.br';
const BIGDATA_TOKEN_ID = process.env.BIGDATA_TOKEN_ID;
const BIGDATA_ACCESS_TOKEN = process.env.BIGDATA_ACCESS_TOKEN;
const CACHE_DAYS = Number(process.env.BIGDATA_CACHE_DAYS || 7);
const BASIC_CREDITS = Number(process.env.EXTERNAL_BASIC_CREDITS || 2);
const COMPLETE_CREDITS = Number(process.env.EXTERNAL_COMPLETE_CREDITS || 3);
const ADVANCED_CREDITS = 3;
const COMPLETE_DATASETS = String(
  process.env.BIGDATA_COMPLETE_DATASETS || 'basic_data,registration_data,addresses_extended.limit(20),phones_extended.limit(20),emails_extended.limit(20)'
)
  .split(',')
  .map((item) => item.trim())
  .filter(Boolean);

const ADVANCED_DATASETS = String(
  process.env.BIGDATA_ADVANCED_DATASETS || 'basic_data,registration_data,addresses_extended.limit(20),phones_extended.limit(20),emails_extended.limit(20),related_people_phones.limit(20),related_people_emails.limit(20),processes.limit(20)'
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

function hashIdentifier(type, value) {
  const salt = process.env.BIGDATA_CACHE_HASH_SALT || process.env.SUPABASE_SERVICE_ROLE_KEY || 'locacheck-cache';
  return crypto.createHash('sha256').update(`${salt}:${type}:${String(value || '').toLowerCase()}`).digest('hex');
}

function normalizeEmailValue(value) {
  return String(value || '').trim().toLowerCase();
}

function normalizePhoneValue(value) {
  const digits = onlyDigits(value);
  if (digits.length === 10 || digits.length === 11) return digits;
  if ((digits.length === 12 || digits.length === 13) && digits.startsWith('55')) return digits.slice(2);
  return digits;
}

function resolveSearchInput(body = {}) {
  const requestedType = String(body.searchType || body.search_type || '').toLowerCase();
  const rawValue = String(body.searchValue || body.search_value || body.cpf || body.document || '').trim();
  const inferredType = requestedType || (rawValue.includes('@') ? 'email' : onlyDigits(rawValue).length === 11 && isValidCpf(rawValue) ? 'cpf' : 'phone');
  const value = inferredType === 'email'
    ? normalizeEmailValue(rawValue)
    : inferredType === 'cpf'
      ? onlyDigits(rawValue)
      : normalizePhoneValue(rawValue);

  if (inferredType === 'cpf' && !isValidCpf(value)) {
    return { error: 'Informe um CPF completo e válido.' };
  }
  if (inferredType === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value)) {
    return { error: 'Informe um e-mail válido.' };
  }
  if (inferredType === 'phone' && (value.length < 10 || value.length > 11)) {
    return { error: 'Informe um telefone com DDD válido.' };
  }

  const queryKey = inferredType === 'cpf' ? 'doc' : inferredType;
  return {
    type: inferredType,
    value,
    query: `${queryKey}{${value}}`,
    display: value,
    hash: hashIdentifier(inferredType, value),
  };
}

function normalizeDatasetName(dataset) {
  return String(dataset || '').trim();
}

function getConsultConfig(type) {
  if (type === 'external_basic') {
    return {
      type: 'external_advanced',
      label: 'Consulta Externa Completa',
      credits: ADVANCED_CREDITS,
      datasets: ADVANCED_DATASETS.length ? ADVANCED_DATASETS : ['basic_data', 'registration_data', 'addresses_extended.limit(20)', 'phones_extended.limit(20)', 'emails_extended.limit(20)', 'related_people_phones.limit(20)', 'related_people_emails.limit(20)', 'processes.limit(20)'],
    };
  }

  if (type === 'external_advanced') {
    return {
      type,
      label: 'Consulta Externa Completa',
      credits: ADVANCED_CREDITS,
      datasets: ADVANCED_DATASETS.length ? ADVANCED_DATASETS : ['basic_data', 'registration_data', 'addresses_extended.limit(20)', 'phones_extended.limit(20)', 'emails_extended.limit(20)', 'related_people_phones.limit(20)', 'related_people_emails.limit(20)', 'processes.limit(20)'],
    };
  }

  return {
    type: 'external_advanced',
    label: 'Consulta Externa Completa',
    credits: ADVANCED_CREDITS,
    datasets: ADVANCED_DATASETS.length ? ADVANCED_DATASETS : ['basic_data', 'registration_data', 'addresses_extended.limit(20)', 'phones_extended.limit(20)', 'emails_extended.limit(20)', 'related_people_phones.limit(20)', 'related_people_emails.limit(20)', 'processes.limit(20)'],
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

function titleCasePt(value) {
  const text = String(value || '').replace(/_/g, ' ').replace(/\s+/g, ' ').trim();
  if (!text) return null;
  return text
    .toLowerCase()
    .split(' ')
    .map((word) => {
      if (['de', 'da', 'do', 'das', 'dos', 'e', 'em'].includes(word)) return word;
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');
}

function translateExtraLabel(key) {
  const clean = String(key || '').replace(/([a-z])([A-Z])/g, '$1 $2').replace(/_/g, ' ').replace(/\s+/g, ' ').trim();
  const lower = clean.toLowerCase();
  const map = {
    'zodiac sign': 'Signo',
    'zodiacsign': 'Signo',
    'specific type': 'Envolvimento da pessoa',
    'specifictype': 'Envolvimento da pessoa',
    'tax id number': 'CPF/CNPJ',
    'taxidnumber': 'CPF/CNPJ',
    'tax id': 'CPF/CNPJ',
    'taxid': 'CPF/CNPJ',
    'name': 'Nome',
    'full name': 'Nome completo',
    'phone': 'Telefone',
    'phones': 'Telefones',
    'email': 'E-mail',
    'emails': 'E-mails',
    'address': 'Endereço',
    'addresses': 'Endereços',
    'relationship': 'Relacionamento',
    'relationship type': 'Tipo de relacionamento',
    'economic relationship': 'Relacionamento econômico',
    'economic relationships': 'Relacionamentos econômicos',
    'mother name': 'Nome da mãe',
    'father name': 'Nome do pai',
    'birth date': 'Nascimento',
    'social number': 'Número social',
  };
  return map[lower] || clean;
}

function normalizeRoleText(value) {
  const text = titleCasePt(value);
  if (!text) return null;
  const upper = String(value || '').toUpperCase();
  const relationshipTranslations = {
    MOTHER: 'Mãe',
    FATHER: 'Pai',
    SON: 'Filho(a)',
    BROTHER: 'Irmão(ã)',
    SPOUSE: 'Cônjuge',
    PARTNER: 'Companheiro(a)',
    COUSIN: 'Primo(a)',
    UNCLE: 'Tio(a)',
    NEPHEW: 'Sobrinho(a)',
    GRANDSON: 'Neto(a)',
    GRANDPARENT: 'Avô/Avó',
    RELATIVE: 'Parente',
    HOUSEHOLD: 'Pessoa do mesmo domicílio',
    COWORKER: 'Colega de trabalho',
    NEIGHBOR: 'Vizinho(a)',
    RELATED: 'Pessoa relacionada',
  };
  if (relationshipTranslations[upper]) return relationshipTranslations[upper];
  if (upper.includes('VITIMA')) return text.replace('Vitima', 'Vítima');
  if (upper === 'LEAO') return 'Leão';
  return text;
}

function normalizePhone(item) {
  if (!item) return null;
  if (typeof item === 'string' || typeof item === 'number') {
    const digits = onlyDigits(item);
    return digits.length >= 8 ? { number: String(item) } : null;
  }
  const rawNumber = findDeep(item, ['Number', 'PhoneNumber', 'Telefone', 'Phone', 'FormattedNumber', 'FullNumber', 'Numero']);
  const areaCode = onlyDigits(findDeep(item, ['AreaCode', 'DDD', 'PhoneAreaCode']) || '');
  let numberDigits = onlyDigits(rawNumber || '');
  if ((numberDigits.length === 8 || numberDigits.length === 9) && areaCode.length === 2) {
    numberDigits = `${areaCode}${numberDigits}`;
  }
  if ((numberDigits.length === 12 || numberDigits.length === 13) && numberDigits.startsWith('55')) {
    numberDigits = numberDigits.slice(2);
  }
  const number = numberDigits || rawNumber;
  if (!number) return null;
  return {
    number: String(number),
    type: findDeep(item, ['Type', 'Tipo']) || null,
    ranking: findDeep(item, ['Ranking', 'Priority', 'Score']) || null,
    status: findDeep(item, ['ValidationStatus', 'Status', 'IsActive', 'Active', 'Ativo']) || null,
    is_main: findDeep(item, ['IsMain', 'Main', 'Principal']) || null,
    is_recent: findDeep(item, ['IsRecent', 'Recent', 'Recente']) || null,
    relationship: findDeep(item, ['Relationship', 'RelationshipType', 'TipoRelacionamento']) || null,
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
    type: findDeep(item, ['Type', 'Tipo']) || null,
    status: findDeep(item, ['ValidationStatus', 'Status', 'IsActive', 'Active', 'Ativo']) || null,
    is_main: findDeep(item, ['IsMain', 'Main', 'Principal']) || null,
    is_recent: findDeep(item, ['IsRecent', 'Recent', 'Recente']) || null,
    relationship: findDeep(item, ['Relationship', 'RelationshipType', 'TipoRelacionamento']) || null,
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

  return {
    full,
    street: street || null,
    number: number || null,
    complement: complement || null,
    neighborhood: neighborhood || null,
    city: city || null,
    state: state || null,
    zip: zip || null,
    type: findDeep(item, ['Type', 'Tipo']) || null,
    is_main: findDeep(item, ['IsMain', 'Main', 'Principal']) || null,
    is_recent: findDeep(item, ['IsRecent', 'Recent', 'Recente']) || null,
    relationship: findDeep(item, ['Relationship', 'RelationshipType', 'TipoRelacionamento']) || null,
  };
}

function normalizeProcess(item, index = 0, cpf = '') {
  if (!item || typeof item !== 'object') return null;
  const number = findDeep(item, ['Number', 'ProcessNumber', 'LawsuitNumber', 'CaseNumber', 'CNJNumber', 'NumeroProcesso']);
  const court = findDeep(item, ['CourtName', 'Court', 'Tribunal', 'ForumName']);
  const state = findDeep(item, ['State', 'UF', 'Estado']);
  const type = findDeep(item, ['CourtType', 'Type', 'Nature', 'Natureza', 'ProcedureType', 'CnjProcedureType']);
  const subject = findDeep(item, ['MainSubject', 'Subject', 'Assunto', 'CnjSubject']);
  const status = findDeep(item, ['Status', 'Situation', 'Situacao']);
  const distributionDate = formatMaybeDate(findDeep(item, ['NoticeDate', 'DistributionDate', 'DataDistribuicao', 'FilingDate']));
  const value = findDeep(item, ['Value', 'Amount', 'Valor']);
  const parties = asArray(findDeep(item, ['Parties', 'Partes', 'RelatedParties']));
  const cpfDigits = onlyDigits(cpf);
  const matchedParty = parties.find((party) => {
    const partyDoc = onlyDigits(findDeep(party, ['Doc', 'Document', 'TaxIdNumber', 'TaxId', 'CPF', 'Cpf', 'DocumentNumber']));
    return cpfDigits && partyDoc && partyDoc === cpfDigits;
  });
  const userParty = matchedParty || parties.find((party) => {
    const polarity = String(findDeep(party, ['Polarity', 'Polaridade']) || '').toUpperCase();
    const role = String(findDeep(party, ['Role', 'Type', 'PartyType', 'Tipo', 'Parte']) || '').toUpperCase();
    return polarity || role;
  });
  const polarity = userParty ? findDeep(userParty, ['Polarity', 'Polaridade']) : findDeep(item, ['PartyPolarity', 'Polaridade']);
  const specificType = userParty
    ? findDeep(userParty, ['SpecificType', 'Specific Type', 'TipoEspecifico', 'TipoEspecífico'])
    : findDeep(item, ['SpecificType', 'Specific Type', 'TipoEspecifico', 'TipoEspecífico']);
  const partyType = userParty
    ? findDeep(userParty, ['Role', 'Type', 'PartyType', 'Tipo', 'Parte'])
    : findDeep(item, ['PartyType', 'TipoParte', 'Role']);

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
    person_role: simplifyProcessRole(polarity, partyType, specificType),
    specific_type: normalizeRoleText(specificType) || null,
    raw_role: specificType || partyType || polarity || null,
  };
}

function simplifyProcessRole(polarity, partyType, specificType) {
  if (specificType) return normalizeRoleText(specificType);
  const joined = `${polarity || ''} ${partyType || ''}`.toUpperCase();

  if (joined.includes('TESTEM') || joined.includes('WITNESS')) return 'Testemunha';
  if (joined.includes('ACUS') || joined.includes('REU') || joined.includes('RÉU') || joined.includes('DEFEND') || joined.includes('PASSIVE') || joined.includes('CLAIMED') || joined.includes('REQUERIDO') || joined.includes('EXECUTADO')) {
    return 'Réu, acusado ou parte acionada';
  }
  if (joined.includes('VICTIM') || joined.includes('VITIMA') || joined.includes('VÍTIMA')) return 'Vítima';
  if (joined.includes('AUTHOR') || joined.includes('AUTOR') || joined.includes('ACTIVE') || joined.includes('CLAIMANT') || joined.includes('REQUERENTE') || joined.includes('EXEQUENTE')) {
    return 'Autor, requerente ou parte que entrou com a ação';
  }
  if (joined.includes('ADVOG')) return 'Advogado vinculado ao processo';
  if (joined.includes('TERCEIRO') || joined.includes('INTERESS')) return 'Terceiro ou interessado';
  if (partyType || polarity) return `Parte relacionada: ${partyType || polarity}`;
  return 'Envolvimento não especificado pela fonte';
}

function collectContacts(firstResult) {
  const phoneNodes = findAllDeep(firstResult, ['Phones', 'PhoneNumbers', 'Telefones', 'PhoneData', 'MobilePhones', 'PhonesExtended', 'ExtendedPhones', 'PhonesData']);
  const emailNodes = findAllDeep(firstResult, ['Emails', 'EmailAddresses', 'E-mails', 'EmailData', 'EmailsExtended', 'ExtendedEmails', 'EmailsData']);
  const addressNodes = findAllDeep(firstResult, ['Addresses', 'Enderecos', 'Endereços', 'AddressData', 'AddressesExtended', 'ExtendedAddresses', 'AddressesData']);

  const phones = uniqueByText(phoneNodes.flatMap(asArray).map(normalizePhone).filter(Boolean), 50);
  const emails = uniqueByText(emailNodes.flatMap(asArray).map(normalizeEmail).filter(Boolean), 50);
  const addresses = uniqueByText(addressNodes.flatMap(asArray).map(normalizeAddress).filter(Boolean), 50);

  return { phones, emails, addresses };
}

function normalizeRelatedPerson(item) {
  if (!item || typeof item !== 'object') return null;
  const technicalType = String(item.Type || item.type || '');
  const technicalTypeParts = technicalType.split('-').map((part) => part.trim());
  const relatedCpfFromType = technicalTypeParts.find((part) => onlyDigits(part).length === 11);
  const relationshipFromType = technicalTypeParts.find((part) => [
    'COWORKER', 'NEIGHBOR', 'BROTHER', 'NEPHEW', 'MOTHER', 'SON', 'HOUSEHOLD',
    'GRANDSON', 'SPOUSE', 'RELATIVE', 'GRANDPARENT', 'UNCLE', 'COUSIN',
    'FATHER', 'PARTNER', 'RELATED',
  ].includes(String(part).toUpperCase()));
  const name = findDeep(item, [
    'Name', 'FullName', 'Nome', 'PersonName', 'RelatedName', 'RelatedPersonName',
    'RelatedEntityName', 'RelativeName', 'NomeRelacionado', 'NomePessoaRelacionada',
  ]);
  const taxId = findDeep(item, [
    'TaxIdNumber', 'TaxId', 'CPF', 'CNPJ', 'Document', 'DocumentNumber', 'FiscalNumber',
    'NumeroIdentificacaoFiscal', 'RelatedTaxIdNumber', 'RelatedPersonTaxIdNumber',
    'RelatedEntityTaxIdNumber', 'RelatedDocument', 'RelativeTaxIdNumber',
  ]) || relatedCpfFromType;
  const relationship = findDeep(item, ['Kinship', 'KinshipDegree', 'Degree', 'RelationDegree', 'GrauParentesco', 'Relationship', 'RelationshipType', 'TipoRelacionamento', 'EconomicRelationship', 'EconomicRelationshipType', 'SpecificType'])
    || relationshipFromType;
  const phonesRaw = findAllDeep(item, ['Phones', 'PhoneNumbers', 'Telefones', 'PhoneData', 'MobilePhones', 'Phone']);
  const phones = uniqueByText(phonesRaw.flatMap(asArray).map(normalizePhone).filter(Boolean), 10);
  if (!name && !taxId && !relationship && phones.length === 0) return null;
  return {
    name: name ? String(name) : null,
    full_name: name ? String(name) : null,
    tax_id: taxId ? String(taxId) : null,
    relationship: relationship ? normalizeRoleText(relationship) : null,
    phones,
    email: findDeep(item, ['Email', 'EmailAddress', 'E-mail']) || null,
  };
}

function mergeRelatedPeople(items) {
  const merged = new Map();
  const peopleWithCpf = items.filter((person) => onlyDigits(person?.tax_id || '').length === 11);
  const cpfKeysByRelationship = new Map();

  for (const person of peopleWithCpf) {
    const relationshipKey = String(person?.relationship || '').trim().toUpperCase();
    if (!relationshipKey) continue;
    const keys = cpfKeysByRelationship.get(relationshipKey) || new Set();
    keys.add(`cpf:${onlyDigits(person.tax_id)}`);
    cpfKeysByRelationship.set(relationshipKey, keys);
  }

  const orderedItems = [
    ...peopleWithCpf,
    ...items.filter((person) => onlyDigits(person?.tax_id || '').length !== 11),
  ];

  for (const person of orderedItems) {
    const cpf = onlyDigits(person?.tax_id || '');
    const relationshipKey = String(person?.relationship || '').trim().toUpperCase();
    const compatibleCpfKeys = cpfKeysByRelationship.get(relationshipKey);
    const safeRelatedCpfKey = cpf.length !== 11 && compatibleCpfKeys?.size === 1
      ? Array.from(compatibleCpfKeys)[0]
      : null;
    const key = cpf.length === 11
      ? `cpf:${cpf}`
      : safeRelatedCpfKey
        || `relation:${relationshipKey}:${String(person?.email || '')}`;
    const current = merged.get(key);
    if (!current) {
      merged.set(key, person);
      continue;
    }
    merged.set(key, {
      ...current,
      ...person,
      name: current.name || person.name || null,
      full_name: current.full_name || person.full_name || null,
      tax_id: current.tax_id || person.tax_id || null,
      relationship: current.relationship || person.relationship || null,
      email: current.email || person.email || null,
      phones: uniqueByText([...(current.phones || []), ...(person.phones || [])], 10),
    });
  }
  return Array.from(merged.values()).slice(0, 50);
}

function collectRelatedPeople(firstResult) {
  const relationNodes = findAllDeep(firstResult, [
    'RelatedPeople',
    'RelatedPersons',
    'RelatedEntities',
    'Relationships',
    'EconomicRelationships',
    'EconomicRelationshipData',
    'BusinessRelationships',
    'PersonalRelationships',
    'PeopleRelationships',
    'KycRelationships',
    'RelatedPeoplePhones',
    'RelatedPeopleEmails',
    'RelatedPeopleData',
    'Relacionamentos',
    'PessoasRelacionadas',
  ]);

  const flattened = [];
  for (const node of relationNodes) {
    if (Array.isArray(node)) flattened.push(...node);
    else if (node && typeof node === 'object') {
      const nested = findDeep(node, ['Items', 'Results', 'People', 'Persons', 'Relationships', 'RelatedPeople', 'RelatedPersons']);
      if (Array.isArray(nested)) flattened.push(...nested);
      else flattened.push(node);
    }
  }

  return mergeRelatedPeople(flattened.map(normalizeRelatedPerson).filter(Boolean));
}

function collectProcesses(firstResult, cpf = '') {
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
  return uniqueByText(flattened.map((item, index) => normalizeProcess(item, index, cpf)).filter(Boolean), 20);
}

function prettifyKey(key) {
  return translateExtraLabel(key);
}

function collectExtraFields(obj, limit = 120) {
  const ignored = new Set(['result', 'results', 'queryid', 'queryid', 'raw_response', 'processes', 'lawsuits', 'parties', 'addresses', 'phones', 'emails']);
  const fields = [];
  const seen = new Set();

  function walk(value, path = []) {
    if (fields.length >= limit) return;
    if (value === null || value === undefined || value === '') return;

    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      const key = path[path.length - 1] || 'Informação';
      const lower = String(key).toLowerCase();
      if (ignored.has(lower)) return;
      const label = path.slice(-2).map(prettifyKey).join(' - ');
      const text = String(value);
      const signature = `${label}:${text}`.toLowerCase();
      if (!seen.has(signature) && text.length <= 240) {
        seen.add(signature);
        fields.push({ label: label || 'Informação', value: text });
      }
      return;
    }

    if (Array.isArray(value)) {
      value.slice(0, 12).forEach((item, index) => walk(item, [...path, `${path[path.length - 1] || 'Item'} ${index + 1}`]));
      return;
    }

    if (typeof value === 'object') {
      Object.entries(value).forEach(([key, val]) => {
        if (!ignored.has(String(key).toLowerCase())) walk(val, [...path, key]);
      });
    }
  }

  walk(obj, []);
  return fields;
}

function buildSummary(rawResponse, consultationType, cached = false, cpf = '', search = null) {
  const firstResult = Array.isArray(rawResponse?.Result) ? rawResponse.Result[0] : rawResponse?.Result || rawResponse || {};

  const name = findDeep(firstResult, ['Name', 'FullName', 'Nome', 'nome']);
  const foundCpf = onlyDigits(findDeep(firstResult, ['TaxIdNumber', 'TaxId', 'CPF', 'Cpf', 'Document', 'DocumentNumber']) || cpf);
  const documentStatus = findDeep(firstResult, ['TaxIdStatus', 'CPFStatus', 'Status', 'StatusCPF', 'RegistrationStatus']);
  const birthDate = findDeep(firstResult, ['BirthDate', 'Nascimento', 'DateOfBirth']);
  const motherName = findDeep(firstResult, ['MotherName', 'NomeMae', 'MothersName', 'Mother']);
  const fatherName = findDeep(firstResult, ['FatherName', 'NomePai', 'FathersName', 'Father']);
  const socialNumber = findDeep(firstResult, ['SocialNumber', 'NIS', 'PIS', 'PASEP', 'NisPisPasep', 'SocialSecurityNumber']);
  const zodiacSign = normalizeRoleText(findDeep(firstResult, ['ZodiacSign', 'Zodiac Sign', 'Signo']));
  const lawsuitsNode = findDeep(firstResult, ['Processes', 'Lawsuits', 'LawsuitsDistributionData', 'LawsuitsDistribution']);
  const lawsuitsTotal = countFromAny(lawsuitsNode || firstResult);
  const queryId = rawResponse?.QueryId || rawResponse?.QueryID || findDeep(rawResponse, ['QueryId', 'QueryID']);
  const contacts = consultationType === 'external_advanced' || consultationType === 'external_complete' ? collectContacts(firstResult) : { phones: [], emails: [], addresses: [] };
  const processes = consultationType === 'external_advanced' ? collectProcesses(firstResult, foundCpf) : [];
  const related_people = consultationType === 'external_advanced' || consultationType === 'external_complete' ? collectRelatedPeople(firstResult) : [];

  return {
    source: 'BigDataCorp',
    cached,
    consultation_type: consultationType,
    name: name || null,
    cpf: foundCpf || null,
    cpf_masked: foundCpf || null,
    searched_type: search?.type || 'cpf',
    searched_value: search?.display || cpf || null,
    document_status: documentStatus || null,
    birth_date: birthDate || null,
    mother_name: motherName || null,
    father_name: fatherName || null,
    social_number: socialNumber || null,
    zodiac_sign: zodiacSign || null,
    mother_name_available: Boolean(motherName),
    lawsuits_total: lawsuitsTotal || processes.length || 0,
    has_lawsuit_indicators: Boolean(lawsuitsTotal > 0 || lawsuitsNode || processes.length),
    phones: contacts.phones,
    emails: contacts.emails,
    addresses: contacts.addresses,
    related_people,
    processes: processes,
    query_id: queryId || null,
    extra_fields: collectExtraFields(firstResult),
    message: 'Resultado externo tratado para apoio à análise. Use com responsabilidade e finalidade legítima.',
  };
}

function hasValidPersonResult(summary) {
  return Boolean(summary?.name || summary?.cpf || summary?.birth_date || summary?.phones?.length || summary?.emails?.length);
}

async function lookupRelatedIdentifier(type, value) {
  const identifierHash = hashIdentifier(type, value);
  const now = new Date().toISOString();
  const { data: cachedIdentity } = await supabaseAdmin
    .from('related_identity_cache')
    .select('result_summary')
    .eq('identifier_hash', identifierHash)
    .gt('expires_at', now)
    .maybeSingle();

  if (cachedIdentity?.result_summary) return cachedIdentity.result_summary;

  const response = await fetch(`${BIGDATA_BASE_URL.replace(/\/$/, '')}/pessoas`, {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      AccessToken: BIGDATA_ACCESS_TOKEN,
      TokenId: BIGDATA_TOKEN_ID,
    },
    body: JSON.stringify({
      q: `${type}{${value}}`,
      Datasets: 'basic_data',
      Limit: 1,
    }),
  });
  const raw = await response.json().catch(() => ({}));
  if (!response.ok) return null;

  const first = Array.isArray(raw?.Result) ? raw.Result[0] : raw?.Result;
  const name = findDeep(first, ['Name', 'FullName', 'Nome', 'PersonName']);
  const taxId = onlyDigits(findDeep(first, ['TaxIdNumber', 'TaxId', 'CPF', 'Document', 'DocumentNumber']) || '');
  if (!name && taxId.length !== 11) return null;

  const resultSummary = {
    name: name ? String(name) : null,
    full_name: name ? String(name) : null,
    tax_id: taxId.length === 11 ? taxId : null,
  };
  await supabaseAdmin.from('related_identity_cache').upsert({
    identifier_hash: identifierHash,
    identifier_type: type,
    result_summary: resultSummary,
    expires_at: new Date(Date.now() + CACHE_DAYS * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString(),
  }, { onConflict: 'identifier_hash' });
  return resultSummary;
}

async function resolveRelatedIdentity(person, subjectCpf = '') {
  if (person?.name && person?.tax_id) return person;

  const candidates = [
    ...(onlyDigits(person?.tax_id || '').length === 11
      ? [{ type: 'doc', value: onlyDigits(person.tax_id) }]
      : []),
    ...(person?.phones || []).map((phone) => ({ type: 'phone', value: onlyDigits(phone?.number || '') })),
    ...(person?.email ? [{ type: 'email', value: normalizeEmailValue(person.email) }] : []),
  ]
    .filter((item) => item.type === 'email' ? Boolean(item.value) : item.value.length >= 10)
    .slice(0, 4);

  try {
    for (const candidate of candidates) {
      const identity = await lookupRelatedIdentifier(candidate.type, candidate.value);
      const identityCpf = onlyDigits(identity?.tax_id || '');
      if (identity && identityCpf.length === 11 && identityCpf !== onlyDigits(subjectCpf)) {
        return { ...person, ...identity };
      }
    }
    return {
      ...person,
      name: null,
      full_name: null,
      tax_id: null,
      identity_unconfirmed: true,
    };
  } catch (error) {
    console.error('Erro ao identificar pessoa relacionada:', error);
    return person;
  }
}

async function enrichRelatedPeople(people, subjectCpf = '') {
  if (!Array.isArray(people) || people.length === 0) return [];
  const limited = people.slice(0, 5);
  const resolved = await Promise.all(limited.map((person) => resolveRelatedIdentity(person, subjectCpf)));
  return [...resolved, ...people.slice(5)];
}

async function insertSafe(table, payload) {
  const { error } = await supabaseAdmin.from(table).insert(payload);
  if (error) console.error(`Erro ao inserir em ${table}:`, error);
}

async function insertExternalConsultationLog(payload) {
  const {
    cpf_full: _cpfFull,
    credits_balance_after: _creditsBalanceAfter,
    ...legacyPayload
  } = payload;

  const compatibilityPayload = {
    ...legacyPayload,
    consultation_type:
      legacyPayload.consultation_type === 'external_advanced'
        ? 'external_complete'
        : legacyPayload.consultation_type,
    raw_response: legacyPayload.raw_response || {},
  };

  // Último fallback: registra somente os dados essenciais de auditoria.
  // Isso evita perder o histórico caso um retorno bruto muito grande ou um
  // campo antigo do banco impeça a gravação completa.
  const minimalCompatibilityPayload = {
    user_id: compatibilityPayload.user_id,
    cpf_hash: compatibilityPayload.cpf_hash,
    cpf4: compatibilityPayload.cpf4,
    provider: compatibilityPayload.provider || 'BigDataCorp',
    consultation_type: compatibilityPayload.consultation_type,
    datasets: compatibilityPayload.datasets || [],
    credits_charged: compatibilityPayload.credits_charged || 0,
    cache_hit: Boolean(compatibilityPayload.cache_hit),
    status: compatibilityPayload.status || 'success',
    result_summary: compatibilityPayload.result_summary || {},
    raw_response: {},
    error_message: compatibilityPayload.error_message || null,
    created_at: compatibilityPayload.created_at,
  };

  const attempts = [
    payload,
    legacyPayload,
    compatibilityPayload,
    minimalCompatibilityPayload,
  ];
  let lastError = null;

  for (const candidate of attempts) {
    const { data, error } = await supabaseAdmin
      .from('external_consultation_logs')
      .insert(candidate)
      .select('id')
      .maybeSingle();

    if (!error) return { data, error: null };

    lastError = error;
    console.error('Tentativa de registrar consulta externa falhou:', error);
  }

  return { data: null, error: lastError };
}

async function loadInternalResultsForCpf(cpf, userId, externalLogId = null) {
  const cpf4 = onlyDigits(cpf).slice(-4);
  const selectFields = 'id,nome,cpf_full,cpf4,cidade,tipos,descricao,imagem_url,created_at,approved_at';

  const [exactResponse, legacyResponse] = await Promise.all([
    supabaseAdmin
      .from('records')
      .select(selectFields)
      .ilike('status', 'aprovado')
      .eq('cpf_full', cpf)
      .order('approved_at', { ascending: false, nullsFirst: false })
      .limit(20),
    supabaseAdmin
      .from('records')
      .select(selectFields)
      .ilike('status', 'aprovado')
      .eq('cpf4', cpf4)
      .order('approved_at', { ascending: false, nullsFirst: false })
      .limit(20),
  ]);

  if (exactResponse.error) console.error('Erro ao buscar CPF exato na base interna:', exactResponse.error);
  if (legacyResponse.error) console.error('Erro ao buscar CPF final na base interna:', legacyResponse.error);

  if (exactResponse.error && legacyResponse.error) {
    throw new Error('A base interna não respondeu à consulta combinada.');
  }

  const safeLegacyResults = (legacyResponse.data || []).filter((item) => {
    const storedCpf = onlyDigits(item?.cpf_full || '');
    return !storedCpf || storedCpf === cpf;
  });

  const merged = [...(exactResponse.data || []), ...safeLegacyResults];
  const seen = new Set();
  const results = merged
    .filter((item) => {
      if (!item?.id || seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    })
    .slice(0, 20)
    .map((item) => {
      const { cpf_full: _privateCpf, ...safeItem } = item;
      return {
        ...safeItem,
        cpf_masked: cpf4 ? `***.***.***-${cpf4}` : 'CPF não informado',
        documento_url: item.imagem_url || null,
        result_origin: 'internal',
        included_with_external: true,
      };
    });

  const extendedLog = {
    user_id: userId,
    searched_text: `CPF final ${cpf4}`,
    searched_cpf: cpf4,
    results_count: results.length,
    credit_charged: false,
    used_unlimited: false,
    consultation_type: 'internal_included',
    included_with_external: true,
    external_log_id: externalLogId,
    created_at: new Date().toISOString(),
  };

  const { error: extendedLogError } = await supabaseAdmin
    .from('consultation_logs')
    .insert(extendedLog);

  if (extendedLogError) {
    console.error('Erro ao registrar consulta interna incluída:', extendedLogError);
    const { error: fallbackLogError } = await supabaseAdmin
      .from('consultation_logs')
      .insert({
        user_id: userId,
        searched_text: `CPF final ${cpf4}`,
        searched_cpf: cpf4,
        results_count: results.length,
        credit_charged: false,
        used_unlimited: false,
        created_at: new Date().toISOString(),
      });

    if (fallbackLogError) console.error('Erro no fallback do log interno:', fallbackLogError);
  }

  return results;
}


function getServerAccountStatus(profile) {
  const rawStatus = String(
    profile?.account_status || profile?.status_conta || profile?.user_status || profile?.status || 'ativo'
  ).toLowerCase();

  if (profile?.is_blocked === true || profile?.blocked === true || rawStatus === 'bloqueado' || rawStatus === 'blocked') {
    return 'bloqueado';
  }

  if (rawStatus === 'pendente' || rawStatus === 'pending' || rawStatus === 'aguardando') {
    return 'pendente';
  }

  return 'ativo';
}

function isAuthEmailConfirmed(user) {
  const provider = String(user?.app_metadata?.provider || 'email').toLowerCase();
  if (provider === 'google') return true;
  return Boolean(user?.email_confirmed_at || user?.confirmed_at || user?.user_metadata?.email_verified);
}

function getServerSecurityBlock(user, profile) {
  if (String(profile?.role || 'user').toLowerCase() === 'admin') return '';

  const status = getServerAccountStatus(profile);
  if (status === 'bloqueado') {
    return profile?.blocked_reason || 'Conta bloqueada. Entre em contato com o suporte.';
  }

  if (status === 'pendente') {
    return 'Conta em análise. Aguarde a liberação do administrador.';
  }

  if (!isAuthEmailConfirmed(user)) {
    return 'Confirme seu e-mail antes de realizar consultas.';
  }

  if (onlyDigits(profile?.whatsapp || '').length < 10) {
    return 'Complete seu perfil com um WhatsApp válido antes de realizar consultas.';
  }

  return '';
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

    const search = resolveSearchInput(req.body || {});
    const requestedType = String(req.body?.consultationType || req.body?.consultation_type || 'external_complete');
    const config = getConsultConfig(requestedType);

    if (search.error) {
      return res.status(400).json({ success: false, message: search.error });
    }

    const cpf = search.type === 'cpf' ? search.value : '';
    const cpf4 = cpf ? cpf.slice(-4) : null;
    const cpfHash = search.hash;

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id, nome, email, whatsapp, role, credits, consultas, account_status, is_blocked, blocked_reason')
      .eq('id', user.id)
      .maybeSingle();

    if (profileError || !profile) {
      return res.status(400).json({ success: false, message: 'Perfil do usuário não encontrado.' });
    }

    const securityBlockMessage = getServerSecurityBlock(user, profile);
    if (securityBlockMessage) {
      await insertSafe('activity_logs', {
        user_id: user.id,
        action: 'external_consultation_blocked_security',
        details: { reason: securityBlockMessage, consultation_type: config.type, search_type: search.type },
      });

      return res.status(403).json({ success: false, message: securityBlockMessage });
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
          q: search.query,
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
        await insertExternalConsultationLog({
          user_id: user.id,
          cpf_hash: cpfHash,
          cpf4,
          cpf_full: cpf,
          search_type: search.type,
          search_value: search.display,
          search_hash: search.hash,
          provider: 'BigDataCorp',
          consultation_type: config.type,
          datasets: config.datasets,
          credits_charged: 0,
          credits_balance_after: Number(profile.credits || 0),
          cache_hit: false,
          status: 'error',
          result_summary: {},
          raw_response: rawResponse,
          error_message: bigDataError,
        });
        return res.status(502).json({ success: false, message: 'A consulta externa falhou. Nenhum crédito foi descontado.' });
      }

      resultSummary = buildSummary(rawResponse, config.type, false, cpf, search);
      resultSummary.related_people = await enrichRelatedPeople(resultSummary.related_people, resultSummary.cpf || cpf);

      if (!hasValidPersonResult(resultSummary)) {
        await insertExternalConsultationLog({
          user_id: user.id,
          cpf_hash: cpfHash,
          cpf4,
          cpf_full: cpf || null,
          search_type: search.type,
          search_value: search.display,
          search_hash: search.hash,
          provider: 'BigDataCorp',
          consultation_type: config.type,
          datasets: config.datasets,
          credits_charged: 0,
          credits_balance_after: Number(profile.credits || 0),
          cache_hit: false,
          status: 'not_found',
          result_summary: resultSummary,
          raw_response: rawResponse,
          error_message: 'Nenhum resultado válido encontrado.',
        });
        return res.status(404).json({ success: false, message: 'Nenhum resultado válido foi encontrado. Nenhum crédito foi descontado.' });
      }

      const expiresAt = new Date(Date.now() + CACHE_DAYS * 24 * 60 * 60 * 1000).toISOString();
      const { error: cacheError } = await supabaseAdmin
        .from('external_consultation_cache')
        .upsert({
          cpf_hash: cpfHash,
          cpf4,
          search_type: search.type,
          search_value: search.display,
          search_hash: search.hash,
          consultation_type: config.type,
          datasets: config.datasets,
          result_summary: resultSummary,
          raw_response: rawResponse,
          expires_at: expiresAt,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'cpf_hash,consultation_type' });

      if (cacheError) console.error('Erro ao salvar cache externo:', cacheError);
    } else {
      // Reprocessa a resposta original com o normalizador atual. Isso evita que
      // um resumo antigo do cache continue escondendo o CPF técnico relacionado.
      resultSummary = buildSummary(rawResponse, config.type, true, cpf, search);
      resultSummary = { ...resultSummary, cached: true, searched_type: search.type, searched_value: search.display };
      resultSummary.related_people = await enrichRelatedPeople(resultSummary.related_people, resultSummary.cpf || cpf);
    }

    const { data: debit, error: updateError } = await supabaseAdmin.rpc('consume_user_credits_v46', {
      p_user_id: user.id,
      p_amount: config.credits,
    });

    if (updateError || !debit?.success) {
      console.error('Erro ao descontar créditos:', updateError);
      return res.status(402).json({ success: false, message: debit?.message || 'Não foi possível descontar os créditos da consulta externa.' });
    }
    const newCredits = Number(debit.balance_after);

    await insertSafe('credit_movements', {
      user_id: user.id,
      amount: -config.credits,
      movement_type: 'external_consult',
      description: `${config.label} - ${search.type.toUpperCase()} ${search.display}`,
    });

    const { data: logData, error: logError } = await insertExternalConsultationLog({
      user_id: user.id,
      cpf_hash: cpfHash,
      cpf4,
      cpf_full: cpf,
      search_type: search.type,
      search_value: search.display,
      search_hash: search.hash,
      provider: 'BigDataCorp',
      consultation_type: config.type,
      datasets: config.datasets,
      credits_charged: config.credits,
      credits_balance_after: newCredits,
      cache_hit: cacheHit,
      status: 'success',
      result_summary: resultSummary,
      raw_response: rawResponse,
      error_message: bigDataError || null,
    });

    if (logError) console.error('Erro definitivo ao salvar log externo:', logError);

    await insertSafe('activity_logs', {
      user_id: user.id,
      action: 'external_consultation_completed',
      details: {
        consultation_type: config.type,
        credits_charged: config.credits,
        credits_balance_after: newCredits,
        cpf4,
        search_type: search.type,
        search_value: search.display,
        cache_hit: cacheHit,
        datasets: config.datasets,
        log_id: logData?.id || null,
      },
    });

    let internalResults = [];
    let internalCheckSuccess = true;
    try {
      const resultCpf = onlyDigits(resultSummary?.cpf || '');
      if (isValidCpf(resultCpf)) {
        internalResults = await loadInternalResultsForCpf(resultCpf, user.id, logData?.id || null);
      }
    } catch (internalError) {
      internalCheckSuccess = false;
      console.error('Erro ao incluir verificação da base interna:', internalError);
    }

    return res.status(200).json({
      success: true,
      message: 'Consulta externa e verificação interna realizadas com sucesso.',
      consultationType: config.type,
      consultationLabel: config.label,
      creditsCharged: config.credits,
      creditsBalanceAfter: newCredits,
      cacheHit,
      results: [resultSummary],
      internalResults,
      internalResultsCount: internalResults.length,
      internalIncluded: true,
      internalCheckSuccess,
    });
  } catch (error) {
    console.error('Erro inesperado na consulta externa:', error);
    return res.status(500).json({ success: false, message: 'Erro inesperado na consulta externa.' });
  }
}
