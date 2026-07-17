import { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";
import BuyCreditsModal from "./BuyCreditsModal";
import SupportModal from "./SupportModal";
import "./App.css";

const TIPOS_OCORRENCIA = [
  "Inadimplência",
  "Multas não pagas",
  "Avarias no veículo",
  "Não devolução do veículo",
  "Uso indevido",
  "Fraude documental",
  "Quebra de contrato",
  "Apropriação indevida",
  "Sinistro não informado",
  "Outros",
];

function formatMoneyFromPayment(payment) {
  const cents = payment?.amount_cents;

  if (typeof cents === "number" && cents > 0) {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(cents / 100);
  }

  const amount = Number(payment?.amount || 0);

  if (amount > 0) {
    if (amount >= 100) {
      return new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
      }).format(amount / 100);
    }

    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(amount);
  }

  return "Não informado";
}

function formatMoneyCents(cents) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(cents || 0) / 100);
}


function normalizePlanRow(plan) {
  const priceFromCents = Number(plan?.price_cents || 0);
  const priceFromReais =
    plan?.price !== null && plan?.price !== undefined
      ? Math.round(Number(plan.price || 0) * 100)
      : 0;
  const planType = String(plan?.plan_type || "").toLowerCase();
  const isUnlimited =
    Boolean(plan?.is_unlimited) ||
    planType === "unlimited" ||
    String(plan?.name || "").toLowerCase().includes("ilimit");

  return {
    ...plan,
    credits: Number(plan?.credits || 0),
    price_cents: priceFromCents > 0 ? priceFromCents : priceFromReais,
    price: plan?.price !== undefined ? plan.price : (priceFromCents > 0 ? priceFromCents / 100 : null),
    plan_type: plan?.plan_type || (isUnlimited ? "unlimited" : "credits"),
    is_unlimited: isUnlimited,
    duration_days: Number(plan?.duration_days || (isUnlimited ? 30 : 0)),
    active: plan?.active !== false,
  };
}

function sortPlansByPrice(a, b) {
  const priceA = Number(a?.price_cents || 0);
  const priceB = Number(b?.price_cents || 0);

  if (priceA !== priceB) return priceA - priceB;

  const creditsA = Number(a?.credits || 0);
  const creditsB = Number(b?.credits || 0);

  if (creditsA !== creditsB) return creditsA - creditsB;

  return String(a?.name || "").localeCompare(String(b?.name || ""), "pt-BR");
}

const INTERNAL_NO_RECORDS_MESSAGE =
  "A pessoa consultada não possui ocorrência registrada por outras locadoras em nosso banco de dados.";


function getUserAccountStatus(profile) {
  const rawStatus = String(
    profile?.account_status ||
      profile?.status_conta ||
      profile?.user_status ||
      profile?.status ||
      "ativo"
  ).toLowerCase();

  if (profile?.is_blocked === true || profile?.blocked === true || rawStatus === "bloqueado" || rawStatus === "blocked") {
    return "bloqueado";
  }

  if (rawStatus === "pendente" || rawStatus === "pending" || rawStatus === "aguardando") {
    return "pendente";
  }

  return "ativo";
}

function isSessionEmailConfirmed(session) {
  const user = session?.user;
  if (!user) return false;

  const provider = String(user?.app_metadata?.provider || "email").toLowerCase();
  if (provider === "google") return true;

  return Boolean(user.email_confirmed_at || user.confirmed_at || user.user_metadata?.email_verified);
}

function getUserSecurityBlock(session, profile) {
  if (!session?.user || !profile) {
    return "Faça login novamente para continuar.";
  }

  if (String(profile?.role || "user").toLowerCase() === "admin") {
    return "";
  }

  const status = getUserAccountStatus(profile);
  if (status === "bloqueado") {
    return profile?.blocked_reason || "Sua conta está bloqueada. Entre em contato com o suporte.";
  }

  if (status === "pendente") {
    return "Sua conta ainda está em análise. Aguarde a liberação do administrador.";
  }

  if (!isSessionEmailConfirmed(session)) {
    return "Confirme seu e-mail antes de realizar consultas. Verifique sua caixa de entrada ou spam.";
  }

  const whatsappDigits = onlyDigits(profile?.whatsapp || "");
  if (whatsappDigits.length < 10) {
    return "Complete seu perfil com um WhatsApp válido antes de realizar consultas.";
  }

  return "";
}


function onlyDigits(value) {
  return String(value || "").replace(/\D/g, "");
}

function isValidCpf(value) {
  const cpf = onlyDigits(value);

  if (cpf.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cpf)) return false;

  let sum = 0;
  for (let i = 0; i < 9; i += 1) {
    sum += Number(cpf[i]) * (10 - i);
  }
  let firstDigit = (sum * 10) % 11;
  if (firstDigit === 10) firstDigit = 0;
  if (firstDigit !== Number(cpf[9])) return false;

  sum = 0;
  for (let i = 0; i < 10; i += 1) {
    sum += Number(cpf[i]) * (11 - i);
  }
  let secondDigit = (sum * 10) % 11;
  if (secondDigit === 10) secondDigit = 0;

  return secondDigit === Number(cpf[10]);
}

function formatCpfInput(value) {
  const digits = onlyDigits(value).slice(0, 11);
  return digits
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}

function formatWhatsappInput(value) {
  const digits = onlyDigits(value).slice(0, 11);

  if (digits.length <= 10) {
    return digits
      .replace(/(\d{2})(\d)/, "($1) $2")
      .replace(/(\d{4})(\d)/, "$1-$2");
  }

  return digits
    .replace(/(\d{2})(\d)/, "($1) $2")
    .replace(/(\d{5})(\d)/, "$1-$2");
}

function isValidWhatsapp(value) {
  const digits = onlyDigits(value);

  if (digits.length !== 10 && digits.length !== 11) return false;
  if (digits.length === 11 && digits[2] !== "9") return false;
  if (/^(\d)\1+$/.test(digits)) return false;

  return true;
}

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function isValidEmail(value) {
  const emailText = normalizeEmail(value);

  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(emailText);
}

function looksLikeCpfSearch(value) {
  const text = String(value || "").trim();
  const digits = onlyDigits(text);

  if (digits.length === 0) return false;
  if (/^\d+$/.test(text)) return true;
  return digits.length !== text.length || digits.length >= 8;
}

function getPaymentCredits(payment) {
  return Number(payment?.credits || payment?.plan_credits || payment?.plan?.credits || 0);
}

function getPaymentPlanName(payment) {
  return payment?.plan_name || payment?.plan?.name || payment?.plan_type || "Pagamento";
}

function getPaymentUserName(payment) {
  return (
    payment?.user_name ||
    payment?.profile_nome ||
    payment?.profiles?.nome ||
    payment?.nome ||
    payment?.user_id ||
    "Usuário não identificado"
  );
}

function traduzirStatusPagamento(status) {
  const normalized = String(status || "").toLowerCase();

  const labels = {
    pending: "Pendente",
    paid: "Pago",
    failed: "Falhou",
    canceled: "Cancelado",
    cancelled: "Cancelado",
    expired: "Expirado",
  };

  return labels[normalized] || status || "Não informado";
}

function getStatusOcorrenciaInfo(status) {
  const normalized = String(status || "pendente").toLowerCase();

  if (normalized === "aprovado") {
    return {
      label: "Aprovado",
      message: "Já disponível para consulta na plataforma.",
    };
  }

  if (normalized === "reprovado") {
    return {
      label: "Reprovado",
      message: "Não aparece nas consultas. Verifique o motivo informado pelo administrador.",
    };
  }

  return {
    label: "Pendente",
    message: "Aguardando análise do administrador.",
  };
}

function csvSafe(value) {
  if (value === null || value === undefined) return "";

  if (Array.isArray(value)) {
    return value.join(", ");
  }

  const text = String(value).replace(/"/g, '""');

  if (text.includes(",") || text.includes("\n") || text.includes('"')) {
    return `"${text}"`;
  }

  return text;
}

function baixarCsv(nomeArquivo, linhas) {
  const csv = linhas.map((linha) => linha.map(csvSafe).join(",")).join("\n");
  const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = nomeArquivo;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function baixarTexto(nomeArquivo, texto) {
  const blob = new Blob(["\ufeff" + texto], { type: "text/plain;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = nomeArquivo;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}


function formatDate(value) {
  if (!value) return "Não informado";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Não informado";
  }

  return date.toLocaleString("pt-BR");
}


function externalConsultationLabel(type) {
  if (type === "external_advanced" || type === "external_complete") return "Consulta Externa Completa";
  return "Consulta Interna";
}

function externalConsultationCredits(type) {
  if (type === "external_advanced" || type === "external_complete") return 3;
  return 1;
}

function adminConsultationLabel(type, source) {
  if (type === "internal_included") return "Base interna incluída";
  if (source === "internal" || type === "internal") return "Consulta interna";
  return "Consulta Externa";
}

function getAnalyticsSessionKey() {
  const storageKey = "locacheck-analytics-session";
  const maxIdleMs = 30 * 60 * 1000;
  const now = Date.now();

  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) || "null");
    if (saved?.key && Number(saved?.lastSeen || 0) > now - maxIdleMs) {
      localStorage.setItem(storageKey, JSON.stringify({ key: saved.key, lastSeen: now }));
      return saved.key;
    }
  } catch {
    // Cria uma nova sessão quando o navegador bloqueia ou invalida o armazenamento.
  }

  const key = typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `visit_${now}_${Math.random().toString(36).slice(2, 18)}`;

  try {
    localStorage.setItem(storageKey, JSON.stringify({ key, lastSeen: now }));
  } catch {
    // A visita continua funcionando mesmo sem localStorage.
  }

  return key;
}

function externalDatasetLabel(dataset) {
  const clean = String(dataset || "").replace(/\.limit\(.*?\)/g, "");
  const map = {
    basic_data: "Dados cadastrais",
    registration_data: "Endereços, telefones e e-mails",
    lawsuits_distribution_data: "Resumo de processos",
    processes: "Processos detalhados",
  };
  return map[clean] || dataset;
}

function externalDatasetsText(datasets) {
  if (Array.isArray(datasets)) {
    return datasets.map(externalDatasetLabel).join(", ") || "Não informado";
  }
  if (typeof datasets === "string" && datasets.trim()) return externalDatasetLabel(datasets.trim());
  return "Não informado";
}

function formatSimpleDate(value) {
  if (!value) return "Não informado";
  const text = String(value);
  const date = new Date(text);
  if (Number.isNaN(date.getTime())) return text;
  return date.toLocaleDateString("pt-BR");
}


function displayExternalValue(value) {
  if (value === null || value === undefined || value === "") return "Não informado";
  const text = String(value);
  if (text.toUpperCase() === "LEAO") return "Leão";
  return text;
}

function relatedPersonLabel(person, index) {
  return person?.name || person?.tax_id || `Pessoa relacionada ${index + 1}`;
}

function shouldShowTopNotifications(notificationItems, notificationReadIds) {
  return (notificationItems || []).some((item) => !(notificationReadIds || []).includes(item.id));
}

function buildExternalSummaryText(item) {
  const phones = Array.isArray(item.phones) ? item.phones : [];
  const emails = Array.isArray(item.emails) ? item.emails : [];
  const addresses = Array.isArray(item.addresses) ? item.addresses : [];
  const processes = Array.isArray(item.processes) ? item.processes : [];

  const linhas = [
    item.consultation_label || externalConsultationLabel(item.consultation_type),
    `CPF consultado: ${item.cpf || item.cpf_masked || (item.cpf4 ? `***.***.***-${item.cpf4}` : "Não informado")}`,
    `Nome encontrado: ${item.name || item.nome || "Não informado"}`,
    `Situação cadastral: ${item.document_status || "Não informado"}`,
    item.birth_date ? `Nascimento: ${formatSimpleDate(item.birth_date)}` : null,
    item.mother_name ? `Nome da mãe: ${item.mother_name}` : null,
    item.father_name ? `Nome do pai: ${item.father_name}` : null,
    item.social_number ? `Número social: ${item.social_number}` : null,
    item.zodiac_sign ? `Signo: ${displayExternalValue(item.zodiac_sign)}` : null,
    phones.length ? `Telefones: ${phones.map((phone) => [phone.number, phone.type].filter(Boolean).join(" - ")).filter(Boolean).join(" | ")}` : null,
    emails.length ? `E-mails: ${emails.map((email) => email.email).filter(Boolean).join(" | ")}` : null,
    addresses.length ? `Endereços: ${addresses.map((address) => address.full).filter(Boolean).join(" | ")}` : null,
    Array.isArray(item.related_people) && item.related_people.length ? `Pessoas relacionadas: ${item.related_people.map((person) => [person.name, person.tax_id, person.relationship, person.phones?.map((p) => p.number).join("/")].filter(Boolean).join(" - ")).join(" | ")}` : null,
    `Processos/indicadores encontrados: ${item.has_lawsuit_indicators ? "Sim" : "Não"}`,
    `Quantidade informada: ${item.lawsuits_total || processes.length || 0}`,
    ...processes.slice(0, 20).map((process, index) => `Processo ${index + 1}: ${[process.number, process.court, process.state, process.type, process.status, process.person_role || process.specific_type].filter(Boolean).join(" - ")}`),
    `Créditos descontados: ${item.credits_charged || 0}`,
    "Fonte: BigDataCorp",
    "Observação: resultado externo tratado para apoio à decisão do locador.",
  ];

  return linhas.filter(Boolean).join("\n");
}


function reportEscape(value) {
  if (value === null || value === undefined || value === "") return "Não informado";
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function reportValue(value) {
  return reportEscape(displayExternalValue(value));
}

function reportLine(label, value) {
  if (value === null || value === undefined || value === "") return "";
  return `<div class="row"><span>${reportEscape(label)}</span><strong>${reportValue(value)}</strong></div>`;
}

function reportSection(title, body, subtitle = "") {
  if (!body || !String(body).trim()) return "";
  return `<section class="card"><h2>${reportEscape(title)}</h2>${subtitle ? `<p class="muted">${reportEscape(subtitle)}</p>` : ""}<div class="content">${body}</div></section>`;
}

function processRoleText(process) {
  return process?.specific_type || process?.person_role || process?.role || process?.party_type || process?.type_in_process || "Não informado";
}

function buildExternalReportHtml(item) {
  const phones = Array.isArray(item.phones) ? item.phones : [];
  const emails = Array.isArray(item.emails) ? item.emails : [];
  const addresses = Array.isArray(item.addresses) ? item.addresses : [];
  const relatedPeople = Array.isArray(item.related_people) ? item.related_people : [];
  const processes = Array.isArray(item.processes) ? item.processes : [];
  const cpf = item.cpf || item.cpf_masked || (item.cpf4 ? `***.***.***-${item.cpf4}` : "Não informado");
  const title = item.consultation_label || externalConsultationLabel(item.consultation_type) || "Consulta Externa Completa";

  const personal = [
    reportLine("Nome encontrado", item.name || item.nome),
    reportLine("CPF consultado", cpf),
    reportLine("Situação cadastral", item.document_status),
    reportLine("Nascimento", item.birth_date ? formatSimpleDate(item.birth_date) : ""),
    reportLine("Nome da mãe", item.mother_name),
    reportLine("Nome do pai", item.father_name),
    reportLine("Número social", item.social_number),
    reportLine("Signo", item.zodiac_sign),
  ].join("");

  const contatos = [
    phones.map((phone, index) => `<div class="mini"><b>Telefone ${index + 1}</b><p>${reportValue([phone.number, phone.type, phone.status, phone.is_main === true ? "principal" : null, phone.is_recent === true ? "recente" : null].filter(Boolean).join(" • "))}</p></div>`).join(""),
    emails.map((email, index) => `<div class="mini"><b>E-mail ${index + 1}</b><p>${reportValue([email.email, email.type, email.status, email.is_main === true ? "principal" : null, email.is_recent === true ? "recente" : null].filter(Boolean).join(" • "))}</p></div>`).join(""),
  ].join("") || `<p class="empty">Nenhum contato retornado nesta consulta.</p>`;

  const enderecos = addresses.length
    ? addresses.map((address, index) => `<div class="mini"><b>Endereço ${index + 1}</b><p>${reportValue([address.full, address.type, address.city, address.state, address.zip_code, address.is_main === true ? "principal" : null, address.is_recent === true ? "recente" : null].filter(Boolean).join(" • "))}</p></div>`).join("")
    : `<p class="empty">Nenhum endereço retornado nesta consulta.</p>`;

  const pessoas = relatedPeople.length
    ? relatedPeople.map((person, index) => `<div class="mini"><b>${reportValue(person.full_name || person.name || `Pessoa relacionada ${index + 1}`)}</b>${reportLine("CPF/CNPJ", person.tax_id)}${reportLine("Grau de parentesco/relacionamento", person.relationship || person.relationship_type)}${reportLine("E-mail", person.email)}${Array.isArray(person.phones) && person.phones.length ? `<div class="row"><span>Telefones</span><strong>${reportValue(person.phones.map((phone) => [phone.number, phone.type].filter(Boolean).join(" • ")).filter(Boolean).join(" | "))}</strong></div>` : ""}</div>`).join("")
    : `<p class="empty">Nenhuma pessoa relacionada retornada nesta consulta.</p>`;

  const processosResumo = [
    reportLine("Informações encontradas", item.has_lawsuit_indicators ? "Sim" : "Não"),
    reportLine("Quantidade informada", item.lawsuits_total || processes.length || 0),
  ].join("");

  const processos = processes.length
    ? processes.slice(0, 30).map((process, index) => `<div class="process"><b>${reportValue(process.number || `Processo ${index + 1}`)}</b><p>${reportValue([process.court, process.state, process.type, process.status].filter(Boolean).join(" • ") || "Informações principais disponíveis.")}</p>${reportLine("Envolvimento da pessoa", processRoleText(process))}${reportLine("Data", process.distribution_date ? formatSimpleDate(process.distribution_date) : "")}${reportLine("Assunto", process.subject)}${reportLine("Valor informado", process.value)}</div>`).join("")
    : `<p class="empty">Não foram retornados detalhes de processos nesta consulta.</p>`;

  return buildReportShell({
    title: "Relatório de Consulta LocaCheck",
    subtitle: title,
    cpf,
    nome: item.name || item.nome || "Não informado",
    sections: [
      reportSection("Dados pessoais", personal),
      reportSection("Contatos encontrados", contatos, "Telefones e e-mails retornados pela fonte externa."),
      reportSection("Endereços encontrados", enderecos),
      reportSection("Pessoas relacionadas", pessoas),
      reportSection("Resumo de processos", processosResumo),
      reportSection("Processos judiciais resumidos", processos, "Resumo simplificado, sem linguagem técnica."),
    ].join(""),
  });
}

function buildInternalReportHtml(item) {
  const title = "Consulta Interna LocaCheck";
  const cpf = item.cpf_masked || item.cpf4 || "Não informado";
  const body = [
    reportLine("Nome", item.nome),
    reportLine("CPF", cpf),
    reportLine("Cidade/UF", item.cidade),
    reportLine("Ocorrências", Array.isArray(item.tipos) ? item.tipos.join(", ") : item.tipos),
    reportLine("Descrição", item.descricao),
    reportLine("Documento/comprovante", item.imagem_url ? "Disponível no sistema" : "Não informado"),
  ].join("");

  return buildReportShell({
    title: "Relatório de Consulta LocaCheck",
    subtitle: title,
    cpf,
    nome: item.nome || "Não informado",
    sections: reportSection("Registro encontrado em outras locadoras", body),
  });
}

function buildReportShell({ title, subtitle, cpf, nome, sections }) {
  const generatedAt = new Date().toLocaleString("pt-BR");
  return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${reportEscape(title)}</title>
  <style>
    *{box-sizing:border-box} body{font-family:Arial,Helvetica,sans-serif;background:#f4f7fb;color:#152033;margin:0;padding:28px} .page{max-width:920px;margin:0 auto;background:white;border:1px solid #dce5f2;border-radius:18px;overflow:hidden;box-shadow:0 18px 60px rgba(15,23,42,.12)} .header{background:linear-gradient(135deg,#0f2a5f,#2563eb);color:white;padding:30px} .brand{font-size:28px;font-weight:800;letter-spacing:-.5px} .subtitle{font-size:18px;margin-top:8px;opacity:.92}.meta{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;padding:18px 30px;background:#eef5ff;border-bottom:1px solid #dce5f2}.meta div{background:white;border:1px solid #dce5f2;border-radius:12px;padding:12px}.meta span{display:block;color:#64748b;font-size:12px;text-transform:uppercase;font-weight:700}.meta strong{display:block;margin-top:5px;font-size:15px}.contentWrap{padding:26px 30px}.card{border:1px solid #dce5f2;border-radius:16px;padding:20px;margin-bottom:18px;break-inside:avoid}.card h2{margin:0 0 8px;font-size:18px;color:#0f2a5f}.muted{margin:0 0 12px;color:#64748b}.row{display:flex;justify-content:space-between;gap:18px;border-top:1px solid #edf2f7;padding:10px 0}.row:first-child{border-top:0}.row span{color:#64748b}.row strong{text-align:right;color:#0f172a}.mini,.process{border:1px solid #edf2f7;border-radius:12px;padding:12px;margin:10px 0;background:#fbfdff}.mini b,.process b{color:#0f2a5f}.mini p,.process p{margin:6px 0;color:#334155}.empty{color:#64748b}.notice{margin-top:20px;padding:16px 20px;background:#fff7ed;border:1px solid #fed7aa;border-radius:14px;color:#7c2d12}.footer{padding:18px 30px;color:#64748b;font-size:12px;border-top:1px solid #dce5f2}.actions{display:flex;gap:10px;justify-content:flex-end;margin:18px auto 0;max-width:920px}.actions button{border:0;border-radius:12px;background:#2563eb;color:white;font-weight:700;padding:12px 18px;cursor:pointer}.actions button.secondary{background:#0f172a}@media print{body{background:white;padding:0}.page{box-shadow:none;border:0;border-radius:0}.actions{display:none}.card{break-inside:avoid}.header{-webkit-print-color-adjust:exact;print-color-adjust:exact}.meta{grid-template-columns:repeat(2,1fr);-webkit-print-color-adjust:exact;print-color-adjust:exact}}
  </style>
</head>
<body>
  <main class="page">
    <div class="header"><div class="brand">LocaCheck</div><div class="subtitle">${reportEscape(subtitle)}</div></div>
    <div class="meta"><div><span>Data da consulta</span><strong>${reportEscape(generatedAt)}</strong></div><div><span>CPF consultado</span><strong>${reportEscape(cpf)}</strong></div><div><span>Nome encontrado</span><strong>${reportEscape(nome)}</strong></div><div><span>Finalidade</span><strong>Apoio à decisão do locador</strong></div></div>
    <div class="contentWrap">${sections}<div class="notice"><strong>Responsabilidade:</strong> Este relatório é uma ferramenta de apoio à decisão do locador. As informações devem ser analisadas com responsabilidade, finalidade legítima e conferência própria.</div></div>
    <div class="footer">Relatório gerado pela LocaCheck. Documento destinado ao apoio da análise de locação de veículos.</div>
  </main>
  <div class="actions"><button class="secondary" onclick="window.close()">Fechar</button><button onclick="window.print()">Salvar/Imprimir PDF</button></div>
  <script>setTimeout(function(){ window.focus(); }, 300);</script>
</body>
</html>`;
}

function abrirRelatorioConsulta(html, fallbackName = "locacheck-relatorio.html") {
  const janela = window.open("", "_blank", "width=1000,height=800");
  if (!janela) {
    baixarTexto(fallbackName, html);
    return false;
  }
  janela.document.open();
  janela.document.write(html);
  janela.document.close();
  setTimeout(() => {
    try {
      janela.focus();
      janela.print();
    } catch {}
  }, 650);
  return true;
}

function diasAte(dataIso) {
  if (!dataIso) return null;
  const hoje = new Date();
  const alvo = new Date(dataIso);
  const diff = alvo.getTime() - hoje.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function isImageUrl(url) {
  const cleanUrl = String(url || "").split("?")[0].toLowerCase();
  return /\.(png|jpg|jpeg|gif|webp|bmp|svg|avif)$/.test(cleanUrl);
}

function getDocumentoLabel(url) {
  const cleanUrl = String(url || "").split("?")[0].toLowerCase();

  if (cleanUrl.endsWith(".pdf")) return "Abrir PDF";
  if (isImageUrl(cleanUrl)) return "Abrir imagem";

  return "Abrir documento";
}

function formatLandingNumber(value) {
  const number = Number(value || 0);

  if (number >= 1000000) {
    return `${(number / 1000000).toFixed(number >= 10000000 ? 0 : 1).replace(".", ",")} mi`;
  }

  if (number >= 1000) {
    return new Intl.NumberFormat("pt-BR").format(number);
  }

  return String(number);
}

function getPlanDescription(plan) {
  if (plan?.is_unlimited) {
    return `${plan.duration_days || 30} dias de consultas ilimitadas.`;
  }

  const credits = Number(plan?.credits || 0);
  return credits === 1 ? "1 consulta disponível." : `${credits} consultas disponíveis.`;
}


function LegalTermsContent() {
  return (
    <div className="resultsBox legalTermsBox">
      <div className="legalIntroCard">
        <strong>Versão vigente: 14/06/2026</strong>
        <p>
          Este resumo organiza os principais pontos de uso da LocaCheck. Ele não substitui orientação jurídica personalizada, mas deixa claro como a plataforma deve ser usada com responsabilidade, boa-fé e proteção de dados.
        </p>
      </div>

      <div className="resultCard">
        <h3>1. Finalidade da LocaCheck</h3>
        <p>
          A LocaCheck é uma ferramenta de apoio para locadoras, frotistas e empresas que trabalham com locação de veículos. A plataforma permite registrar, consultar e acompanhar ocorrências relacionadas a locações, como inadimplência, multas não pagas, avarias, não devolução do veículo, quebra de contrato, uso indevido e situações semelhantes.
        </p>
      </div>

      <div className="resultCard">
        <h3>2. Uso permitido</h3>
        <p>
          O usuário deve utilizar a plataforma apenas para finalidade legítima ligada à análise de risco, prevenção de prejuízos, segurança da frota, gestão contratual e registro de ocorrências reais. É proibido usar a LocaCheck para perseguição, exposição indevida, constrangimento, discriminação ou qualquer finalidade diferente da atividade de locação.
        </p>
      </div>

      <div className="resultCard">
        <h3>3. Responsabilidade de quem cadastra ocorrência</h3>
        <p>
          Quem registra uma ocorrência declara que as informações são verdadeiras, necessárias, proporcionais e relacionadas a uma locação real. O usuário é responsável pelos dados, documentos, imagens, descrições e comprovantes enviados. É proibido cadastrar informação falsa, ofensiva, sem prova, exagerada ou sem relação com contrato de locação.
        </p>
      </div>

      <div className="resultCard">
        <h3>4. Análise e aprovação pelo administrador</h3>
        <p>
          Ocorrências enviadas por usuários comuns entram para análise. O administrador pode aprovar, reprovar, editar ou remover registros quando identificar dados incompletos, indevidos, sem comprovação ou incompatíveis com a finalidade da plataforma. Somente ocorrências aprovadas aparecem nas consultas.
        </p>
      </div>

      <div className="resultCard">
        <h3>5. Consultas, créditos e histórico</h3>
        <p>
          As consultas podem consumir créditos, salvo nos casos de plano ilimitado ativo. O histórico de consultas pode ser registrado para auditoria, prevenção de uso indevido, segurança da plataforma e solução de contestação. O usuário entende que os resultados são apoio à decisão e não substituem análise contratual própria.
        </p>
      </div>

      <div className="resultCard">
        <h3>6. Dados pessoais e LGPD</h3>
        <p>
          A plataforma trata dados pessoais como nome, CPF, cidade, WhatsApp, histórico de consulta, informações de ocorrência e comprovantes enviados. O tratamento deve ocorrer com base em finalidade legítima, necessidade, segurança, prevenção a fraudes, proteção de crédito, exercício regular de direitos e apoio à atividade de locação, sempre respeitando a legislação aplicável.
        </p>
      </div>

      <div className="resultCard">
        <h3>7. CPF e dados sensíveis da ocorrência</h3>
        <p>
          O CPF completo pode ser usado internamente para cadastro, validação e busca, mas a exibição ao usuário comum deve ser limitada ou mascarada sempre que possível. O administrador pode ter acesso ampliado para análise, correção, auditoria e gestão da base.
        </p>
      </div>

      <div className="resultCard">
        <h3>8. Documentos e comprovantes públicos da consulta</h3>
        <p>
          Quando uma ocorrência aprovada possuir imagem, PDF ou comprovante vinculado, esse documento poderá ser exibido ao usuário autenticado que realizar a consulta. Como o bucket de documentos está configurado como público, qualquer pessoa que possua o link direto do arquivo poderá acessá-lo. Por isso, o usuário deve enviar apenas documentos necessários e relacionados à ocorrência.
        </p>
      </div>

      <div className="resultCard">
        <h3>9. Pagamentos e planos</h3>
        <p>
          Os pagamentos são processados por plataforma integrada de pagamento. A liberação de créditos ou plano ilimitado depende da confirmação do pagamento. A LocaCheck pode manter registros de pagamento, status, data, plano adquirido e logs de processamento para conferência financeira e auditoria.
        </p>
      </div>

      <div className="resultCard">
        <h3>10. Solicitação de correção, revisão ou remoção</h3>
        <p>
          Caso uma pessoa ou empresa identifique informação incorreta, desatualizada, indevida ou sem relação com locação, poderá solicitar análise pelo suporte. O administrador poderá revisar documentos, corrigir dados, reprovar ocorrência, remover informações ou solicitar comprovação adicional ao usuário responsável pelo cadastro.
        </p>
      </div>

      <div className="resultCard">
        <h3>11. Segurança da conta</h3>
        <p>
          Cada usuário é responsável por manter sigilo de seu acesso. É proibido compartilhar conta com terceiros, tentar acessar área administrativa, manipular créditos, alterar status de pagamentos, burlar consultas ou explorar falhas do sistema.
        </p>
      </div>

      <div className="resultCard">
        <h3>12. Aceite</h3>
        <p>
          Ao criar conta, registrar ocorrência, consultar locatário, comprar créditos ou usar qualquer recurso da LocaCheck, o usuário declara estar ciente e de acordo com estes Termos de Uso e Política de Privacidade.
        </p>
      </div>
    </div>
  );
}

function App() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [authMode, setAuthMode] = useState(null);

  const [showRecordForm, setShowRecordForm] = useState(false);
  const [showSearchForm, setShowSearchForm] = useState(false);
  const [showBuyCredits, setShowBuyCredits] = useState(false);
  const [showSupport, setShowSupport] = useState(false);
  const [showConsultationHistory, setShowConsultationHistory] = useState(false);
  const [showPaymentsHistory, setShowPaymentsHistory] = useState(false);
  const [showMyRecords, setShowMyRecords] = useState(false);
  const [showProfileData, setShowProfileData] = useState(false);
  const [showTermsPrivacy, setShowTermsPrivacy] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showSystemLogs, setShowSystemLogs] = useState(false);
  const [toast, setToast] = useState(null);
  const [notificationReadIds, setNotificationReadIds] = useState([]);
  const [showAllRecentPayments, setShowAllRecentPayments] = useState(false);
  const [adminActiveSection, setAdminActiveSection] = useState("resumo");
  const [adminPlans, setAdminPlans] = useState([]);
  const [adminPlansMessage, setAdminPlansMessage] = useState("");
  const [loadingAdminPlans, setLoadingAdminPlans] = useState(false);
  const [savingAdminPlanId, setSavingAdminPlanId] = useState("");
  const [publicPlans, setPublicPlans] = useState([]);
  const [landingMessage, setLandingMessage] = useState("");

  const [consultationHistory, setConsultationHistory] = useState([]);
  const [consultationHistoryMessage, setConsultationHistoryMessage] = useState("");
  const [paymentsHistory, setPaymentsHistory] = useState([]);
  const [paymentsHistoryMessage, setPaymentsHistoryMessage] = useState("");
  const [myRecords, setMyRecords] = useState([]);
  const [myRecordsMessage, setMyRecordsMessage] = useState("");
  const [myPendingRecordsCount, setMyPendingRecordsCount] = useState(0);
  const [notificationItems, setNotificationItems] = useState([]);
  const [notificationMessage, setNotificationMessage] = useState("");

  const [profileNome, setProfileNome] = useState("");
  const [profileWhatsapp, setProfileWhatsapp] = useState("");
  const [profileEmail, setProfileEmail] = useState("");
  const [profileNewPassword, setProfileNewPassword] = useState("");
  const [profileMessage, setProfileMessage] = useState("");

  const [nome, setNome] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");

  const [recordNome, setRecordNome] = useState("");
  const [recordCpf, setRecordCpf] = useState("");
  const [recordWhatsapp, setRecordWhatsapp] = useState("");
  const [recordCidade, setRecordCidade] = useState("");
  const [recordTipos, setRecordTipos] = useState([]);
  const [recordDescricao, setRecordDescricao] = useState("");
  const [recordImage, setRecordImage] = useState(null);

  const [searchText, setSearchText] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searchMessage, setSearchMessage] = useState("");
  const [consultationMode, setConsultationMode] = useState("internal");

  const [adminRecords, setAdminRecords] = useState([]);
  const [adminMessage, setAdminMessage] = useState("");
  const [adminRecordFilter, setAdminRecordFilter] = useState("todos");
  const [adminRecordSearch, setAdminRecordSearch] = useState("");
  const [adminExportMessage, setAdminExportMessage] = useState("");

  const [adminUsers, setAdminUsers] = useState([]);
  const [adminUsersMessage, setAdminUsersMessage] = useState("");

  const [adminFinancialData, setAdminFinancialData] = useState(null);
  const [adminFinancialMessage, setAdminFinancialMessage] = useState("");
  const [loadingFinancialDashboard, setLoadingFinancialDashboard] = useState(false);

  const [adminSupportMessages, setAdminSupportMessages] = useState([]);
  const [adminSupportMessage, setAdminSupportMessage] = useState("");
  const [adminSupportFilter, setAdminSupportFilter] = useState("todos");
  const [activityLogs, setActivityLogs] = useState([]);
  const [activityLogsMessage, setActivityLogsMessage] = useState("");
  const [adminExternalLogs, setAdminExternalLogs] = useState([]);
  const [adminExternalLogsMessage, setAdminExternalLogsMessage] = useState("");
  const [adminExternalFilterType, setAdminExternalFilterType] = useState("todos");
  const [adminExternalFilterCache, setAdminExternalFilterCache] = useState("todos");
  const [adminExternalSearch, setAdminExternalSearch] = useState("");
  const [adminActivityData, setAdminActivityData] = useState(null);
  const [adminActivityMessage, setAdminActivityMessage] = useState("");
  const [adminActivityPeriod, setAdminActivityPeriod] = useState("7");
  const [adminActivityType, setAdminActivityType] = useState("todos");
  const [adminActivitySearch, setAdminActivitySearch] = useState("");
  const [loadingAdminActivity, setLoadingAdminActivity] = useState(false);
  const [combinedConsultationStatus, setCombinedConsultationStatus] = useState(null);
  const [showExternalConsultationHistory, setShowExternalConsultationHistory] = useState(false);
  const [externalConsultationHistory, setExternalConsultationHistory] = useState([]);
  const [externalConsultationHistoryMessage, setExternalConsultationHistoryMessage] = useState("");

  const [editingRecord, setEditingRecord] = useState(null);
  const [editRecordNome, setEditRecordNome] = useState("");
  const [editRecordCpf, setEditRecordCpf] = useState("");
  const [editRecordWhatsapp, setEditRecordWhatsapp] = useState("");
  const [editRecordCidade, setEditRecordCidade] = useState("");
  const [editRecordTipos, setEditRecordTipos] = useState([]);
  const [editRecordDescricao, setEditRecordDescricao] = useState("");
  const [editRecordStatus, setEditRecordStatus] = useState("pendente");
  const [editRecordRejectionReason, setEditRecordRejectionReason] = useState("");
  const [editRecordImage, setEditRecordImage] = useState(null);
  const [editRecordMessage, setEditRecordMessage] = useState("");

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [recordMessage, setRecordMessage] = useState("");
  const [showPublicSupport, setShowPublicSupport] = useState(false);
  const [publicSupportName, setPublicSupportName] = useState("");
  const [publicSupportEmail, setPublicSupportEmail] = useState("");
  const [publicSupportWhatsapp, setPublicSupportWhatsapp] = useState("");
  const [publicSupportMessage, setPublicSupportMessage] = useState("");
  const [publicSupportFeedback, setPublicSupportFeedback] = useState("");

  async function uploadRecordImage(file) {
    if (!file || !session?.user?.id) return "";

    const fileExt = file.name.split(".").pop();
    const fileName = `${session.user.id}/${Date.now()}-${Math.random()
      .toString(36)
      .slice(2)}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from("records")
      .upload(fileName, file);

    if (uploadError) {
      throw uploadError;
    }

    const { data } = supabase.storage.from("records").getPublicUrl(fileName);

    return data.publicUrl;
  }

  async function loadProfile(userId) {
    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user;
    const provider = user?.app_metadata?.provider || "email";
    const userEmail = normalizeEmail(user?.email || "");
    const userNameFromAuth =
      user?.user_metadata?.nome ||
      user?.user_metadata?.full_name ||
      user?.user_metadata?.name ||
      userEmail ||
      "Usuário";

    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    if (data) {
      let profileData = data;

      const needsGoogleProfileSync =
        provider === "google" &&
        (!profileData.email || !profileData.nome || profileData.nome === "Usuário");

      if (needsGoogleProfileSync) {
        const { data: syncedProfile, error: syncError } = await supabase
          .from("profiles")
          .update({
            nome: profileData.nome && profileData.nome !== "Usuário" ? profileData.nome : userNameFromAuth,
            email: userEmail || profileData.email || null,
          })
          .eq("id", userId)
          .select("*")
          .maybeSingle();

        if (!syncError && syncedProfile) {
          profileData = syncedProfile;
        }
      }

      setProfile(profileData);
      return;
    }

    const { data: newProfile, error } = await supabase
      .from("profiles")
      .insert({
        id: userId,
        nome: userNameFromAuth,
        email: userEmail || null,
        whatsapp: user?.user_metadata?.whatsapp || "",
        role: "user",
        credits: 5,
        consultas: 0,
        account_status: "ativo",
        is_blocked: false,
        blocked_reason: null,
      })
      .select()
      .single();

    if (!error) {
      setProfile(newProfile);
    } else {
      console.log("Erro ao criar perfil:", error);
    }
  }

  async function registrarVisitaSite(currentSession) {
    try {
      const sessionKey = getAnalyticsSessionKey();
      const headers = { "Content-Type": "application/json" };

      if (currentSession?.access_token) {
        headers.Authorization = `Bearer ${currentSession.access_token}`;
      }

      await fetch("/api/analytics/visit", {
        method: "POST",
        headers,
        body: JSON.stringify({
          sessionKey,
          path: window.location.pathname.slice(0, 250),
        }),
      });
    } catch (error) {
      console.log("Registro de visita indisponível:", error);
    }
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);

      if (data.session?.user) {
        loadProfile(data.session.user.id);
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, currentSession) => {
        setSession(currentSession);

        if (currentSession?.user) {
          loadProfile(currentSession.user.id);
        } else {
          setProfile(null);
        }
      }
    );

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (session && profile?.role === "admin") {
      carregarDashboardFinanceiro();
      carregarOcorrenciasAdmin();
      carregarUsuariosAdmin();
      carregarPlanosAdmin();
      carregarMensagensSuporteAdmin();
      carregarLogsSistema();
      carregarConsultasExternasAdmin();
      carregarAtividadeAdmin();
    }
  }, [session, profile]);

  useEffect(() => {
    registrarVisitaSite(session);
  }, [session?.user?.id]);

  useEffect(() => {
    if (profile) {
      setProfileNome(profile.nome || "");
      setProfileWhatsapp(formatWhatsappInput(profile.whatsapp || ""));
      setProfileEmail(normalizeEmail(session?.user?.email || ""));
    }
  }, [profile]);
  useEffect(() => {
    if (!session?.user?.id) return;
    const saved = localStorage.getItem(`locacheck-notifications-read-${session.user.id}`);
    try {
      setNotificationReadIds(saved ? JSON.parse(saved) : []);
    } catch {
      setNotificationReadIds([]);
    }
  }, [session?.user?.id]);

  useEffect(() => {
    if (session?.user?.id && profile) {
      carregarResumoOcorrenciasUsuario();
      carregarNotificacoes();
    }
  }, [session?.user?.id, profile?.credits, profile?.unlimited_until]);

  useEffect(() => {
    if (session?.user?.id && profile) {
      verificarPagamentosAprovadosRecentes();
    }
  }, [session?.user?.id, profile?.credits, profile?.unlimited_until]);

  useEffect(() => {
    carregarDadosPublicosLanding();
  }, []);


  function showToast(type, title, messageText) {
    setToast({ type, title, message: messageText });
    setTimeout(() => setToast(null), 4200);
  }

  function abrirCompraPublica() {
    if (session?.user?.id) {
      setShowBuyCredits(true);
      return;
    }

    setMessage("Entre ou cadastre-se para comprar créditos via PIX.");
    setAuthMode("login");
  }

  async function recuperarSenha(event) {
    if (event?.preventDefault) event.preventDefault();
    const loginEmailNormalized = normalizeEmail(email);

    if (!isValidEmail(loginEmailNormalized)) {
      setMessage("Informe seu e-mail para receber o link de recuperação de senha.");
      return;
    }

    setLoading(true);
    setMessage("");

    const { error } = await supabase.auth.resetPasswordForEmail(loginEmailNormalized, {
      redirectTo: `${window.location.origin}/?reset_password=1`,
    });

    if (error) {
      const friendlyError = String(error.message || "").toLowerCase().includes("rate limit")
        ? "Limite de envio de e-mail atingido. Aguarde alguns minutos e tente novamente. Para produção, configure SMTP próprio no Supabase."
        : error.message || "Não foi possível enviar o link de recuperação.";
      setMessage(friendlyError);
    } else {
      setMessage("Enviamos um link de recuperação de senha para seu e-mail. Verifique também a caixa de spam.");
    }

    setLoading(false);
  }

  async function enviarSuportePublico(e) {
    e.preventDefault();

    const nomeSuporte = publicSupportName.trim();
    const emailSuporte = normalizeEmail(publicSupportEmail);
    const whatsappSuporte = formatWhatsappInput(publicSupportWhatsapp);
    const textoSuporte = publicSupportMessage.trim();

    if (!nomeSuporte || !textoSuporte) {
      setPublicSupportFeedback("Informe seu nome e escreva sua mensagem.");
      return;
    }

    if (publicSupportEmail && !isValidEmail(emailSuporte)) {
      setPublicSupportFeedback("Informe um e-mail válido ou deixe o campo em branco.");
      return;
    }

    setLoading(true);
    setPublicSupportFeedback("");

    const mensagemTratada = [
      "Mensagem enviada pela tela inicial do site.",
      `Nome: ${nomeSuporte}`,
      emailSuporte ? `E-mail: ${emailSuporte}` : "E-mail: não informado",
      whatsappSuporte ? `WhatsApp: ${whatsappSuporte}` : "WhatsApp: não informado",
      "",
      textoSuporte,
    ].join("\n");

    const { error } = await supabase.from("support_messages").insert({
      message: mensagemTratada,
      status: "novo",
      contact_name: nomeSuporte,
      contact_email: emailSuporte || null,
      contact_whatsapp: onlyDigits(whatsappSuporte) || null,
    });

    if (error) {
      console.log("Erro ao enviar suporte público:", error);
      setPublicSupportFeedback("Não foi possível enviar a mensagem. Verifique a configuração do suporte no Supabase.");
    } else {
      setPublicSupportFeedback("Mensagem enviada com sucesso. Nossa equipe recebeu seu contato.");
      setPublicSupportName("");
      setPublicSupportEmail("");
      setPublicSupportWhatsapp("");
      setPublicSupportMessage("");
    }

    setLoading(false);
  }

  async function carregarDadosPublicosLanding() {
    setLandingMessage("");

    try {
      const { data: plansData, error: plansError } = await supabase
        .from("plans")
        .select("*")
        .neq("active", false)
        .order("price_cents", { ascending: true })
        .order("credits", { ascending: true })
        .order("name", { ascending: true });

      if (!plansError) {
        setPublicPlans((plansData || []).map(normalizePlanRow).filter((plan) => plan.is_unlimited !== true).sort(sortPlansByPrice));
      } else {
        console.log("Planos públicos indisponíveis:", plansError);
        setLandingMessage("Os planos serão carregados após a configuração pública no Supabase.");
      }
    } catch (error) {
      console.log("Erro ao carregar dados públicos da landing:", error);
      setLandingMessage("Alguns dados públicos não puderam ser carregados agora.");
    }
  }

  async function verificarPagamentosAprovadosRecentes() {
    if (!session?.user?.id) return;

    const storageKey = `locacheck-paid-alerts-${session.user.id}`;
    let alertedIds = [];

    try {
      alertedIds = JSON.parse(localStorage.getItem(storageKey) || "[]");
    } catch {
      alertedIds = [];
    }

    const { data, error } = await supabase
      .from("payments")
      .select("id, status, credits, plan_type, paid_at, processed_at")
      .eq("user_id", session.user.id)
      .eq("status", "paid")
      .order("paid_at", { ascending: false })
      .limit(5);

    if (error || !data || data.length === 0) return;

    const novos = data.filter((payment) => !alertedIds.includes(payment.id));
    if (novos.length === 0) return;

    const maisRecente = novos[0];
    const isUnlimited = maisRecente.plan_type === "unlimited";

    showToast(
      "success",
      "Pagamento aprovado!",
      isUnlimited
        ? "Seu plano ilimitado já foi ativado. Atualize a página se o saldo ainda não aparecer."
        : "Seus créditos já foram liberados. Atualize a página se o saldo ainda não aparecer."
    );

    const merged = Array.from(new Set([...alertedIds, ...novos.map((payment) => payment.id)])).slice(-30);
    localStorage.setItem(storageKey, JSON.stringify(merged));
  }

  async function registrarLogAdmin(action, details = {}) {
    if (!session?.user?.id || profile?.role !== "admin") return;

    const { error } = await supabase.from("activity_logs").insert({
      user_id: session.user.id,
      action,
      details,
    });

    if (error) {
      console.log("Erro ao registrar log administrativo:", error);
    }
  }

  async function carregarLogsSistema() {
    if (profile?.role !== "admin") return;

    setActivityLogsMessage("");

    const { data, error } = await supabase
      .from("activity_logs")
      .select("id, user_id, action, details, created_at")
      .order("created_at", { ascending: false })
      .limit(80);

    if (error) {
      console.log("Erro ao carregar logs:", error);
      setActivityLogs([]);
      setActivityLogsMessage(error.message || "Erro ao carregar logs do sistema.");
      return;
    }

    setActivityLogs(data || []);

    if (!data || data.length === 0) {
      setActivityLogsMessage("Nenhum log registrado ainda.");
    }
  }

  function marcarNotificacoesComoLidas() {
    if (!session?.user?.id) return;
    const ids = notificationItems.map((item) => item.id);
    setNotificationReadIds(ids);
    localStorage.setItem(
      `locacheck-notifications-read-${session.user.id}`,
      JSON.stringify(ids)
    );
    showToast("success", "Notificações lidas", "As notificações foram marcadas como lidas.");
  }

  function notificacaoNaoLida(item) {
    return !notificationReadIds.includes(item.id);
  }


  function abrirMeusDados() {
    setProfileNome(profile?.nome || "");
    setProfileWhatsapp(formatWhatsappInput(profile?.whatsapp || ""));
    setProfileEmail(normalizeEmail(session?.user?.email || ""));
    setProfileNewPassword("");
    setProfileMessage("");
    setShowProfileData(true);
  }

  async function salvarMeusDados(e) {
    e.preventDefault();

    if (loading) return;

    if (!session?.user?.id) return;

    if (!profileNome.trim()) {
      setProfileMessage("Informe seu nome ou nome da empresa.");
      return;
    }

    const profileWhatsappDigits = onlyDigits(profileWhatsapp);
    const profileEmailNormalized = normalizeEmail(profileEmail);

    if (!profileWhatsappDigits) {
      setProfileMessage("Informe seu WhatsApp.");
      return;
    }

    if (!isValidWhatsapp(profileWhatsappDigits)) {
      setProfileMessage("Informe um WhatsApp válido com DDD. Exemplo: (88) 99999-9999.");
      return;
    }

    if (!isValidEmail(profileEmailNormalized)) {
      setProfileMessage("Informe um e-mail válido.");
      return;
    }

    setLoading(true);
    setProfileMessage("");

    const { error: profileError } = await supabase
      .from("profiles")
      .update({
        nome: profileNome.trim(),
        whatsapp: profileWhatsappDigits,
      })
      .eq("id", session.user.id);

    if (profileError) {
      console.log("Erro ao atualizar perfil:", profileError);
      setProfileMessage(profileError.message || "Erro ao atualizar seus dados.");
      showToast("error", "Erro ao salvar", "Não foi possível atualizar seus dados.");
      setLoading(false);
      return;
    }

    const authPayload = {};

    if (profileEmailNormalized && profileEmailNormalized !== normalizeEmail(session.user.email)) {
      authPayload.email = profileEmailNormalized;
    }

    if (profileNewPassword.trim()) {
      if (profileNewPassword.trim().length < 6) {
        setProfileMessage("A nova senha precisa ter pelo menos 6 caracteres.");
        setLoading(false);
        return;
      }
      authPayload.password = profileNewPassword.trim();
    }

    if (Object.keys(authPayload).length > 0) {
      const { error: authError } = await supabase.auth.updateUser(authPayload);

      if (authError) {
        console.log("Erro ao atualizar acesso:", authError);
        setProfileMessage(authError.message || "Dados salvos, mas não foi possível atualizar e-mail/senha.");
        showToast("warning", "Atenção", "Perfil salvo, mas revise o e-mail ou senha informados.");
        setLoading(false);
        return;
      }
    }

    await loadProfile(session.user.id);
    setProfileNewPassword("");
    setProfileMessage(
      authPayload.email
        ? "Dados atualizados. Confirme o novo e-mail se o Supabase enviar uma confirmação."
        : "Dados atualizados com sucesso."
    );
    showToast("success", "Dados atualizados", "Suas informações foram salvas com sucesso.");
    setLoading(false);
  }

  async function cadastrarUsuario(e) {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    if (!termsAccepted) {
      setMessage("Para criar sua conta, aceite os Termos de Uso e a Política de Privacidade.");
      setLoading(false);
      return;
    }

    const cadastroWhatsappDigits = onlyDigits(whatsapp);
    const cadastroEmailNormalized = normalizeEmail(email);

    if (!nome.trim()) {
      setMessage("Informe seu nome ou nome da empresa.");
      setLoading(false);
      return;
    }

    if (!isValidWhatsapp(cadastroWhatsappDigits)) {
      setMessage("Informe um WhatsApp válido com DDD. Exemplo: (88) 99999-9999.");
      setLoading(false);
      return;
    }

    if (!isValidEmail(cadastroEmailNormalized)) {
      setMessage("Informe um e-mail válido.");
      setLoading(false);
      return;
    }

    if (senha.trim().length < 6) {
      setMessage("A senha precisa ter pelo menos 6 caracteres.");
      setLoading(false);
      return;
    }

    const { error } = await supabase.auth.signUp({
      email: cadastroEmailNormalized,
      password: senha,
      options: {
        data: {
          nome: nome.trim(),
          email: cadastroEmailNormalized,
          whatsapp: cadastroWhatsappDigits,
          terms_accepted: true,
          terms_version: "2026-06-14",
          terms_accepted_at: new Date().toISOString(),
        },
      },
    });

    if (error) {
      setMessage(error.message);
    } else {
      setMessage("Cadastro realizado com sucesso. Confirme seu e-mail. Sua conta terá 5 créditos iniciais.");
      showToast("success", "Cadastro realizado", "Confirme seu e-mail. Sua conta terá 5 créditos iniciais.");
      setAuthMode("login");
      setNome("");
      setWhatsapp("");
      setEmail("");
      setSenha("");
      setTermsAccepted(false);
    }

    setLoading(false);
  }

  async function entrarUsuario(e) {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    const loginEmailNormalized = normalizeEmail(email);

    if (!isValidEmail(loginEmailNormalized)) {
      setMessage("Informe um e-mail válido.");
      setLoading(false);
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({
      email: loginEmailNormalized,
      password: senha,
    });

    if (error) {
      setMessage("E-mail ou senha inválidos.");
    } else {
      showToast("success", "Login realizado", "Bem-vindo ao painel LocaCheck.");
      setAuthMode(null);
      setEmail("");
      setSenha("");
    }

    setLoading(false);
  }

  async function entrarComGoogle() {
    if (loading) return;

    setLoading(true);
    setMessage("");

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: window.location.origin,
          queryParams: {
            prompt: "select_account",
          },
        },
      });

      if (error) {
        setMessage(
          error.message ||
            "Não foi possível iniciar o login com Google. Verifique se o provedor Google está configurado no Supabase."
        );
        setLoading(false);
        return;
      }

    } catch (error) {
      console.log("Erro ao iniciar login com Google:", error);
      setMessage("Não foi possível iniciar o login com Google. Tente novamente.");
      setLoading(false);
    }
  }

  async function sair() {
    await supabase.auth.signOut();
    setSession(null);
    setProfile(null);
  }

  function toggleTipo(tipo) {
    if (recordTipos.includes(tipo)) {
      setRecordTipos(recordTipos.filter((item) => item !== tipo));
    } else {
      setRecordTipos([...recordTipos, tipo]);
    }
  }

  function limparFormularioOcorrencia() {
    setRecordNome("");
    setRecordCpf("");
    setRecordWhatsapp("");
    setRecordCidade("");
    setRecordTipos([]);
    setRecordDescricao("");
    setRecordImage(null);
  }

  async function cadastrarOcorrencia(e) {
    e.preventDefault();

    if (loading) return;
    setLoading(true);
    setRecordMessage("");

    const cpfLimpo = onlyDigits(recordCpf);
    const cpf4 = cpfLimpo.slice(-4);
    const whatsappLimpo = onlyDigits(recordWhatsapp);

    if (!recordNome.trim() || recordNome.trim().length < 3) {
      setRecordMessage("Informe o nome completo do locatário.");
      setLoading(false);
      return;
    }

    if (!isValidCpf(cpfLimpo)) {
      setRecordMessage("Informe um CPF válido com 11 números.");
      setLoading(false);
      return;
    }

    if (whatsappLimpo.length < 10) {
      setRecordMessage("Informe um WhatsApp válido com DDD.");
      setLoading(false);
      return;
    }

    if (!recordCidade.trim() || recordCidade.trim().length < 3) {
      setRecordMessage("Informe a cidade/UF da ocorrência.");
      setLoading(false);
      return;
    }

    if (recordTipos.length === 0) {
      setRecordMessage("Selecione pelo menos um tipo de ocorrência.");
      setLoading(false);
      return;
    }

    if (!recordDescricao.trim() || recordDescricao.trim().length < 20) {
      setRecordMessage("Descreva a ocorrência com pelo menos 20 caracteres.");
      setLoading(false);
      return;
    }

    try {
      const imagemUrl = recordImage ? await uploadRecordImage(recordImage) : "";

      const { error } = await supabase.from("records").insert({
        nome: recordNome,
        cpf_full: cpfLimpo,
        cpf4,
        cidade: recordCidade,
        whatsapp_locatario: whatsappLimpo,
        tipos: recordTipos,
        descricao: recordDescricao,
        imagem_url: imagemUrl,
        status: "pendente",
        created_by: session.user.id,
      });

      if (error) {
        console.log(error);
        setRecordMessage(
          "Erro ao registrar ocorrência. Verifique os dados e tente novamente."
        );
      } else {
        setRecordMessage(
          "Ocorrência registrada com sucesso! Breve a ocorrência já estará disponível para consulta na plataforma."
        );
        showToast("success", "Ocorrência registrada", "Sua ocorrência foi enviada para análise do administrador.");
        carregarResumoOcorrenciasUsuario();
        limparFormularioOcorrencia();
      }
    } catch (error) {
      console.log(error);
      setRecordMessage("Erro ao enviar imagem. Tente novamente.");
    }

    setLoading(false);
  }

  async function consultarLocatario(e) {
    e.preventDefault();

    const securityBlockMessage = getUserSecurityBlock(session, profile);
    if (securityBlockMessage) {
      setSearchMessage(securityBlockMessage);
      showToast("warning", "Consulta bloqueada", securityBlockMessage);

      if (onlyDigits(profile?.whatsapp || "").length < 10 && isSessionEmailConfirmed(session)) {
        abrirMeusDados();
      }

      return;
    }

    if (consultationMode === "internal") {
      return consultarLocatarioInterno();
    }

    return consultarLocatarioExterno();
  }

  async function consultarLocatarioInterno() {
    if (loading) return;

    const searchClean = searchText.trim();

    if (!searchClean) {
      setSearchMessage("Digite um nome ou CPF para consultar.");
      return;
    }

    if (looksLikeCpfSearch(searchClean) && !isValidCpf(searchClean)) {
      setSearchMessage("Para consultar por CPF, informe um CPF completo e válido.");
      return;
    }

    setLoading(true);
    setSearchMessage("");
    setSearchResults([]);
    setCombinedConsultationStatus(null);

    try {
      const { data: limitData, error: limitError } = await supabase.rpc("can_start_consultation", {
        p_search: searchClean,
      });

      if (limitError) {
        console.log("Validação anti-abuso indisponível:", limitError);
      } else if (limitData && limitData.success === false) {
        setSearchMessage(limitData.message || "Consulta bloqueada temporariamente por segurança.");
        setLoading(false);
        return;
      }
    } catch (error) {
      console.log("Erro ao validar limite de consulta:", error);
    }

    const { data, error } = await supabase.rpc("secure_consult_renter", {
      p_search: searchClean,
    });

    if (error) {
      console.log(error);
      setSearchMessage(error.message || "Erro ao realizar consulta.");
      setLoading(false);
      return;
    }

    if (!data?.success) {
      setSearchMessage(data?.message || "Não foi possível realizar a consulta.");
      setSearchResults([]);
      await loadProfile(session.user.id);
      setLoading(false);
      return;
    }

    const results = (data.results || []).map((item) => ({ ...item, result_origin: "internal" }));

    setSearchResults(results);

    if (results.length === 0) {
      setSearchMessage(INTERNAL_NO_RECORDS_MESSAGE);
    } else {
      setSearchMessage(
        `Consulta interna realizada. ${results.length} registro(s) encontrado(s).`
      );
    }

    await loadProfile(session.user.id);
    setLoading(false);
  }

  async function consultarLocatarioExterno() {
    if (loading) return;

    const cpfDigits = onlyDigits(searchText);
    const creditsNeeded = externalConsultationCredits(consultationMode);
    const consultationLabel = externalConsultationLabel(consultationMode);

    if (!isValidCpf(cpfDigits)) {
      setSearchMessage("Para consulta externa, informe um CPF completo e válido.");
      return;
    }

    if (Number(profile?.credits || 0) < creditsNeeded) {
      setSearchMessage(`${consultationLabel} consome ${creditsNeeded} créditos. Recarregue sua conta para continuar.`);
      return;
    }

    const confirmed = window.confirm(
      `${consultationLabel}\n\nEsta consulta consome ${creditsNeeded} créditos e também verifica a base interna sem cobrança adicional. O resultado externo deve ser usado apenas como apoio à análise. Deseja continuar?`
    );

    if (!confirmed) return;

    setLoading(true);
    setSearchMessage("");
    setSearchResults([]);
    setCombinedConsultationStatus(null);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      if (!token) {
        setSearchMessage("Sessão expirada. Faça login novamente.");
        setLoading(false);
        return;
      }

      const response = await fetch("/api/bigdata/external-consult", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          cpf: cpfDigits,
          consultationType: consultationMode,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok || !data?.success) {
        setSearchMessage(data?.message || "Não foi possível realizar a consulta externa.");
        setLoading(false);
        await loadProfile(session.user.id);
        return;
      }

      const externalResults = (data.results || []).map((item, index) => ({
        ...item,
        id: `${data.consultationType || consultationMode}-${Date.now()}-external-${index}`,
        result_origin: "external",
        consultation_label: data.consultationLabel || consultationLabel,
        credits_charged: data.creditsCharged || creditsNeeded,
        credits_balance_after: data.creditsBalanceAfter,
        cache_hit: data.cacheHit || item.cached || false,
      }));

      const internalResults = (data.internalResults || []).map((item, index) => ({
        ...item,
        id: item.id || `internal-included-${Date.now()}-${index}`,
        result_origin: "internal",
        included_with_external: true,
      }));

      setSearchResults([...externalResults, ...internalResults]);
      setCombinedConsultationStatus({
        externalCompleted: externalResults.length > 0,
        internalVerified: data.internalCheckSuccess !== false,
        internalCount: internalResults.length,
        creditsCharged: data.creditsCharged || creditsNeeded,
      });
      setSearchMessage(
        data.internalCheckSuccess === false
          ? `${data.consultationLabel || consultationLabel} concluída, mas a base interna ficou temporariamente indisponível. Nenhum crédito adicional foi cobrado.`
          : `${data.consultationLabel || consultationLabel} concluída. A base interna também foi verificada sem cobrança adicional.`
      );

      await loadProfile(session.user.id);
    } catch (error) {
      console.log("Erro na consulta externa:", error);
      setSearchMessage("Erro inesperado ao realizar consulta externa.");
    }

    setLoading(false);
  }

  async function carregarAtividadeAdmin(days = adminActivityPeriod) {
    if (profile?.role !== "admin") return;

    setLoadingAdminActivity(true);
    setAdminActivityMessage("Carregando visitas e consultas...");

    const selectedDays = Math.max(1, Math.min(Number(days || 7), 90));
    const { data, error } = await supabase.rpc("get_admin_activity_overview", {
      p_days: selectedDays,
    });

    if (error) {
      console.log("Erro ao carregar atividade administrativa:", error);
      setAdminActivityData(null);
      setAdminActivityMessage(
        "Não foi possível carregar visitas e consultas. Rode a migração V43 no Supabase."
      );
      setLoadingAdminActivity(false);
      return;
    }

    setAdminActivityData(data || null);
    setAdminActivityMessage("");
    setLoadingAdminActivity(false);
  }

  async function carregarConsultasExternasAdmin() {
    if (profile?.role !== "admin") return;

    setAdminExternalLogsMessage("Carregando consultas externas...");

    const { data, error } = await supabase
      .from("external_consultation_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      console.log("Erro ao carregar external_consultation_logs:", error);
      setAdminExternalLogsMessage("Erro ao carregar consultas externas. Verifique a migração V29 no Supabase.");
      setAdminExternalLogs([]);
      return;
    }

    const logs = data || [];
    const userIds = [...new Set(logs.map((log) => log.user_id).filter(Boolean))];
    let profilesById = {};

    if (userIds.length > 0) {
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("id,nome,email")
        .in("id", userIds);

      if (profilesError) {
        console.log("Erro ao carregar perfis das consultas externas:", profilesError);
      } else {
        profilesById = Object.fromEntries((profilesData || []).map((item) => [item.id, item]));
      }
    }

    const normalizedLogs = logs.map((log) => ({
      ...log,
      profiles: profilesById[log.user_id] || null,
    }));

    setAdminExternalLogs(normalizedLogs);
    setAdminExternalLogsMessage("");
  }

  async function carregarMinhasConsultasExternas() {
    if (!session?.user?.id) return;

    setExternalConsultationHistoryMessage("Carregando consultas externas...");

    const { data, error } = await supabase
      .from("external_consultation_logs")
      .select("*")
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      console.log("Erro ao carregar minhas consultas externas:", error);
      setExternalConsultationHistory([]);
      setExternalConsultationHistoryMessage("Não foi possível carregar suas consultas externas.");
      return;
    }

    setExternalConsultationHistory(data || []);
    setExternalConsultationHistoryMessage((data || []).length === 0 ? "Nenhuma consulta externa encontrada." : "");
  }

  async function copiarResumoConsultaExterna(item) {
    const resumo = buildExternalSummaryText(item);

    try {
      await navigator.clipboard.writeText(resumo);
      setSearchMessage("Resumo da consulta externa copiado.");
    } catch {
      setSearchMessage("Não foi possível copiar automaticamente. Selecione e copie o resumo manualmente.");
    }
  }

  function exportarConsultaExterna(item) {
    const cpfFinal = onlyDigits(item?.cpf || item?.cpf_masked || item?.cpf4 || "").slice(-4) || "consulta";
    const data = new Date().toISOString().slice(0, 10);
    const abriu = abrirRelatorioConsulta(
      buildExternalReportHtml(item),
      `locacheck-relatorio-consulta-externa-${cpfFinal}-${data}.html`
    );
    setSearchMessage(abriu ? "Relatório aberto. Use Salvar como PDF ou Imprimir." : "Relatório baixado em HTML. Abra o arquivo e salve como PDF.");
  }

  function exportarConsultaInterna(item) {
    const cpfFinal = onlyDigits(item?.cpf || item?.cpf_masked || item?.cpf4 || "").slice(-4) || "consulta";
    const data = new Date().toISOString().slice(0, 10);
    const abriu = abrirRelatorioConsulta(
      buildInternalReportHtml(item),
      `locacheck-relatorio-consulta-interna-${cpfFinal}-${data}.html`
    );
    setSearchMessage(abriu ? "Relatório aberto. Use Salvar como PDF ou Imprimir." : "Relatório baixado em HTML. Abra o arquivo e salve como PDF.");
  }

  async function carregarOcorrenciasAdmin() {
    const { data, error } = await supabase
      .from("records")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.log(error);
      setAdminMessage("Erro ao carregar ocorrências.");
      return;
    }

    setAdminRecords(data || []);
  }

  async function atualizarStatusOcorrencia(id, status) {
    if (loading) return;

    let rejectionReason = "";

    if (status === "reprovado") {
      rejectionReason = window.prompt(
        "Informe o motivo da reprovação para o usuário:",
        "Faltou comprovante ou os dados estão incompletos."
      );

      if (rejectionReason === null) return;

      if (!rejectionReason.trim()) {
        setAdminMessage("Informe um motivo para reprovar a ocorrência.");
        return;
      }
    }

    setLoading(true);

    const { error } = await supabase
      .from("records")
      .update({
        status,
        approved_at: status === "aprovado" ? new Date().toISOString() : null,
        rejection_reason: status === "reprovado" ? rejectionReason.trim() : null,
      })
      .eq("id", id);

    if (error) {
      console.log(error);
      setAdminMessage("Erro ao atualizar ocorrência. Confirme se a coluna rejection_reason foi criada no Supabase.");
      setLoading(false);
      return;
    }

    setAdminMessage("Ocorrência atualizada com sucesso.");
    showToast("success", "Ocorrência atualizada", `Status alterado para ${status}.`);
    await registrarLogAdmin(`ocorrencia_${status}`, { record_id: id, status });
    carregarOcorrenciasAdmin();
    setLoading(false);
  }

  async function excluirOcorrencia(id) {
    if (loading) return;

    const confirmar = window.confirm(
      "Tem certeza que deseja excluir esta ocorrência?"
    );

    if (!confirmar) return;

    const { error } = await supabase.from("records").delete().eq("id", id);

    if (error) {
      console.log(error);
      setAdminMessage("Erro ao excluir ocorrência.");
      return;
    }

    setAdminMessage("Ocorrência excluída com sucesso.");
    showToast("success", "Ocorrência excluída", "O registro foi removido.");
    await registrarLogAdmin("ocorrencia_excluida", { record_id: id });
    carregarOcorrenciasAdmin();
  }

  function abrirEdicaoOcorrencia(item) {
    setEditingRecord(item);
    setEditRecordNome(item.nome || "");
    setEditRecordCpf(item.cpf_full || "");
    setEditRecordWhatsapp(item.whatsapp_locatario || "");
    setEditRecordCidade(item.cidade || "");
    setEditRecordTipos(item.tipos || []);
    setEditRecordDescricao(item.descricao || "");
    setEditRecordStatus(item.status || "pendente");
    setEditRecordRejectionReason(item.rejection_reason || "");
    setEditRecordImage(null);
    setEditRecordMessage("");
  }

  function toggleTipoEdicao(tipo) {
    if (editRecordTipos.includes(tipo)) {
      setEditRecordTipos(editRecordTipos.filter((item) => item !== tipo));
    } else {
      setEditRecordTipos([...editRecordTipos, tipo]);
    }
  }

  async function salvarEdicaoOcorrencia(e) {
    e.preventDefault();

    if (loading) return;

    if (!editingRecord) return;

    if (editRecordTipos.length === 0) {
      setEditRecordMessage("Selecione pelo menos um tipo de ocorrência.");
      return;
    }

    if (editRecordStatus === "reprovado" && !editRecordRejectionReason.trim()) {
      setEditRecordMessage("Informe o motivo da reprovação.");
      return;
    }

    setLoading(true);
    setEditRecordMessage("");

    const cpfLimpo = editRecordCpf.replace(/\D/g, "");
    const cpf4 = cpfLimpo.slice(-4);

    try {
      let imagemUrl = editingRecord.imagem_url || "";

      if (editRecordImage) {
        imagemUrl = await uploadRecordImage(editRecordImage);
      }

      const { error } = await supabase
        .from("records")
        .update({
          nome: editRecordNome,
          cpf_full: cpfLimpo,
          cpf4,
          cidade: editRecordCidade,
          whatsapp_locatario: editRecordWhatsapp,
          tipos: editRecordTipos,
          descricao: editRecordDescricao,
          imagem_url: imagemUrl,
          status: editRecordStatus,
          approved_at:
            editRecordStatus === "aprovado" ? new Date().toISOString() : null,
          rejection_reason:
            editRecordStatus === "reprovado"
              ? editRecordRejectionReason.trim()
              : null,
        })
        .eq("id", editingRecord.id);

      if (error) {
        console.log(error);
        setEditRecordMessage("Erro ao salvar edição.");
        setLoading(false);
        return;
      }

      setEditRecordMessage("Ocorrência editada com sucesso.");
      showToast("success", "Ocorrência salva", "As alterações foram aplicadas.");
      await registrarLogAdmin("ocorrencia_editada", { record_id: editingRecord.id, status: editRecordStatus });
      await carregarOcorrenciasAdmin();

      setTimeout(() => {
        setEditingRecord(null);
        setEditRecordMessage("");
      }, 800);
    } catch (error) {
      console.log(error);
      setEditRecordMessage("Erro ao enviar imagem.");
    }

    setLoading(false);
  }

  async function carregarPlanosAdmin() {
    if (profile?.role !== "admin") return;

    setLoadingAdminPlans(true);
    setAdminPlansMessage("");

    const { data, error } = await supabase
      .from("plans")
      .select("*")
      .order("price_cents", { ascending: true })
      .order("credits", { ascending: true })
      .order("name", { ascending: true });

    if (error) {
      console.log("Erro ao carregar planos:", error);
      setAdminPlans([]);
      setAdminPlansMessage(
        error.message || "Erro ao carregar planos. Verifique a tabela plans e as permissões RLS."
      );
      setLoadingAdminPlans(false);
      return;
    }

    setAdminPlans((data || []).map(normalizePlanRow).sort(sortPlansByPrice));

    if (!data || data.length === 0) {
      setAdminPlansMessage("Nenhum plano encontrado. Crie um plano para aparecer na tela de compra.");
    }

    setLoadingAdminPlans(false);
  }

  function atualizarPlanoLocal(planId, campo, valor) {
    setAdminPlans((planos) =>
      planos.map((plano) =>
        plano.id === planId
          ? {
              ...plano,
              [campo]: valor,
            }
          : plano
      )
    );
  }

  async function salvarPlanoAdmin(plano) {
    if (profile?.role !== "admin" || !plano?.id) return;

    if (!String(plano.name || "").trim()) {
      setAdminPlansMessage("Informe o nome do plano antes de salvar.");
      return;
    }

    const payload = {
      name: String(plano.name || "").trim(),
      credits: Math.max(0, Number(plano.credits || 0)),
      price_cents: Math.max(0, Number(plano.price_cents || 0)),
      price: Math.max(0, Number(plano.price_cents || 0)) / 100,
      plan_type: Boolean(plano.is_unlimited) ? "unlimited" : "credits",
      is_unlimited: Boolean(plano.is_unlimited),
      duration_days: Math.max(0, Number(plano.duration_days || 0)),
      active: Boolean(plano.active),
    };

    setSavingAdminPlanId(plano.id);
    setAdminPlansMessage("");

    const { error } = await supabase.from("plans").update(payload).eq("id", plano.id);

    if (error) {
      console.log("Erro ao salvar plano:", error);
      setAdminPlansMessage(error.message || "Erro ao salvar plano. Verifique as permissões RLS da tabela plans.");
      setSavingAdminPlanId("");
      return;
    }

    setAdminPlansMessage("Plano salvo com sucesso.");
    showToast("success", "Plano atualizado", "As alterações do plano foram salvas.");
    await registrarLogAdmin("plano_editado", { plan_id: plano.id, name: payload.name, active: payload.active });
    await carregarPlanosAdmin();
    setSavingAdminPlanId("");
  }

  async function alternarStatusPlano(plano) {
    if (profile?.role !== "admin" || !plano?.id) return;

    setSavingAdminPlanId(plano.id);
    setAdminPlansMessage("");

    const novoStatus = !Boolean(plano.active);
    const { error } = await supabase
      .from("plans")
      .update({ active: novoStatus })
      .eq("id", plano.id);

    if (error) {
      console.log("Erro ao alterar status do plano:", error);
      setAdminPlansMessage(error.message || "Erro ao ativar/desativar plano.");
      setSavingAdminPlanId("");
      return;
    }

    showToast(
      "success",
      novoStatus ? "Plano ativado" : "Plano desativado",
      novoStatus ? "O plano voltou a aparecer na compra." : "O plano foi ocultado da tela de compra."
    );
    await registrarLogAdmin("plano_status_alterado", { plan_id: plano.id, active: novoStatus });
    await carregarPlanosAdmin();
    setSavingAdminPlanId("");
  }

  async function excluirPlanoAdmin(plano) {
    if (profile?.role !== "admin" || !plano?.id) return;

    const confirmar = window.confirm(
      `Tem certeza que deseja excluir o plano "${plano.name || "sem nome"}"? Essa ação remove o plano da tabela. Se ele já foi usado em pagamentos antigos, prefira desativar para manter o histórico mais organizado.`
    );

    if (!confirmar) return;

    setSavingAdminPlanId(plano.id);
    setAdminPlansMessage("");

    const { error } = await supabase.from("plans").delete().eq("id", plano.id);

    if (error) {
      console.log("Erro ao excluir plano:", error);
      setAdminPlansMessage(
        error.message ||
          "Erro ao excluir plano. Se esse plano já estiver ligado a pagamentos, desative em vez de excluir."
      );
      showToast("error", "Erro ao excluir", "Não foi possível excluir este plano.");
      setSavingAdminPlanId("");
      return;
    }

    showToast("success", "Plano excluído", "O plano foi removido da lista.");
    await registrarLogAdmin("plano_excluido", { plan_id: plano.id, name: plano.name || "" });
    await carregarPlanosAdmin();
    setSavingAdminPlanId("");
  }

  async function criarPlanoAdmin() {
    if (profile?.role !== "admin") return;

    setLoadingAdminPlans(true);
    setAdminPlansMessage("");

    const { error } = await supabase.from("plans").insert({
      name: "Novo plano",
      credits: 0,
      price_cents: 1990,
      price: 19.9,
      plan_type: "credits",
      is_unlimited: false,
      duration_days: 0,
      active: false,
    });

    if (error) {
      console.log("Erro ao criar plano:", error);
      setAdminPlansMessage(error.message || "Erro ao criar plano. Verifique as permissões da tabela plans.");
      setLoadingAdminPlans(false);
      return;
    }

    showToast("success", "Plano criado", "Um novo plano inativo foi criado para edição.");
    await registrarLogAdmin("plano_criado", { name: "Novo plano" });
    await carregarPlanosAdmin();
    setLoadingAdminPlans(false);
  }

  async function carregarUsuariosAdmin() {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.log(error);
      setAdminUsersMessage("Erro ao carregar usuários.");
      return;
    }

    setAdminUsers(data || []);
  }

  async function alterarRoleUsuario(userId, novoRole) {
    if (loading) return;

    if (!session?.user?.id || profile?.role !== "admin") {
      setAdminUsersMessage("Apenas administradores podem alterar o perfil de acesso.");
      return;
    }

    const usuario = adminUsers.find((item) => item.id === userId);
    if (!usuario) return;

    const roleAtual = String(usuario.role || "user").toLowerCase();
    const roleDestino = String(novoRole || "user").toLowerCase();

    if (roleAtual === roleDestino) {
      setAdminUsersMessage("Este usuário já está com este perfil.");
      return;
    }

    if (userId === session.user.id && roleDestino !== "admin") {
      setAdminUsersMessage("Por segurança, você não pode remover seu próprio acesso de administrador pelo painel.");
      showToast("warning", "Ação bloqueada", "Use outro administrador para alterar seu próprio perfil.");
      return;
    }

    const confirmar = window.confirm(
      roleDestino === "admin"
        ? `Deseja transformar ${usuario.nome || usuario.email || "este usuário"} em administrador?`
        : `Deseja remover o acesso de administrador de ${usuario.nome || usuario.email || "este usuário"}?`
    );

    if (!confirmar) return;

    setLoading(true);
    setAdminUsersMessage("");

    const { data, error } = await supabase.rpc("admin_set_user_role", {
      p_user_id: userId,
      p_role: roleDestino,
    });

    if (error || data?.success === false) {
      console.log("Erro ao alterar perfil:", error || data);
      setAdminUsersMessage(error?.message || data?.message || "Erro ao alterar o perfil do usuário.");
      showToast("error", "Erro ao alterar perfil", "Verifique as permissões no Supabase.");
      setLoading(false);
      return;
    }

    setAdminUsersMessage(
      roleDestino === "admin"
        ? "Usuário promovido para administrador com sucesso."
        : "Usuário alterado para usuário comum com sucesso."
    );
    showToast("success", "Perfil atualizado", roleDestino === "admin" ? "Acesso admin liberado." : "Acesso admin removido.");
    await carregarUsuariosAdmin();

    if (userId === session.user.id) {
      await loadProfile(session.user.id);
    }

    setLoading(false);
  }

  async function alterarStatusContaUsuario(userId, novoStatus) {
    if (loading) return;

    if (!session?.user?.id || profile?.role !== "admin") {
      setAdminUsersMessage("Apenas administradores podem bloquear ou liberar usuários.");
      return;
    }

    const usuario = adminUsers.find((item) => item.id === userId);
    if (!usuario) return;

    if (userId === session.user.id && String(novoStatus || "").toLowerCase() !== "ativo") {
      setAdminUsersMessage("Por segurança, você não pode bloquear sua própria conta pelo painel.");
      showToast("warning", "Ação bloqueada", "Use outro administrador para alterar seu próprio status.");
      return;
    }

    let motivo = "";
    if (String(novoStatus).toLowerCase() === "bloqueado") {
      motivo = window.prompt(
        `Informe o motivo do bloqueio de ${usuario.nome || usuario.email || "este usuário"}:`,
        "Uso indevido ou cadastro suspeito"
      ) || "";
      if (!motivo.trim()) return;
    }

    const confirmar = window.confirm(
      String(novoStatus).toLowerCase() === "bloqueado"
        ? `Deseja bloquear ${usuario.nome || usuario.email || "este usuário"}? Ele não poderá realizar consultas.`
        : `Deseja liberar ${usuario.nome || usuario.email || "este usuário"} para realizar consultas?`
    );

    if (!confirmar) return;

    setLoading(true);
    setAdminUsersMessage("");

    const { data, error } = await supabase.rpc("admin_set_user_status", {
      p_user_id: userId,
      p_status: novoStatus,
      p_reason: motivo.trim() || null,
    });

    if (error || data?.success === false) {
      console.log("Erro ao alterar status da conta:", error || data);
      setAdminUsersMessage(error?.message || data?.message || "Erro ao alterar status da conta.");
      showToast("error", "Erro ao alterar status", "Verifique a migração V38 no Supabase.");
      setLoading(false);
      return;
    }

    showToast(
      "success",
      String(novoStatus).toLowerCase() === "bloqueado" ? "Usuário bloqueado" : "Usuário liberado",
      String(novoStatus).toLowerCase() === "bloqueado" ? "Consultas bloqueadas para esta conta." : "A conta voltou a consultar normalmente."
    );

    await carregarUsuariosAdmin();
    if (userId === session.user.id) await loadProfile(session.user.id);
    setLoading(false);
  }

  async function alterarCreditosUsuario(userId, quantidade) {
    if (loading) return;

    const usuario = adminUsers.find((item) => item.id === userId);

    if (!usuario) return;

    const novosCreditos = Math.max(0, Number(usuario.credits || 0) + quantidade);

    const { error } = await supabase
      .from("profiles")
      .update({ credits: novosCreditos })
      .eq("id", userId);

    if (error) {
      console.log(error);
      setAdminUsersMessage("Erro ao alterar créditos.");
      return;
    }

    setAdminUsersMessage("Créditos atualizados com sucesso.");
    showToast("success", "Créditos atualizados", "Saldo do usuário alterado.");
    await registrarLogAdmin("creditos_alterados", { user_id: userId, quantidade, novos_creditos: novosCreditos });
    carregarUsuariosAdmin();

    if (userId === session.user.id) {
      loadProfile(session.user.id);
    }
  }

  async function ativarIlimitadoUsuario(userId) {
    if (loading) return;

    const hoje = new Date();
    hoje.setDate(hoje.getDate() + 30);

    const { error } = await supabase
      .from("profiles")
      .update({ unlimited_until: hoje.toISOString() })
      .eq("id", userId);

    if (error) {
      console.log(error);
      setAdminUsersMessage("Erro ao ativar plano ilimitado.");
      return;
    }

    setAdminUsersMessage("Plano ilimitado ativado por 30 dias.");
    showToast("success", "Plano ativado", "Plano ilimitado ativado por 30 dias.");
    await registrarLogAdmin("ilimitado_ativado", { user_id: userId });
    carregarUsuariosAdmin();

    if (userId === session.user.id) {
      loadProfile(session.user.id);
    }
  }

  async function cancelarIlimitadoUsuario(userId) {
    if (loading) return;

    const { error } = await supabase
      .from("profiles")
      .update({ unlimited_until: null })
      .eq("id", userId);

    if (error) {
      console.log(error);
      setAdminUsersMessage("Erro ao cancelar plano ilimitado.");
      return;
    }

    setAdminUsersMessage("Plano ilimitado cancelado.");
    showToast("success", "Plano cancelado", "O ilimitado do usuário foi cancelado.");
    await registrarLogAdmin("ilimitado_cancelado", { user_id: userId });
    carregarUsuariosAdmin();

    if (userId === session.user.id) {
      loadProfile(session.user.id);
    }
  }

  async function carregarMinhasOcorrencias() {
    if (!session?.user?.id) return;

    setLoading(true);
    setMyRecordsMessage("");

    const { data, error } = await supabase
      .from("records")
      .select("id, nome, cpf4, cidade, tipos, descricao, imagem_url, status, rejection_reason, created_at, approved_at")
      .eq("created_by", session.user.id)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      console.log("Erro ao carregar minhas ocorrências:", error);
      setMyRecords([]);
      setMyRecordsMessage(
        error.message || "Erro ao carregar suas ocorrências."
      );
      setLoading(false);
      return;
    }

    setMyRecords(data || []);

    if (!data || data.length === 0) {
      setMyRecordsMessage("Você ainda não cadastrou nenhuma ocorrência.");
    }

    setLoading(false);
  }


  async function carregarResumoOcorrenciasUsuario() {
    if (!session?.user?.id) return;

    const { count, error } = await supabase
      .from("records")
      .select("id", { count: "exact", head: true })
      .eq("created_by", session.user.id)
      .eq("status", "pendente");

    if (error) {
      console.log("Erro ao carregar resumo de ocorrências:", error);
      setMyPendingRecordsCount(0);
      return;
    }

    setMyPendingRecordsCount(Number(count || 0));
  }

  async function carregarHistoricoConsultas() {
    if (!session?.user?.id) return;

    setLoading(true);
    setConsultationHistoryMessage("");

    const { data, error } = await supabase
      .from("consultation_logs")
      .select("*")
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      console.log(error);
      setConsultationHistory([]);
      setConsultationHistoryMessage("Erro ao carregar histórico de consultas.");
      setLoading(false);
      return;
    }

    setConsultationHistory(data || []);

    if (!data || data.length === 0) {
      setConsultationHistoryMessage("Nenhuma consulta registrada ainda.");
    }

    setLoading(false);
  }


  async function carregarHistoricoPagamentos() {
    if (!session?.user?.id) return;

    setLoading(true);
    setPaymentsHistoryMessage("");

    const { data, error } = await supabase
      .from("payments")
      .select(
        "id, status, amount, amount_cents, credits, plan_type, pix_code, created_at, paid_at, processed_at"
      )
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      console.log("Erro ao carregar pagamentos:", error);
      setPaymentsHistory([]);
      setPaymentsHistoryMessage(
        error.message || "Erro ao carregar histórico de pagamentos."
      );
      setLoading(false);
      return;
    }

    setPaymentsHistory(data || []);

    if (!data || data.length === 0) {
      setPaymentsHistoryMessage("Nenhum pagamento encontrado.");
    }

    setLoading(false);
  }

  async function carregarDashboardFinanceiro() {
    if (profile?.role !== "admin") return;

    setLoadingFinancialDashboard(true);
    setAdminFinancialMessage("");

    const { data, error } = await supabase.rpc("admin_financial_dashboard");

    if (error) {
      console.log("Erro ao carregar dashboard financeiro:", error);
      setAdminFinancialData(null);
      setAdminFinancialMessage(
        error.message || "Erro ao carregar dashboard financeiro."
      );
      setLoadingFinancialDashboard(false);
      return;
    }

    if (!data?.success) {
      setAdminFinancialData(null);
      setAdminFinancialMessage(
        data?.message || "Não foi possível carregar o dashboard financeiro."
      );
      setLoadingFinancialDashboard(false);
      return;
    }

    setAdminFinancialData(data);
    setLoadingFinancialDashboard(false);
  }

  async function carregarMensagensSuporteAdmin() {
    if (profile?.role !== "admin") return;

    setAdminSupportMessage("");

    const { data, error } = await supabase
      .from("support_messages")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      console.log("Erro ao carregar mensagens de suporte:", error);
      setAdminSupportMessages([]);
      setAdminSupportMessage(
        error.message || "Erro ao carregar mensagens de suporte. Verifique as políticas RLS da tabela support_messages."
      );
      return;
    }

    setAdminSupportMessages(data || []);

    if (!data || data.length === 0) {
      setAdminSupportMessage("Nenhuma mensagem de suporte encontrada.");
    }
  }

  async function atualizarStatusSuporte(id, status) {
    if (loading) return;

    const payload = {
      status,
      resolved_at: status === "resolvido" ? new Date().toISOString() : null,
    };

    const { error } = await supabase
      .from("support_messages")
      .update(payload)
      .eq("id", id);

    if (error) {
      console.log("Erro ao atualizar suporte:", error);
      setAdminSupportMessage(
        error.message || "Erro ao atualizar status da mensagem. Confirme se as colunas status e resolved_at existem."
      );
      return;
    }

    setAdminSupportMessage("Mensagem de suporte atualizada.");
    showToast("success", "Suporte atualizado", "Status da mensagem alterado.");
    await registrarLogAdmin("suporte_atualizado", { support_id: id, status });
    carregarMensagensSuporteAdmin();
  }

  function filtrarOcorrenciasAdmin() {
    const termo = adminRecordSearch.trim().toLowerCase();

    return adminRecords.filter((item) => {
      const statusAtual = String(item.status || "pendente").toLowerCase();
      const statusOk =
        adminRecordFilter === "todos" ? true : statusAtual === adminRecordFilter;

      if (!statusOk) return false;
      if (!termo) return true;

      const campos = [
        item.nome,
        item.cpf_full,
        item.cpf4,
        item.cidade,
        item.status,
        item.whatsapp_locatario,
        item.descricao,
        Array.isArray(item.tipos) ? item.tipos.join(" ") : item.tipos,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return campos.includes(termo);
    });
  }

  async function exportarRelatorio(tipo) {
    if (profile?.role !== "admin") return;

    setAdminExportMessage("Gerando relatório...");

    const configs = {
      pagamentos: {
        tabela: "payments",
        nome: "locacheck-pagamentos.csv",
        colunas: "id,user_id,status,amount,amount_cents,credits,plan_type,created_at,paid_at,processed_at",
        cabecalho: [
          "ID",
          "Usuário",
          "Status",
          "Valor",
          "Valor centavos",
          "Créditos",
          "Plano",
          "Criado em",
          "Pago em",
          "Processado em",
        ],
        map: (item) => [
          item.id,
          item.user_id,
          traduzirStatusPagamento(item.status),
          formatMoneyFromPayment(item),
          item.amount_cents || item.amount || 0,
          item.credits || 0,
          item.plan_type || "",
          item.created_at || "",
          item.paid_at || "",
          item.processed_at || "",
        ],
      },
      consultas: {
        tabela: "consultation_logs",
        nome: "locacheck-consultas.csv",
        colunas: "id,user_id,searched_text,searched_cpf,results_count,credit_charged,used_unlimited,created_at",
        cabecalho: [
          "ID",
          "Usuário",
          "Termo pesquisado",
          "CPF pesquisado",
          "Resultados",
          "Crédito cobrado",
          "Plano ilimitado",
          "Criado em",
        ],
        map: (item) => [
          item.id,
          item.user_id,
          item.searched_text || "",
          item.searched_cpf || "",
          item.results_count || 0,
          item.credit_charged ? "Sim" : "Não",
          item.used_unlimited ? "Sim" : "Não",
          item.created_at || "",
        ],
      },
      usuarios: {
        tabela: "profiles",
        nome: "locacheck-usuarios.csv",
        colunas: "id,nome,whatsapp,role,credits,consultas,unlimited_until,created_at",
        cabecalho: [
          "ID",
          "Nome",
          "WhatsApp",
          "Perfil",
          "Créditos",
          "Consultas",
          "Ilimitado até",
          "Criado em",
        ],
        map: (item) => [
          item.id,
          item.nome || "",
          item.whatsapp || "",
          item.role || "",
          item.credits || 0,
          item.consultas || 0,
          item.unlimited_until || "",
          item.created_at || "",
        ],
      },
      ocorrencias: {
        tabela: "records",
        nome: "locacheck-ocorrencias.csv",
        colunas: "id,nome,cpf_full,cpf4,cidade,whatsapp_locatario,tipos,descricao,status,rejection_reason,created_at,approved_at",
        cabecalho: [
          "ID",
          "Nome",
          "CPF completo",
          "CPF final",
          "Cidade",
          "WhatsApp",
          "Tipos",
          "Descrição",
          "Status",
          "Motivo reprovação",
          "Criado em",
          "Aprovado em",
        ],
        map: (item) => [
          item.id,
          item.nome || "",
          item.cpf_full || "",
          item.cpf4 || "",
          item.cidade || "",
          item.whatsapp_locatario || "",
          Array.isArray(item.tipos) ? item.tipos.join(" | ") : item.tipos || "",
          item.descricao || "",
          item.status || "",
          item.rejection_reason || "",
          item.created_at || "",
          item.approved_at || "",
        ],
      },
    };

    const config = configs[tipo];
    if (!config) return;

    const { data, error } = await supabase
      .from(config.tabela)
      .select(config.colunas)
      .order("created_at", { ascending: false })
      .limit(5000);

    if (error) {
      console.log("Erro ao exportar relatório:", error);
      setAdminExportMessage(
        error.message || "Erro ao exportar relatório. Verifique as permissões RLS."
      );
      return;
    }

    const linhas = [config.cabecalho, ...(data || []).map(config.map)];
    baixarCsv(config.nome, linhas);
    setAdminExportMessage(`Relatório exportado: ${config.nome}`);
  }

  async function carregarNotificacoes() {
    if (!session?.user?.id || !profile) return;

    setNotificationMessage("");

    let ocorrencias = myRecords;

    if (!ocorrencias || ocorrencias.length === 0) {
      const { data, error } = await supabase
        .from("records")
        .select("id, nome, status, rejection_reason, created_at, approved_at")
        .eq("created_by", session.user.id)
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) {
        console.log("Erro ao carregar notificações:", error);
        setNotificationItems([]);
        setNotificationMessage("Erro ao carregar notificações.");
        return;
      }

      ocorrencias = data || [];
    }

    const itens = [];
    const unlimitedActiveNow =
      profile.unlimited_until && new Date(profile.unlimited_until) > new Date();

    if (!unlimitedActiveNow && Number(profile.credits || 0) <= 2) {
      itens.push({
        id: "creditos-baixos",
        title: "Créditos baixos",
        message: `Você possui ${profile.credits || 0} crédito(s). Recarregue para continuar consultando.`,
        status: "pendente",
      });
    }

    if (unlimitedActiveNow) {
      const dias = diasAte(profile.unlimited_until);

      if (dias !== null && dias <= 3) {
        itens.push({
          id: "plano-vencendo",
          title: "Plano ilimitado próximo do vencimento",
          message: dias <= 0
            ? "Seu plano ilimitado vence hoje."
            : `Seu plano ilimitado vence em ${dias} dia(s).`,
          status: "pendente",
        });
      }
    }

    (ocorrencias || []).slice(0, 10).forEach((item) => {
      const status = String(item.status || "pendente").toLowerCase();

      if (status === "aprovado") {
        itens.push({
          id: `ocorrencia-aprovada-${item.id}`,
          title: "Ocorrência aprovada",
          message: `${item.nome || "Uma ocorrência"} já está disponível para consulta.`,
          status: "aprovado",
        });
      }

      if (status === "reprovado") {
        itens.push({
          id: `ocorrencia-reprovada-${item.id}`,
          title: "Ocorrência reprovada",
          message: item.rejection_reason
            ? `${item.nome || "Ocorrência"}: ${item.rejection_reason}`
            : `${item.nome || "Ocorrência"}: verifique os dados enviados e tente novamente.`,
          status: "reprovado",
        });
      }

      if (status === "pendente") {
        itens.push({
          id: `ocorrencia-pendente-${item.id}`,
          title: "Ocorrência em análise",
          message: `${item.nome || "Ocorrência"} ainda está aguardando análise do administrador.`,
          status: "pendente",
        });
      }
    });

    setNotificationItems(itens);

    if (itens.length === 0) {
      setNotificationMessage("Nenhuma notificação importante no momento.");
    }
  }


  const adminExternalLogsFiltered = adminExternalLogs.filter((log) => {
    const typeOk = adminExternalFilterType === "todos" || log.consultation_type === adminExternalFilterType;
    const cacheOk =
      adminExternalFilterCache === "todos" ||
      (adminExternalFilterCache === "sim" && Boolean(log.cache_hit)) ||
      (adminExternalFilterCache === "nao" && !Boolean(log.cache_hit));
    const search = String(adminExternalSearch || "").trim().toLowerCase();
    const userText = `${log.profiles?.nome || ""} ${log.profiles?.email || ""} ${log.user_id || ""}`.toLowerCase();
    const cpfText = `${log.cpf_full || ""} ${log.cpf4 || ""}`.toLowerCase();
    const textOk = !search || userText.includes(search) || cpfText.includes(search);
    return typeOk && cacheOk && textOk;
  });

  const adminActivitySummary = adminActivityData?.summary || {};
  const adminDailyVisits = Array.isArray(adminActivityData?.daily_visits) ? adminActivityData.daily_visits : [];
  const adminActivityConsultations = (Array.isArray(adminActivityData?.consultations)
    ? adminActivityData.consultations
    : []
  ).filter((item) => {
    const typeOk =
      adminActivityType === "todos" ||
      (adminActivityType === "internal" && item.source === "internal" && item.consultation_type !== "internal_included") ||
      (adminActivityType === "internal_included" && item.consultation_type === "internal_included") ||
      (adminActivityType === "external" && item.source === "external");
    const search = String(adminActivitySearch || "").trim().toLowerCase();
    const searchable = `${item.user_name || ""} ${item.user_email || ""} ${item.searched_display || ""}`.toLowerCase();
    return typeOk && (!search || searchable.includes(search));
  });
  const maxDailyVisits = Math.max(1, ...adminDailyVisits.map((item) => Number(item.visits || 0)));

  if (session && !profile) {
    return (
      <div className="page">
        <main className="dashboard">
          <section className="dashboardHero">
            <span>LocaCheck</span>
            <h1>Carregando seu painel...</h1>
            <p>Estamos preparando seus créditos e informações da conta.</p>
          </section>
        </main>
      </div>
    );
  }

  if (session && profile) {
    const unlimitedActive =
      profile.unlimited_until && new Date(profile.unlimited_until) > new Date();

    const normalizarStatus = (status) => String(status || "pendente").toLowerCase();
    const filteredAdminRecords = filtrarOcorrenciasAdmin();
    const adminRecordStats = {
      total: adminRecords.length,
      pendentes: adminRecords.filter((item) => normalizarStatus(item.status) === "pendente").length,
      aprovadas: adminRecords.filter((item) => normalizarStatus(item.status) === "aprovado").length,
      reprovadas: adminRecords.filter((item) => normalizarStatus(item.status) === "reprovado").length,
      comComprovante: adminRecords.filter((item) => Boolean(item.imagem_url)).length,
    };
    const adminUserStats = {
      total: adminUsers.length,
      comuns: adminUsers.filter((user) => String(user.role || "user").toLowerCase() !== "admin").length,
      admins: adminUsers.filter((user) => String(user.role || "").toLowerCase() === "admin").length,
      ilimitados: adminUsers.filter((user) => user.unlimited_until && new Date(user.unlimited_until) > new Date()).length,
      bloqueados: adminUsers.filter((user) => getUserAccountStatus(user) === "bloqueado").length,
      pendentes: adminUsers.filter((user) => getUserAccountStatus(user) === "pendente").length,
      creditos: adminUsers.reduce((total, user) => total + Number(user.credits || 0), 0),
      consultas: adminUsers.reduce((total, user) => total + Number(user.consultas || 0), 0),
    };
    const adminPlanStats = {
      total: adminPlans.length,
      ativos: adminPlans.filter((plan) => plan.active === true).length,
      inativos: adminPlans.filter((plan) => plan.active !== true).length,
      ilimitados: adminPlans.filter((plan) => plan.is_unlimited === true).length,
      creditos: adminPlans.reduce((total, plan) => total + Number(plan.credits || 0), 0),
      ticketMedio: adminPlans.length
        ? Math.round(
            adminPlans.reduce((total, plan) => total + Number(plan.price_cents || 0), 0) /
              adminPlans.length
          )
        : 0,
    };

    return (
      <div className="page">
        {toast && (
          <div className={`toastPopup ${toast.type || "success"}`}>
            <strong>{toast.title}</strong>
            <span>{toast.message}</span>
          </div>
        )}
        <header className="header">
          <div className="brand">
            <div className="logo">LC</div>
            <div>
              <strong>LocaCheck</strong>
              <span>
                {profile.role === "admin"
                  ? "Painel administrador"
                  : "Painel do usuário"}
              </span>
            </div>
          </div>

          <div className="headerUserToolsV37">
            <div className="headerCreditsV37" aria-label="Créditos disponíveis">
              <span>Créditos</span>
              <strong>{profile.credits}</strong>
            </div>

            <button className="btn secondary headerLogoutV36" onClick={sair} aria-label="Sair da conta">
              Sair
            </button>
          </div>
        </header>

        <main className="dashboard">
          <section className="dashboardHero compactHero">
            <span>Painel LocaCheck</span>
            <h1>Olá, {profile.nome || "Usuário"}</h1>
            <p>
              Consulte, registre e acompanhe tudo em um painel rápido e otimizado para celular.
            </p>
          </section>

          <section className="userTopStripV33">
            {myPendingRecordsCount > 0 && (
              <button
                type="button"
                className="topOccurrenceButtonV33 hasSignal"
                onClick={() => {
                  setShowMyRecords(true);
                  carregarMinhasOcorrencias();
                }}
              >
                Ocorrências pendentes
                <span className="topSignalCountV34">{myPendingRecordsCount}</span>
              </button>
            )}

            <button type="button" className="topProfileButtonV33 topProfileButtonV39" onClick={abrirMeusDados}>
              Perfil
            </button>
          </section>

          <section className="dashboardActions dashboardActionsV33">
            <button
              className="btn primary large actionConsult actionConsultFeaturedV33"
              onClick={() => {
                setSearchMessage("");
                setSearchResults([]);
                setSearchText("");
                setConsultationMode("internal");
                setCombinedConsultationStatus(null);
                setShowSearchForm(true);
              }}
            >
              Consultar CPF
              <small>Consulta interna ou externa completa</small>
            </button>

            <button
              className="btn outline large actionRecord"
              onClick={() => {
                setRecordMessage("");
                setShowRecordForm(true);
              }}
            >
              Registrar Ocorrência
            </button>

            <button
              className="btn outline large actionCredits"
              onClick={() => {
                setShowBuyCredits(true);
              }}
            >
              Comprar Créditos
            </button>

            {shouldShowTopNotifications(notificationItems, notificationReadIds) && (
              <button
                className="btn outline large notificationButton actionNotifications"
                onClick={() => {
                  setShowNotifications(true);
                  carregarNotificacoes();
                }}
              >
                Notificações
                <span className="notificationDot" />
              </button>
            )}
          </section>

          {profile.role === "admin" && (
            <section className="adminNavigationPanel" aria-label="Navegação do painel administrativo">
              <div className="adminNavigationIntro">
                <div>
                  <span>Administração</span>
                  <h2>Escolha o que deseja acompanhar</h2>
                  <p>Os itens estão separados por atividade para facilitar o uso no celular e no computador.</p>
                </div>
              </div>

              <div className="adminMenuGroup">
                <strong className="adminMenuGroupTitle">Acompanhamento</strong>
                <div className="adminCategoryMenu">
                  <button
                    type="button"
                    className={adminActiveSection === "resumo" ? "active overviewShortcut" : "overviewShortcut"}
                    onClick={() => setAdminActiveSection("resumo")}
                  >
                    <span>Visão geral</span>
                    <strong>Resumo do que precisa de atenção</strong>
                  </button>

                  <button
                    type="button"
                    className={adminActiveSection === "atividade" ? "active activityShortcut" : "activityShortcut"}
                    onClick={() => {
                      setAdminActiveSection("atividade");
                      carregarAtividadeAdmin();
                    }}
                  >
                    <span>Visitas e consultas</span>
                    <strong>Dia, semana, usuários e buscas</strong>
                  </button>
                </div>
              </div>

              <div className="adminMenuGroup">
                <strong className="adminMenuGroupTitle">Operação</strong>
                <div className="adminCategoryMenu">
                  <button
                    type="button"
                    className={adminActiveSection === "ocorrencias" ? "active recordsShortcut" : "recordsShortcut"}
                    onClick={() => setAdminActiveSection("ocorrencias")}
                  >
                    <span>Ocorrências</span>
                    <strong>Aprovar, editar e revisar registros</strong>
                  </button>

                  <button
                    type="button"
                    className={adminActiveSection === "usuarios" ? "active usersShortcut" : "usersShortcut"}
                    onClick={() => setAdminActiveSection("usuarios")}
                  >
                    <span>Usuários</span>
                    <strong>Contas, créditos e permissões</strong>
                  </button>

                  <button
                    type="button"
                    className={adminActiveSection === "suporte" ? "active supportShortcut" : "supportShortcut"}
                    onClick={() => setAdminActiveSection("suporte")}
                  >
                    <span>Suporte</span>
                    <strong>Mensagens e solicitações recebidas</strong>
                  </button>
                </div>
              </div>

              <div className="adminMenuGroup">
                <strong className="adminMenuGroupTitle">Financeiro e controle</strong>
                <div className="adminCategoryMenu">
                  <button
                    type="button"
                    className={adminActiveSection === "financeiro" ? "active financeShortcut" : "financeShortcut"}
                    onClick={() => setAdminActiveSection("financeiro")}
                  >
                    <span>Financeiro</span>
                    <strong>Receita, PIX e pagamentos</strong>
                  </button>

                  <button
                    type="button"
                    className={adminActiveSection === "planos" ? "active plansShortcut" : "plansShortcut"}
                    onClick={() => setAdminActiveSection("planos")}
                  >
                    <span>Planos</span>
                    <strong>Preços, créditos e ativação</strong>
                  </button>

                  <button
                    type="button"
                    className={adminActiveSection === "relatorios" ? "active reportsShortcut" : "reportsShortcut"}
                    onClick={() => setAdminActiveSection("relatorios")}
                  >
                    <span>Relatórios</span>
                    <strong>Exportações para conferência</strong>
                  </button>

                  <button
                    type="button"
                    className={adminActiveSection === "auditoria" ? "active auditShortcut" : "auditShortcut"}
                    onClick={() => setAdminActiveSection("auditoria")}
                  >
                    <span>Auditoria</span>
                    <strong>Logs e ações administrativas</strong>
                  </button>
                </div>
              </div>
            </section>
          )}

          {profile.role === "admin" && adminActiveSection === "resumo" && (
            <section className="adminPanel adminArea adminOverviewArea" id="admin-resumo">
              <div className="adminHeader">
                <div>
                  <span>Visão geral</span>
                  <h2>Resumo do painel administrativo</h2>
                  <p>Veja rapidamente o movimento do site e os pontos que precisam de atenção.</p>
                </div>

                <button className="btn secondary" onClick={() => carregarAtividadeAdmin()} disabled={loadingAdminActivity}>
                  {loadingAdminActivity ? "Atualizando..." : "Atualizar resumo"}
                </button>
              </div>

              {adminActivityMessage && <div className="authMessage">{adminActivityMessage}</div>}

              <section className="adminMiniDashboard overviewMiniDashboard">
                <button type="button" className="adminStatCard featured clickable" onClick={() => setAdminActiveSection("atividade")}>
                  <small>Visitas hoje</small>
                  <strong>{adminActivitySummary.visits_today || 0}</strong>
                  <span>Acessos contabilizados no dia</span>
                </button>
                <button type="button" className="adminStatCard clickable" onClick={() => setAdminActiveSection("atividade")}>
                  <small>Visitas em 7 dias</small>
                  <strong>{adminActivitySummary.visits_7_days || 0}</strong>
                  <span>Movimento da última semana</span>
                </button>
                <button type="button" className="adminStatCard success clickable" onClick={() => setAdminActiveSection("atividade")}>
                  <small>Consultas hoje</small>
                  <strong>{adminActivitySummary.consultations_today || 0}</strong>
                  <span>Internas e externas</span>
                </button>
                <button type="button" className="adminStatCard clickable" onClick={() => setAdminActiveSection("atividade")}>
                  <small>Consultas em 7 dias</small>
                  <strong>{adminActivitySummary.consultations_7_days || 0}</strong>
                  <span>Atividade da semana</span>
                </button>
                <button type="button" className="adminStatCard warning clickable" onClick={() => setAdminActiveSection("ocorrencias")}>
                  <small>Ocorrências pendentes</small>
                  <strong>{adminRecordStats.pendentes}</strong>
                  <span>Aguardando sua análise</span>
                </button>
                <button type="button" className="adminStatCard clickable" onClick={() => setAdminActiveSection("usuarios")}>
                  <small>Usuários cadastrados</small>
                  <strong>{adminUserStats.total}</strong>
                  <span>Contas na plataforma</span>
                </button>
              </section>

              <div className="adminQuickActions">
                <button className="btn primary" type="button" onClick={() => setAdminActiveSection("ocorrencias")}>Analisar ocorrências</button>
                <button className="btn outline" type="button" onClick={() => setAdminActiveSection("atividade")}>Ver visitas e consultas</button>
                <button className="btn outline" type="button" onClick={() => setAdminActiveSection("suporte")}>Abrir suporte</button>
                <button className="btn outline" type="button" onClick={() => setAdminActiveSection("financeiro")}>Abrir financeiro</button>
              </div>
            </section>
          )}

          {profile.role === "admin" && adminActiveSection === "atividade" && (
            <section className="adminPanel adminArea activityArea" id="admin-atividade">
              <div className="adminHeader">
                <div>
                  <span>Visitas e consultas</span>
                  <h2>Atividade do site</h2>
                  <p>Confira quantas visitas ocorreram e qual usuário realizou cada consulta.</p>
                </div>

                <button className="btn secondary" onClick={() => carregarAtividadeAdmin()} disabled={loadingAdminActivity}>
                  {loadingAdminActivity ? "Atualizando..." : "Atualizar atividade"}
                </button>
              </div>

              {adminActivityMessage && <div className="authMessage">{adminActivityMessage}</div>}

              <div className="adminFilters activityFilters">
                <select
                  value={adminActivityPeriod}
                  onChange={(e) => {
                    const value = e.target.value;
                    setAdminActivityPeriod(value);
                    carregarAtividadeAdmin(value);
                  }}
                >
                  <option value="1">Hoje</option>
                  <option value="7">Últimos 7 dias</option>
                  <option value="30">Últimos 30 dias</option>
                  <option value="90">Últimos 90 dias</option>
                </select>
                <select value={adminActivityType} onChange={(e) => setAdminActivityType(e.target.value)}>
                  <option value="todos">Todas as consultas</option>
                  <option value="internal">Somente internas</option>
                  <option value="internal_included">Internas incluídas na externa</option>
                  <option value="external">Somente externas</option>
                </select>
                <input
                  type="text"
                  placeholder="Buscar usuário, e-mail ou CPF"
                  value={adminActivitySearch}
                  onChange={(e) => setAdminActivitySearch(e.target.value)}
                />
              </div>

              <section className="adminMiniDashboard activityMiniDashboard">
                <div className="adminStatCard featured">
                  <small>Visitas hoje</small>
                  <strong>{adminActivitySummary.visits_today || 0}</strong>
                  <span>Uma sessão por dia</span>
                </div>
                <div className="adminStatCard">
                  <small>Visitas em 7 dias</small>
                  <strong>{adminActivitySummary.visits_7_days || 0}</strong>
                  <span>Última semana</span>
                </div>
                <div className="adminStatCard success">
                  <small>Consultas no período</small>
                  <strong>{adminActivitySummary.consultations_period || 0}</strong>
                  <span>Internas e externas</span>
                </div>
                <div className="adminStatCard">
                  <small>Consultas internas</small>
                  <strong>{adminActivitySummary.internal_period || 0}</strong>
                  <span>Inclui buscas combinadas</span>
                </div>
                <div className="adminStatCard">
                  <small>Consultas externas</small>
                  <strong>{adminActivitySummary.external_period || 0}</strong>
                  <span>Fonte externa integrada</span>
                </div>
                <div className="adminStatCard">
                  <small>Usuários ativos</small>
                  <strong>{adminActivitySummary.active_users_period || 0}</strong>
                  <span>Realizaram consulta</span>
                </div>
              </section>

              <div className="adminActivityLayout">
                <section className="adminVisitsChart" aria-label="Visitas por dia">
                  <div className="adminSubHeader">
                    <div>
                      <h3>Visitas por dia</h3>
                      <p>Cada barra representa as sessões contabilizadas naquele dia.</p>
                    </div>
                  </div>
                  <div className="visitBars">
                    {adminDailyVisits.length === 0 && <div className="adminEmpty">Nenhuma visita contabilizada no período.</div>}
                    {adminDailyVisits.map((day) => (
                      <div className="visitBarRow" key={day.date}>
                        <span>{new Date(`${day.date}T12:00:00`).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}</span>
                        <div className="visitBarTrack">
                          <div className="visitBarFill" style={{ width: `${Math.max(4, (Number(day.visits || 0) / maxDailyVisits) * 100)}%` }} />
                        </div>
                        <strong>{day.visits || 0}</strong>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="adminConsultationsList">
                  <div className="adminSubHeader">
                    <div>
                      <h3>Consultas realizadas</h3>
                      <p>O CPF completo aparece somente nas consultas externas e apenas para administradores.</p>
                    </div>
                  </div>

                  <div className="adminList compactList">
                    {adminActivityConsultations.length === 0 && (
                      <div className="adminEmpty">Nenhuma consulta encontrada para os filtros selecionados.</div>
                    )}
                    {adminActivityConsultations.map((item) => (
                      <div className="adminRecord consultationAuditCard" key={`${item.source}-${item.id}`}>
                        <div className="adminRecordTop">
                          <h3>{adminConsultationLabel(item.consultation_type, item.source)}</h3>
                          <span className={`statusBadge ${item.status === "error" ? "reprovado" : "aprovado"}`}>
                            {item.status === "error" ? "Erro" : "Concluída"}
                          </span>
                        </div>
                        <p><strong>Usuário:</strong> {item.user_name || "Usuário sem nome"}</p>
                        <p><strong>E-mail:</strong> {item.user_email || "Não informado"}</p>
                        <p><strong>CPF consultado:</strong> {item.searched_display || "Não informado"}</p>
                        <p><strong>Resultados:</strong> {item.results_count || 0}</p>
                        <p><strong>Créditos consumidos:</strong> {item.credits_charged || 0}</p>
                        {item.source === "external" && (
                          <p><strong>Saldo após a consulta:</strong> {item.credits_balance_after === null || item.credits_balance_after === undefined ? "Não registrado" : `${item.credits_balance_after} crédito(s)`}</p>
                        )}
                        {item.source === "external" && <p><strong>Cache:</strong> {item.cache_hit ? "Sim" : "Não"}</p>}
                        <p><strong>Data:</strong> {formatDate(item.created_at)}</p>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            </section>
          )}

          {profile.role === "admin" && adminActiveSection === "financeiro" && (
            <section className="adminPanel adminArea financialArea" id="admin-financeiro">
              <div className="adminHeader">
                <div>
                  <span>Financeiro</span>
                  <h2>Dashboard Financeiro</h2>
                  <p>Acompanhe receita, pagamentos, créditos vendidos e atividade da plataforma.</p>
                </div>

                <button
                  className="btn secondary"
                  onClick={carregarDashboardFinanceiro}
                  disabled={loadingFinancialDashboard}
                >
                  {loadingFinancialDashboard ? "Atualizando..." : "Atualizar financeiro"}
                </button>
              </div>

              {adminFinancialMessage && (
                <div className="authMessage">{adminFinancialMessage}</div>
              )}

              {adminFinancialData && (
                <>
                  <section className="dashboardGrid">
                    <div className="dashboardCard">
                      <small>Receita total</small>
                      <strong>
                        {new Intl.NumberFormat("pt-BR", {
                          style: "currency",
                          currency: "BRL",
                        }).format(Number(adminFinancialData.total_revenue_cents || 0) / 100)}
                      </strong>
                    </div>

                    <div className="dashboardCard">
                      <small>Pagamentos pagos</small>
                      <strong>{adminFinancialData.paid_payments || 0}</strong>
                    </div>

                    <div className="dashboardCard">
                      <small>Pagamentos pendentes</small>
                      <strong>{adminFinancialData.pending_payments || 0}</strong>
                    </div>

                    <div className="dashboardCard">
                      <small>Pagamentos com falha</small>
                      <strong>{adminFinancialData.failed_payments || 0}</strong>
                    </div>

                    <div className="dashboardCard">
                      <small>Créditos vendidos</small>
                      <strong>{adminFinancialData.total_credits_sold || 0}</strong>
                    </div>

                    <div className="dashboardCard">
                      <small>Consultas realizadas</small>
                      <strong>{adminFinancialData.total_consultations || 0}</strong>
                    </div>

                    <div className="dashboardCard">
                      <small>Usuários cadastrados</small>
                      <strong>{adminFinancialData.total_users || 0}</strong>
                    </div>

                    <div className="dashboardCard">
                      <small>Ilimitados ativos</small>
                      <strong>{adminFinancialData.unlimited_users || 0}</strong>
                    </div>
                  </section>

                  <div className="adminHeader" style={{ marginTop: "24px" }}>
                    <div>
                      <span>Financeiro</span>
                      <h2>Últimos pagamentos</h2>
                      <p>Veja os pagamentos mais recentes gerados na plataforma.</p>
                    </div>
                  </div>

                  <div className="adminList">
                    {(!adminFinancialData.recent_payments ||
                      adminFinancialData.recent_payments.length === 0) && (
                      <div className="adminEmpty">Nenhum pagamento encontrado.</div>
                    )}

                    {(showAllRecentPayments ? (adminFinancialData.recent_payments || []) : (adminFinancialData.recent_payments || []).slice(0, 5)).map((payment) => {
                      const amountCents = Number(payment.amount_cents || (Number(payment.amount || 0) >= 100 ? payment.amount : Number(payment.amount || 0) * 100) || 0);
                      const statusLabel = traduzirStatusPagamento(payment.status);
                      const paymentCredits = getPaymentCredits(payment);
                      const paymentPlanName = getPaymentPlanName(payment);
                      const paymentUserName = getPaymentUserName(payment);

                      return (
                        <div className="adminRecord" key={payment.id}>
                          <div className="adminRecordTop">
                            <h3>{paymentPlanName}</h3>
                            <span
                              className={`statusBadge ${
                                payment.status === "paid"
                                  ? "aprovado"
                                  : payment.status === "failed"
                                  ? "reprovado"
                                  : "pendente"
                              }`}
                            >
                              {statusLabel}
                            </span>
                          </div>

                          <p>
                            <strong>Usuário:</strong> {paymentUserName}
                          </p>

                          <p>
                            <strong>Valor:</strong>{" "}
                            {new Intl.NumberFormat("pt-BR", {
                              style: "currency",
                              currency: "BRL",
                            }).format(amountCents / 100)}
                          </p>

                          <p>
                            <strong>Créditos:</strong> {paymentCredits}
                          </p>

                          <p>
                            <strong>Gerado em:</strong>{" "}
                            {payment.created_at
                              ? new Date(payment.created_at).toLocaleString("pt-BR")
                              : "Não informado"}
                          </p>

                          <p>
                            <strong>Pago em:</strong>{" "}
                            {payment.paid_at
                              ? new Date(payment.paid_at).toLocaleString("pt-BR")
                              : "Ainda não pago"}
                          </p>
                        </div>
                      );
                    })}

                    {(adminFinancialData.recent_payments || []).length > 5 && (
                      <button
                        className="btn secondary full"
                        type="button"
                        onClick={() => setShowAllRecentPayments(!showAllRecentPayments)}
                      >
                        {showAllRecentPayments ? "Ver menos" : "Ver mais pagamentos"}
                      </button>
                    )}
                  </div>
                </>
              )}
            </section>
          )}

          {profile.role === "admin" && adminActiveSection === "planos" && (
            <section className="adminPanel adminArea plansArea" id="admin-planos">
              <div className="adminHeader">
                <div>
                  <span>Planos</span>
                  <h2>Gerenciar Planos</h2>
                  <p>Edite preços, quantidade de créditos, plano ilimitado e quais planos aparecem para compra.</p>
                </div>

                <div className="adminButtons">
                  <button
                    className="btn secondary"
                    onClick={carregarPlanosAdmin}
                    disabled={loadingAdminPlans}
                    type="button"
                  >
                    {loadingAdminPlans ? "Atualizando..." : "Atualizar planos"}
                  </button>

                  <button
                    className="btn primary"
                    onClick={criarPlanoAdmin}
                    disabled={loadingAdminPlans}
                    type="button"
                  >
                    Criar plano
                  </button>
                </div>
              </div>

              <section className="adminMiniDashboard plansMiniDashboard" aria-label="Resumo dos planos cadastrados">
                <div className="adminStatCard featured">
                  <small>Total de planos</small>
                  <strong>{adminPlanStats.total}</strong>
                  <span>Cadastrados na tabela plans</span>
                </div>

                <div className="adminStatCard success">
                  <small>Ativos</small>
                  <strong>{adminPlanStats.ativos}</strong>
                  <span>Aparecem na compra</span>
                </div>

                <div className="adminStatCard warning">
                  <small>Inativos</small>
                  <strong>{adminPlanStats.inativos}</strong>
                  <span>Ocultos para usuários</span>
                </div>

                <div className="adminStatCard">
                  <small>Ilimitados</small>
                  <strong>{adminPlanStats.ilimitados}</strong>
                  <span>Planos por período</span>
                </div>

                <div className="adminStatCard">
                  <small>Créditos somados</small>
                  <strong>{adminPlanStats.creditos}</strong>
                  <span>Total dos pacotes com créditos</span>
                </div>

                <div className="adminStatCard">
                  <small>Ticket médio</small>
                  <strong>{formatMoneyCents(adminPlanStats.ticketMedio)}</strong>
                  <span>Média dos preços cadastrados</span>
                </div>
              </section>

              {adminPlansMessage && (
                <div className="authMessage">{adminPlansMessage}</div>
              )}

              {loadingAdminPlans && (
                <div className="adminEmpty">Carregando planos...</div>
              )}

              {!loadingAdminPlans && adminPlans.length === 0 && (
                <div className="adminEmpty">Nenhum plano encontrado. Clique em criar plano para começar.</div>
              )}

              {!loadingAdminPlans && adminPlans.length > 0 && (
                <div className="adminPlanEditorGrid">
                  {adminPlans.map((plano) => {
                    const isSaving = savingAdminPlanId === plano.id;
                    const isUnlimited = plano.is_unlimited === true;

                    return (
                      <div className="adminPlanEditorCard" key={plano.id}>
                        <div className="adminRecordTop">
                          <h3>{plano.name || "Plano sem nome"}</h3>
                          <span className={`statusBadge ${plano.active ? "aprovado" : "pendente"}`}>
                            {plano.active ? "Ativo" : "Inativo"}
                          </span>
                        </div>

                        <div className="adminPlanFormGrid">
                          <label>
                            <span>Nome do plano</span>
                            <input
                              type="text"
                              value={plano.name || ""}
                              onChange={(e) => atualizarPlanoLocal(plano.id, "name", e.target.value)}
                              placeholder="Ex: 50 Créditos"
                            />
                          </label>

                          <label>
                            <span>Preço em R$</span>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={(Number(plano.price_cents || 0) / 100).toFixed(2)}
                              onChange={(e) => atualizarPlanoLocal(plano.id, "price_cents", Math.round(Number(e.target.value || 0) * 100))}
                              placeholder="39.90"
                            />
                          </label>

                          <label>
                            <span>Créditos</span>
                            <input
                              type="number"
                              min="0"
                              value={Number(plano.credits || 0)}
                              onChange={(e) => atualizarPlanoLocal(plano.id, "credits", Number(e.target.value || 0))}
                              disabled={isUnlimited}
                            />
                          </label>

                          <label>
                            <span>Duração em dias</span>
                            <input
                              type="number"
                              min="0"
                              value={Number(plano.duration_days || 0)}
                              onChange={(e) => atualizarPlanoLocal(plano.id, "duration_days", Number(e.target.value || 0))}
                              placeholder="30"
                            />
                          </label>
                        </div>

                        <div className="adminPlanChecks">
                          <label>
                            <input
                              type="checkbox"
                              checked={Boolean(plano.is_unlimited)}
                              onChange={(e) => atualizarPlanoLocal(plano.id, "is_unlimited", e.target.checked)}
                            />
                            Plano ilimitado
                          </label>

                          <label>
                            <input
                              type="checkbox"
                              checked={Boolean(plano.active)}
                              onChange={(e) => atualizarPlanoLocal(plano.id, "active", e.target.checked)}
                            />
                            Visível para compra
                          </label>
                        </div>

                        <div className="adminPlanPreview">
                          <strong>{formatMoneyCents(plano.price_cents)}</strong>
                          <span>
                            {isUnlimited
                              ? `${Number(plano.duration_days || 30)} dias de consultas ilimitadas`
                              : `${Number(plano.credits || 0)} consultas`}
                          </span>
                        </div>

                        <div className="adminButtons">
                          <button
                            className="btn primary"
                            onClick={() => salvarPlanoAdmin(plano)}
                            disabled={isSaving}
                            type="button"
                          >
                            {isSaving ? "Salvando..." : "Salvar plano"}
                          </button>

                          <button
                            className="btn outline"
                            onClick={() => alternarStatusPlano(plano)}
                            disabled={isSaving}
                            type="button"
                          >
                            {plano.active ? "Desativar" : "Ativar"}
                          </button>

                          <button
                            className="btn danger"
                            onClick={() => excluirPlanoAdmin(plano)}
                            disabled={isSaving}
                            type="button"
                          >
                            Excluir
                          </button>
                        </div>

                        <small className="fieldHelp">
                          Planos ativos aparecem automaticamente em Comprar Créditos. Planos inativos ficam ocultos.
                        </small>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          )}

          {profile.role === "admin" && adminActiveSection === "relatorios" && (
            <section className="adminPanel adminArea reportsArea">
              <div className="adminHeader">
                <div>
                  <span>Relatórios</span>
                  <h2>Exportar CSV</h2>
                  <p>Baixe relatórios para abrir no Excel ou Google Planilhas.</p>
                </div>
              </div>

              {adminExportMessage && (
                <div className="authMessage">{adminExportMessage}</div>
              )}

              <div className="adminButtons">
                <button className="btn outline" onClick={() => exportarRelatorio("pagamentos")}>
                  Exportar pagamentos
                </button>
                <button className="btn outline" onClick={() => exportarRelatorio("consultas")}>
                  Exportar consultas
                </button>
                <button className="btn outline" onClick={() => exportarRelatorio("usuarios")}>
                  Exportar usuários
                </button>
                <button className="btn outline" onClick={() => exportarRelatorio("ocorrencias")}>
                  Exportar ocorrências
                </button>
              </div>
            </section>
          )}

          {profile.role === "admin" && adminActiveSection === "usuarios" && (
            <section className="adminPanel adminArea usersArea" id="admin-usuarios">
              <div className="adminHeader">
                <div>
                  <span>Usuários</span>
                  <h2>Dashboard de Usuários</h2>
                  <p>Veja o resumo das contas cadastradas antes de gerenciar créditos e planos.</p>
                </div>

                <button className="btn secondary" onClick={carregarUsuariosAdmin}>
                  Atualizar usuários
                </button>
              </div>

              <section className="adminMiniDashboard usersMiniDashboard" aria-label="Resumo dos usuários cadastrados">
                <div className="adminStatCard featured">
                  <small>Total de usuários</small>
                  <strong>{adminUserStats.total}</strong>
                  <span>Contas cadastradas</span>
                </div>

                <div className="adminStatCard">
                  <small>Usuários comuns</small>
                  <strong>{adminUserStats.comuns}</strong>
                  <span>Clientes e locadoras</span>
                </div>

                <div className="adminStatCard">
                  <small>Administradores</small>
                  <strong>{adminUserStats.admins}</strong>
                  <span>Acessos internos</span>
                </div>

                <div className="adminStatCard success">
                  <small>Ilimitados ativos</small>
                  <strong>{adminUserStats.ilimitados}</strong>
                  <span>Planos em vigor</span>
                </div>

                <div className="adminStatCard dangerSoft">
                  <small>Contas bloqueadas</small>
                  <strong>{adminUserStats.bloqueados}</strong>
                  <span>Usuários sem acesso a consultas</span>
                </div>

                <div className="adminStatCard">
                  <small>Créditos em contas</small>
                  <strong>{adminUserStats.creditos}</strong>
                  <span>Saldo total disponível</span>
                </div>

                <div className="adminStatCard">
                  <small>Consultas dos usuários</small>
                  <strong>{adminUserStats.consultas}</strong>
                  <span>Total registrado nos perfis</span>
                </div>
              </section>

              <div className="adminSubHeader">
                <div>
                  <h3>Lista de usuários</h3>
                  <p>Gerencie saldo, créditos e plano ilimitado de cada conta.</p>
                </div>
              </div>

              {adminUsersMessage && (
                <div className="authMessage">{adminUsersMessage}</div>
              )}

              <div className="adminList">
                {adminUsers.length === 0 && (
                  <div className="adminEmpty">Nenhum usuário encontrado.</div>
                )}

                {adminUsers.map((user) => {
                  const userUnlimitedActive =
                    user.unlimited_until &&
                    new Date(user.unlimited_until) > new Date();

                  return (
                    <div className="adminRecord" key={user.id}>
                      <div className="adminRecordTop">
                        <h3>{user.nome || "Usuário"}</h3>
                        <div className="adminUserBadges">
                          <span
                            className={`statusBadge ${
                              user.role === "admin" ? "aprovado" : "pendente"
                            }`}
                          >
                            {user.role}
                          </span>
                          <span className={`statusBadge ${getUserAccountStatus(user) === "bloqueado" ? "reprovado" : "aprovado"}`}>
                            {getUserAccountStatus(user) === "bloqueado" ? "Bloqueado" : "Ativo"}
                          </span>
                        </div>
                      </div>

                      <p>
                        <strong>E-mail:</strong>{" "}
                        {user.email || "Não informado"}
                      </p>

                      {getUserAccountStatus(user) === "bloqueado" && (
                        <p className="securityWarningInline">
                          <strong>Motivo do bloqueio:</strong> {user.blocked_reason || "Não informado"}
                        </p>
                      )}

                      <p>
                        <strong>WhatsApp:</strong>{" "}
                        {user.whatsapp || "Não informado"}
                      </p>

                      <p>
                        <strong>Créditos:</strong> {user.credits}
                      </p>

                      <p>
                        <strong>Consultas:</strong> {user.consultas}
                      </p>

                      <p>
                        <strong>Plano ilimitado:</strong>{" "}
                        {userUnlimitedActive
                          ? `Ativo até ${new Date(
                              user.unlimited_until
                            ).toLocaleDateString("pt-BR")}`
                          : "Inativo"}
                      </p>

                      <div className="adminButtons">
                        <button
                          className="btn primary"
                          onClick={() => alterarCreditosUsuario(user.id, 10)}
                        >
                          +10 créditos
                        </button>

                        <button
                          className="btn outline"
                          onClick={() => alterarCreditosUsuario(user.id, -10)}
                        >
                          -10 créditos
                        </button>

                        <button
                          className="btn primary"
                          onClick={() => ativarIlimitadoUsuario(user.id)}
                        >
                          Ativar ilimitado 30 dias
                        </button>

                        <button
                          className="btn danger"
                          onClick={() => cancelarIlimitadoUsuario(user.id)}
                        >
                          Cancelar ilimitado
                        </button>

                        {String(user.role || "user").toLowerCase() === "admin" ? (
                          <button
                            className="btn outline"
                            onClick={() => alterarRoleUsuario(user.id, "user")}
                            disabled={user.id === session.user.id || loading}
                            title={user.id === session.user.id ? "Você não pode remover seu próprio admin pelo painel" : "Remover acesso admin"}
                          >
                            Tornar usuário comum
                          </button>
                        ) : (
                          <button
                            className="btn primary"
                            onClick={() => alterarRoleUsuario(user.id, "admin")}
                            disabled={loading}
                          >
                            Tornar admin
                          </button>
                        )}

                        {getUserAccountStatus(user) === "bloqueado" ? (
                          <button
                            className="btn primary"
                            onClick={() => alterarStatusContaUsuario(user.id, "ativo")}
                            disabled={loading}
                          >
                            Liberar usuário
                          </button>
                        ) : (
                          <button
                            className="btn danger"
                            onClick={() => alterarStatusContaUsuario(user.id, "bloqueado")}
                            disabled={user.id === session.user.id || loading}
                          >
                            Bloquear usuário
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {profile.role === "admin" && adminActiveSection === "suporte" && (
            <section className="adminPanel adminArea supportArea">
              <div className="adminHeader">
                <div>
                  <span>Suporte</span>
                  <h2>Mensagens recebidas</h2>
                  <p>Veja as mensagens enviadas pelos usuários pela tela de suporte.</p>
                </div>

                <button
                  className="btn secondary"
                  onClick={carregarMensagensSuporteAdmin}
                >
                  Atualizar suporte
                </button>
              </div>

              <div className="adminButtons" style={{ marginBottom: "16px" }}>
                <button
                  className={adminSupportFilter === "todos" ? "btn primary" : "btn outline"}
                  onClick={() => setAdminSupportFilter("todos")}
                >
                  Todas
                </button>

                <button
                  className={adminSupportFilter === "aberto" ? "btn primary" : "btn outline"}
                  onClick={() => setAdminSupportFilter("aberto")}
                >
                  Abertas
                </button>

                <button
                  className={adminSupportFilter === "resolvido" ? "btn primary" : "btn outline"}
                  onClick={() => setAdminSupportFilter("resolvido")}
                >
                  Resolvidas
                </button>
              </div>

              {adminSupportMessage && (
                <div className="authMessage">{adminSupportMessage}</div>
              )}

              <div className="adminList">
                {adminSupportMessages.filter((item) => {
                  if (adminSupportFilter === "todos") return true;
                  const status = String(item.status || "aberto").toLowerCase();
                  return status === adminSupportFilter;
                }).length === 0 && (
                  <div className="adminEmpty">Nenhuma mensagem para este filtro.</div>
                )}

                {adminSupportMessages
                  .filter((item) => {
                    if (adminSupportFilter === "todos") return true;
                    const status = String(item.status || "aberto").toLowerCase();
                    return status === adminSupportFilter;
                  })
                  .map((item) => {
                    const status = String(item.status || "aberto").toLowerCase();
                    const statusClass = status === "resolvido" ? "aprovado" : "pendente";
                    const nomeSuporte =
                      item.nome || item.name || item.user_name || item.nome_empresa || "Usuário";
                    const whatsappSuporte =
                      item.whatsapp || item.telefone || item.phone || "Não informado";
                    const emailSuporte =
                      item.email || item.user_email || "Não informado";
                    const assuntoSuporte =
                      item.assunto || item.subject || item.tipo || "Mensagem de suporte";
                    const textoSuporte =
                      item.mensagem || item.message || item.texto || item.content || item.descricao || "Mensagem não informada";

                    return (
                      <div className="adminRecord" key={item.id}>
                        <div className="adminRecordTop">
                          <h3>{assuntoSuporte}</h3>
                          <span className={`statusBadge ${statusClass}`}>
                            {status === "resolvido" ? "Resolvida" : "Aberta"}
                          </span>
                        </div>

                        <p>
                          <strong>Usuário:</strong> {nomeSuporte}
                        </p>

                        <p>
                          <strong>E-mail:</strong> {emailSuporte}
                        </p>

                        <p>
                          <strong>WhatsApp:</strong> {whatsappSuporte}
                        </p>

                        <p>
                          <strong>Mensagem:</strong> {textoSuporte}
                        </p>

                        <p>
                          <strong>Enviada em:</strong>{" "}
                          {item.created_at
                            ? new Date(item.created_at).toLocaleString("pt-BR")
                            : "Não informado"}
                        </p>

                        {item.resolved_at && (
                          <p>
                            <strong>Resolvida em:</strong>{" "}
                            {new Date(item.resolved_at).toLocaleString("pt-BR")}
                          </p>
                        )}

                        <div className="adminButtons">
                          <button
                            className="btn primary"
                            onClick={() => atualizarStatusSuporte(item.id, "resolvido")}
                          >
                            Marcar resolvida
                          </button>

                          <button
                            className="btn outline"
                            onClick={() => atualizarStatusSuporte(item.id, "aberto")}
                          >
                            Reabrir
                          </button>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </section>
          )}

          {profile.role === "admin" && adminActiveSection === "auditoria" && (
            <section className="adminPanel adminArea auditArea">
              <div className="adminHeader">
                <div>
                  <span>Auditoria</span>
                  <h2>Logs do Sistema</h2>
                  <p>Acompanhe ações administrativas importantes realizadas na plataforma.</p>
                </div>

                <button className="btn secondary" onClick={carregarLogsSistema}>
                  Atualizar logs
                </button>
              </div>

              {activityLogsMessage && (
                <div className="authMessage">{activityLogsMessage}</div>
              )}

              <div className="adminList compactList">
                {activityLogs.length === 0 && (
                  <div className="adminEmpty">Nenhum log encontrado.</div>
                )}

                {activityLogs.map((log) => (
                  <div className="adminRecord" key={log.id}>
                    <div className="adminRecordTop">
                      <h3>{log.action}</h3>
                      <span className="statusBadge aprovado">Log</span>
                    </div>

                    <p>
                      <strong>Data:</strong>{" "}
                      {log.created_at ? new Date(log.created_at).toLocaleString("pt-BR") : "Não informado"}
                    </p>

                    <p>
                      <strong>Admin:</strong> {log.user_id || "Não informado"}
                    </p>

                    <p>
                      <strong>Detalhes:</strong>{" "}
                      {log.details ? JSON.stringify(log.details) : "Sem detalhes"}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {profile.role === "admin" && adminActiveSection === "consulta_externa" && (
            <section className="adminPanel adminArea externalArea" id="admin-consulta-externa">
              <div className="adminHeader">
                <div>
                  <span>Consulta Externa</span>
                  <h2>Histórico BigDataCorp</h2>
                  <p>Acompanhe consultas externas, créditos descontados, uso de cache e status da integração.</p>
                </div>

                <button className="btn secondary" onClick={carregarConsultasExternasAdmin}>
                  Atualizar externas
                </button>
              </div>

              {adminExternalLogsMessage && <div className="authMessage">{adminExternalLogsMessage}</div>}

              <section className="adminMiniDashboard">
                <div className="adminStatCard featured">
                  <small>Total externo listado</small>
                  <strong>{adminExternalLogsFiltered.length}</strong>
                  <span>Registros filtrados</span>
                </div>
                <div className="adminStatCard success">
                  <small>Com cache</small>
                  <strong>{adminExternalLogsFiltered.filter((log) => log.cache_hit).length}</strong>
                  <span>Economia de chamadas externas</span>
                </div>
                <div className="adminStatCard">
                  <small>Créditos consumidos</small>
                  <strong>{adminExternalLogsFiltered.reduce((total, log) => total + Number(log.credits_charged || 0), 0)}</strong>
                  <span>No período listado</span>
                </div>
                <div className="adminStatCard danger">
                  <small>Erros</small>
                  <strong>{adminExternalLogsFiltered.filter((log) => log.status === "error").length}</strong>
                  <span>Falhas de consulta externa</span>
                </div>
              </section>

              <div className="adminFilters externalFilters">
                <input
                  type="text"
                  placeholder="Buscar por usuário, e-mail ou CPF"
                  value={adminExternalSearch}
                  onChange={(e) => setAdminExternalSearch(e.target.value)}
                />
                <select value={adminExternalFilterType} onChange={(e) => setAdminExternalFilterType(e.target.value)}>
                  <option value="todos">Todos os tipos</option>
                  <option value="external_complete">Externa completa</option>
                  <option value="external_advanced">Externa avançada</option>
                </select>
                <select value={adminExternalFilterCache} onChange={(e) => setAdminExternalFilterCache(e.target.value)}>
                  <option value="todos">Cache: todos</option>
                  <option value="sim">Com cache</option>
                  <option value="nao">Sem cache</option>
                </select>
              </div>

              <div className="adminList">
                {adminExternalLogsFiltered.length === 0 && (
                  <div className="adminEmpty">Nenhuma consulta externa encontrada para os filtros selecionados.</div>
                )}

                {adminExternalLogsFiltered.map((log) => (
                  <div className="adminRecord" key={log.id}>
                    <div className="adminRecordTop">
                      <h3>Consulta Externa</h3>
                      <span className={`statusBadge ${log.status === "success" ? "aprovado" : "reprovado"}`}>
                        {log.status}
                      </span>
                    </div>

                    <p><strong>Usuário:</strong> {log.profiles?.nome || log.profiles?.email || log.user_id}</p>
                    <p>
                      <strong>CPF consultado:</strong>{" "}
                      {log.cpf_full ? formatCpfInput(log.cpf_full) : log.cpf4 ? `CPF final ${log.cpf4}` : "Não informado"}
                    </p>
                    <p><strong>Créditos consumidos:</strong> {log.credits_charged || 0}</p>
                    <p><strong>Saldo após a consulta:</strong> {log.credits_balance_after === null || log.credits_balance_after === undefined ? "Não registrado" : `${log.credits_balance_after} crédito(s)`}</p>
                    <p><strong>Cache:</strong> {log.cache_hit ? "Sim" : "Não"}</p>
                    <p><strong>Dados consultados:</strong> {externalDatasetsText(log.datasets)}</p>
                    <p><strong>Data:</strong> {formatDate(log.created_at)}</p>
                    {log.error_message && <p><strong>Erro:</strong> {log.error_message}</p>}
                  </div>
                ))}
              </div>
            </section>
          )}

          {profile.role === "admin" && adminActiveSection === "ocorrencias" && (
            <section className="adminPanel adminArea recordsArea" id="admin-ocorrencias">
              <div className="adminHeader">
                <div>
                  <span>Ocorrências</span>
                  <h2>Dashboard de Ocorrências</h2>
                  <p>Acompanhe o volume de registros e separe rapidamente o que precisa de análise.</p>
                </div>

                <button
                  className="btn secondary"
                  onClick={carregarOcorrenciasAdmin}
                >
                  Atualizar ocorrências
                </button>
              </div>

              <section className="adminMiniDashboard recordsMiniDashboard" aria-label="Resumo das ocorrências cadastradas">
                <div className="adminStatCard featured">
                  <small>Total de ocorrências</small>
                  <strong>{adminRecordStats.total}</strong>
                  <span>Registros recebidos</span>
                </div>

                <div className="adminStatCard warning">
                  <small>Pendentes</small>
                  <strong>{adminRecordStats.pendentes}</strong>
                  <span>Aguardando análise</span>
                </div>

                <div className="adminStatCard success">
                  <small>Aprovadas</small>
                  <strong>{adminRecordStats.aprovadas}</strong>
                  <span>Visíveis nas consultas</span>
                </div>

                <div className="adminStatCard danger">
                  <small>Reprovadas</small>
                  <strong>{adminRecordStats.reprovadas}</strong>
                  <span>Fora das consultas</span>
                </div>

                <div className="adminStatCard">
                  <small>Com comprovante</small>
                  <strong>{adminRecordStats.comComprovante}</strong>
                  <span>Arquivos anexados</span>
                </div>

                <div className="adminStatCard">
                  <small>Resultado do filtro</small>
                  <strong>{filteredAdminRecords.length}</strong>
                  <span>Itens listados abaixo</span>
                </div>
              </section>

              <div className="adminSubHeader withFilters">
                <div>
                  <h3>Lista de ocorrências</h3>
                  <p>Use a busca e os filtros para aprovar, reprovar, editar ou excluir registros.</p>
                </div>

                <div className="adminButtons">
                  <input
                    type="text"
                    className="selectInput"
                    placeholder="Buscar por nome, CPF, cidade, tipo ou status"
                    value={adminRecordSearch}
                    onChange={(e) => setAdminRecordSearch(e.target.value)}
                  />

                  <select
                    className="selectInput"
                    value={adminRecordFilter}
                    onChange={(e) => setAdminRecordFilter(e.target.value)}
                  >
                    <option value="todos">Todas</option>
                    <option value="pendente">Pendentes</option>
                    <option value="aprovado">Aprovadas</option>
                    <option value="reprovado">Reprovadas</option>
                  </select>
                </div>
              </div>

              {adminMessage && <div className="authMessage">{adminMessage}</div>}

              <div className="adminList">
                {filteredAdminRecords.length === 0 && (
                  <div className="adminEmpty">
                    Nenhuma ocorrência encontrada para este filtro.
                  </div>
                )}

                {filteredAdminRecords.map((item) => (
                  <div className="adminRecord" key={item.id}>
                    <div className="adminRecordTop">
                      <h3>{item.nome}</h3>
                      <span className={`statusBadge ${item.status}`}>
                        {item.status}
                      </span>
                    </div>

                    <p>
                      <strong>CPF completo:</strong>{" "}
                      {item.cpf_full || "Não informado"}
                    </p>

                    <p>
                      <strong>CPF final:</strong> {item.cpf4}
                    </p>

                    <p>
                      <strong>WhatsApp:</strong>{" "}
                      {item.whatsapp_locatario || "Não informado"}
                    </p>

                    <p>
                      <strong>Cidade/UF:</strong>{" "}
                      {item.cidade || "Não informado"}
                    </p>

                    <p>
                      <strong>Tipos:</strong> {item.tipos?.join(", ")}
                    </p>

                    <p>
                      <strong>Descrição:</strong> {item.descricao}
                    </p>

                    {item.status === "reprovado" && item.rejection_reason && (
                      <p>
                        <strong>Motivo da reprovação:</strong> {item.rejection_reason}
                      </p>
                    )}

                    {item.imagem_url && (
                      <div className="imagePreviewBox">
                        <strong>Documento/comprovante:</strong>
                        <a href={item.imagem_url} target="_blank" rel="noreferrer">
                          {getDocumentoLabel(item.imagem_url)}
                        </a>
                        {isImageUrl(item.imagem_url) && (
                          <img src={item.imagem_url} alt="Documento/comprovante" />
                        )}
                      </div>
                    )}

                    <div className="adminButtons">
                      <button
                        className="btn outline"
                        onClick={() => abrirEdicaoOcorrencia(item)}
                      >
                        Editar
                      </button>

                      <button
                        className="btn primary"
                        onClick={() =>
                          atualizarStatusOcorrencia(item.id, "aprovado")
                        }
                      >
                        Aprovar
                      </button>

                      <button
                        className="btn outline"
                        onClick={() =>
                          atualizarStatusOcorrencia(item.id, "reprovado")
                        }
                      >
                        Reprovar
                      </button>

                      <button
                        className="btn danger"
                        onClick={() => excluirOcorrencia(item.id)}
                      >
                        Excluir
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </main>

        <nav className={`mobileBottomNav ${profile.role === "admin" ? "adminMobileNav" : ""}`} aria-label="Navegação rápida">
          {profile.role === "admin" ? (
            <>
              <button
                type="button"
                className={adminActiveSection === "resumo" ? "active" : ""}
                onClick={() => setAdminActiveSection("resumo")}
              >
                <span>⌂</span>
                Resumo
              </button>

              <button
                type="button"
                className={adminActiveSection === "atividade" ? "active" : ""}
                onClick={() => {
                  setAdminActiveSection("atividade");
                  carregarAtividadeAdmin();
                }}
              >
                <span>▥</span>
                Atividade
              </button>

              <button
                type="button"
                className={adminActiveSection === "ocorrencias" ? "active" : ""}
                onClick={() => setAdminActiveSection("ocorrencias")}
              >
                <span>!</span>
                Ocorrências
              </button>

              <button
                type="button"
                className={adminActiveSection === "usuarios" ? "active" : ""}
                onClick={() => setAdminActiveSection("usuarios")}
              >
                <span>◎</span>
                Usuários
              </button>

              <button
                type="button"
                className={adminActiveSection === "financeiro" ? "active" : ""}
                onClick={() => setAdminActiveSection("financeiro")}
              >
                <span>R$</span>
                Financeiro
              </button>
            </>
          ) : (
            <>
              <button type="button" className="active" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
                <span>⌂</span>
                Início
              </button>

              <button type="button" onClick={() => {
                setSearchMessage("");
                setSearchResults([]);
                setSearchText("");
                setConsultationMode("internal");
                setCombinedConsultationStatus(null);
                setShowSearchForm(true);
              }}>
                <span>⌕</span>
                Consultar
              </button>

              <button type="button" onClick={() => {
                setRecordMessage("");
                setShowRecordForm(true);
              }}>
                <span>＋</span>
                Registrar
              </button>

              <button type="button" onClick={abrirMeusDados}>
                <span>◎</span>
                Perfil
              </button>
            </>
          )}
        </nav>
{showExternalConsultationHistory && (
  <div className="modalOverlay">
    <div className="recordModal externalHistoryModal">
      <button
        className="closeModal"
        onClick={() => setShowExternalConsultationHistory(false)}
      >
        ×
      </button>

      <h2>Consultas Externas</h2>
      <p>Acompanhe suas consultas realizadas em fonte externa e os créditos descontados.</p>

      <div className="modalActionsRow">
        <button className="btn secondary" type="button" onClick={carregarMinhasConsultasExternas}>
          Atualizar
        </button>
      </div>

      {externalConsultationHistoryMessage && (
        <div className="authMessage">{externalConsultationHistoryMessage}</div>
      )}

      {externalConsultationHistory.length > 0 && (
        <div className="resultsBox">
          {externalConsultationHistory.map((item) => (
            <div className="resultCard externalHistoryCard" key={item.id}>
              <div className="adminRecordTop">
                <h3>{externalConsultationLabel(item.consultation_type)}</h3>
                <span className="statusBadge aprovado">
                  Concluída
                </span>
              </div>
              <p><strong>CPF final:</strong> {item.cpf4 || "----"}</p>
              <p><strong>Créditos descontados:</strong> {item.credits_charged || 0}</p>
              <p><strong>Dados consultados:</strong> {externalDatasetsText(item.datasets)}</p>
              <p><strong>Data:</strong> {formatDate(item.created_at)}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  </div>
)}

{showBuyCredits && (
  <BuyCreditsModal onClose={() => setShowBuyCredits(false)} />
)}

{showSupport && (
  <SupportModal
    session={session}
    onClose={() => setShowSupport(false)}
  />
)}

{showNotifications && (
  <div className="modalOverlay">
    <div className="recordModal">
      <button
        className="closeModal"
        onClick={() => setShowNotifications(false)}
      >
        ×
      </button>

      <h2>Notificações</h2>

      <p>Veja avisos importantes sobre créditos, plano e ocorrências cadastradas.</p>

      <div className="modalActionsRow">
        <button
          className="btn secondary"
          onClick={carregarNotificacoes}
          disabled={loading}
          type="button"
        >
          Atualizar
        </button>

        <button
          className="btn primary"
          onClick={marcarNotificacoesComoLidas}
          disabled={notificationItems.length === 0}
          type="button"
        >
          Marcar como lidas
        </button>
      </div>

      {notificationMessage && (
        <div className="authMessage">{notificationMessage}</div>
      )}

      {notificationItems.length > 0 && (
        <div className="resultsBox">
          {notificationItems.map((item) => (
            <div className={`resultCard ${notificacaoNaoLida(item) ? "unreadNotification" : ""}`} key={item.id}>
              <div className="adminRecordTop">
                <h3>{item.title}</h3>
                <span className={`statusBadge ${item.status}`}>
                  {notificacaoNaoLida(item) ? "Nova" : item.status}
                </span>
              </div>

              <p>{item.message}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  </div>
)}


{showProfileData && (
  <div className="modalOverlay">
    <div className="recordModal">
      <button
        className="closeModal"
        onClick={() => setShowProfileData(false)}
      >
        ×
      </button>

      <h2>Perfil</h2>

      <p>Gerencie seus dados, ocorrências, pagamentos, consultas, suporte e termos em um só lugar.</p>

      <div className="profileMenuGridV33">
        <button className="btn outline" type="button" onClick={() => { setShowMyRecords(true); carregarMinhasOcorrencias(); }}>Minhas Ocorrências</button>
        <button className="btn outline" type="button" onClick={() => { setShowConsultationHistory(true); carregarHistoricoConsultas(); }}>Minhas Consultas</button>
        <button className="btn outline" type="button" onClick={() => { setShowExternalConsultationHistory(true); carregarMinhasConsultasExternas(); }}>Consultas Externas</button>
        <button className="btn outline" type="button" onClick={() => { setShowPaymentsHistory(true); carregarHistoricoPagamentos(); }}>Meus Pagamentos</button>
        <button className="btn outline" type="button" onClick={() => { setShowNotifications(true); carregarNotificacoes(); }}>Notificações</button>
        <button className="btn outline" type="button" onClick={() => setShowSupport(true)}>Suporte</button>
        <button className="btn outline" type="button" onClick={() => setShowTermsPrivacy(true)}>Termos e Privacidade</button>
      </div>

      <h3>Meus Dados</h3>
      <p>Atualize seus dados de contato da conta LocaCheck.</p>

      <form onSubmit={salvarMeusDados} className="recordForm">
        <input
          type="text"
          placeholder="Nome ou empresa"
          value={profileNome}
          onChange={(e) => setProfileNome(e.target.value)}
          required
        />

        <input
          type="tel"
          inputMode="numeric"
          placeholder="WhatsApp com DDD"
          value={profileWhatsapp}
          onChange={(e) => setProfileWhatsapp(formatWhatsappInput(e.target.value))}
          maxLength={15}
          required
        />

        <small className="fieldHelp">Use DDD + número. Exemplo: (88) 99999-9999.</small>

        <input
          type="email"
          placeholder="E-mail de acesso"
          value={profileEmail}
          onChange={(e) => setProfileEmail(e.target.value)}
          onBlur={() => setProfileEmail(normalizeEmail(profileEmail))}
          autoComplete="email"
          required
        />

        <input
          type="password"
          placeholder="Nova senha (opcional)"
          value={profileNewPassword}
          onChange={(e) => setProfileNewPassword(e.target.value)}
        />

        <small className="fieldHelp">
          Ao alterar o e-mail, o Supabase pode solicitar confirmação pelo novo endereço.
        </small>

        <button className="btn primary full" disabled={loading}>
          {loading ? "Salvando..." : "Salvar dados"}
        </button>
      </form>

      {profileMessage && (
        <div className="authMessage">{profileMessage}</div>
      )}
    </div>
  </div>
)}

{showTermsPrivacy && (
  <div className="modalOverlay">
    <div className="recordModal legalTermsModal">
      <button
        className="closeModal"
        onClick={() => setShowTermsPrivacy(false)}
      >
        ×
      </button>

      <h2>Termos de Uso e Política de Privacidade</h2>
      <LegalTermsContent />
    </div>
  </div>
)}

{showMyRecords && (
  <div className="modalOverlay">
    <div className="recordModal">
      <button
        className="closeModal"
        onClick={() => setShowMyRecords(false)}
      >
        ×
      </button>

      <h2>Minhas Ocorrências</h2>

      <p>
        Acompanhe as ocorrências que você cadastrou e o status de aprovação.
      </p>

      <button
        className="btn secondary full"
        onClick={carregarMinhasOcorrencias}
        disabled={loading}
        style={{ marginBottom: "16px" }}
      >
        {loading ? "Atualizando..." : "Atualizar ocorrências"}
      </button>

      {myRecordsMessage && (
        <div className="authMessage">{myRecordsMessage}</div>
      )}

      {myRecords.length > 0 && (
        <div className="resultsBox">
          {myRecords.map((item) => {
            const statusInfo = getStatusOcorrenciaInfo(item.status);

            return (
            <div className="resultCard" key={item.id}>
              <div className="adminRecordTop">
                <h3>{item.nome || "Locatário não informado"}</h3>
                <span className={`statusBadge ${item.status || "pendente"}`}>
                  {statusInfo.label}
                </span>
              </div>

              <p>
                <strong>Status:</strong> {statusInfo.message}
              </p>

              {String(item.status || "").toLowerCase() === "reprovado" && item.rejection_reason && (
                <p>
                  <strong>Motivo da reprovação:</strong> {item.rejection_reason}
                </p>
              )}

              <p>
                <strong>CPF final:</strong> {item.cpf4 || "Não informado"}
              </p>

              <p>
                <strong>Cidade/UF:</strong> {item.cidade || "Não informado"}
              </p>

              <p>
                <strong>Tipos:</strong>{" "}
                {Array.isArray(item.tipos)
                  ? item.tipos.join(", ")
                  : item.tipos || "Não informado"}
              </p>

              <p>
                <strong>Descrição:</strong> {item.descricao || "Não informado"}
              </p>

              <p>
                <strong>Cadastrada em:</strong>{" "}
                {item.created_at
                  ? new Date(item.created_at).toLocaleString("pt-BR")
                  : "Não informado"}
              </p>

              <p>
                <strong>Aprovada em:</strong>{" "}
                {item.approved_at
                  ? new Date(item.approved_at).toLocaleString("pt-BR")
                  : "Ainda não aprovada"}
              </p>

              {item.imagem_url && (
                <div className="imagePreviewBox">
                  <strong>Documento/comprovante:</strong>
                  <a href={item.imagem_url} target="_blank" rel="noreferrer">
                    {getDocumentoLabel(item.imagem_url)}
                  </a>
                  {isImageUrl(item.imagem_url) && (
                    <img src={item.imagem_url} alt="Documento/comprovante" />
                  )}
                </div>
              )}
            </div>
            );
          })}
        </div>
      )}
    </div>
  </div>
)}

{showConsultationHistory && (
  <div className="modalOverlay">
    <div className="recordModal">
      <button
        className="closeModal"
        onClick={() => setShowConsultationHistory(false)}
      >
        ×
      </button>

      <h2>Minhas Consultas</h2>

      <p>Confira o histórico das consultas realizadas na plataforma.</p>

      <button
        className="btn secondary full"
        onClick={carregarHistoricoConsultas}
        disabled={loading}
        style={{ marginBottom: "16px" }}
      >
        {loading ? "Atualizando..." : "Atualizar histórico"}
      </button>

      {consultationHistoryMessage && (
        <div className="authMessage">{consultationHistoryMessage}</div>
      )}

      {consultationHistory.length > 0 && (
        <div className="resultsBox">
          {consultationHistory.map((item) => (
            <div className="resultCard" key={item.id}>
              <h3>
                Consulta realizada em {" "}
                {new Date(item.created_at).toLocaleString("pt-BR")}
              </h3>

              <p>
                <strong>Termo pesquisado:</strong>{" "}
                {item.searched_text || "Não informado"}
              </p>

              {item.searched_cpf && (
                <p>
                  <strong>CPF pesquisado:</strong>{" "}
                  {String(item.searched_cpf).length >= 11
                    ? `***.***.***-${String(item.searched_cpf).slice(-2)}`
                    : item.searched_cpf}
                </p>
              )}

              <p>
                <strong>Registros encontrados:</strong>{" "}
                {item.results_count ?? 0}
              </p>

              <p>
                <strong>Crédito consumido:</strong>{" "}
                {item.credit_charged ? "Sim" : "Não"}
              </p>

              <p>
                <strong>Plano ilimitado usado:</strong>{" "}
                {item.used_unlimited ? "Sim" : "Não"}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  </div>
)}


{showPaymentsHistory && (
  <div className="modalOverlay">
    <div className="recordModal">
      <button
        className="closeModal"
        onClick={() => setShowPaymentsHistory(false)}
      >
        ×
      </button>

      <h2>Meus Pagamentos</h2>

      <p>Confira os PIX gerados, pagamentos pendentes e pagamentos aprovados.</p>

      <button
        className="btn secondary full"
        onClick={carregarHistoricoPagamentos}
        disabled={loading}
        style={{ marginBottom: "16px" }}
      >
        {loading ? "Atualizando..." : "Atualizar pagamentos"}
      </button>

      {paymentsHistoryMessage && (
        <div className="authMessage">{paymentsHistoryMessage}</div>
      )}

      {paymentsHistory.length > 0 && (
        <div className="resultsBox">
          {paymentsHistory.map((item) => {
            const statusClass = String(item.status || "pending").toLowerCase();
            const planName =
              item.plan_type === "unlimited"
                ? "Plano Ilimitado Mensal"
                : item.plan_type ||
                  (item.credits ? `${item.credits} créditos` : "Plano de créditos");

            return (
              <div className="resultCard" key={item.id}>
                <div className="adminRecordTop">
                  <h3>{planName}</h3>
                  <span className={`statusBadge ${statusClass}`}>
                    {traduzirStatusPagamento(item.status)}
                  </span>
                </div>

                <p>
                  <strong>Valor:</strong> {formatMoneyFromPayment(item)}
                </p>

                <p>
                  <strong>Créditos:</strong>{" "}
                  {item.plan_type === "unlimited"
                    ? "Plano ilimitado"
                    : item.credits
                    ? `${item.credits} créditos`
                    : "Não informado"}
                </p>

                <p>
                  <strong>Gerado em:</strong>{" "}
                  {item.created_at
                    ? new Date(item.created_at).toLocaleString("pt-BR")
                    : "Não informado"}
                </p>

                <p>
                  <strong>Pago em:</strong>{" "}
                  {item.paid_at
                    ? new Date(item.paid_at).toLocaleString("pt-BR")
                    : "Ainda não confirmado"}
                </p>

                {item.status === "pending" && item.pix_code && (
                  <details style={{ marginTop: "10px" }}>
                    <summary>Código PIX copia e cola</summary>
                    <textarea
                      value={item.pix_code}
                      readOnly
                      style={{
                        width: "100%",
                        minHeight: "100px",
                        marginTop: "10px",
                        resize: "none",
                      }}
                    />
                  </details>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  </div>
)}
        {editingRecord && (
          <div className="modalOverlay">
            <div className="recordModal">
              <button
                className="closeModal"
                onClick={() => setEditingRecord(null)}
              >
                ×
              </button>

              <h2>Editar Ocorrência</h2>

              <p>
                Altere os dados completos da ocorrência. Se reprovar, informe o motivo para o usuário.
                Para usuários comuns, o CPF continuará aparecendo apenas com os 4 últimos números.
              </p>

              <form onSubmit={salvarEdicaoOcorrencia} className="recordForm">
                <input
                  type="text"
                  placeholder="Nome do locatário"
                  value={editRecordNome}
                  onChange={(e) => setEditRecordNome(e.target.value)}
                  required
                />

                <input
                  type="text"
                  placeholder="CPF completo"
                  value={editRecordCpf}
                  onChange={(e) => setEditRecordCpf(e.target.value)}
                  required
                />

                <input
                  type="text"
                  placeholder="WhatsApp do locatário cadastrado"
                  value={editRecordWhatsapp}
                  onChange={(e) => setEditRecordWhatsapp(e.target.value)}
                  required
                />

                <input
                  type="text"
                  placeholder="Cidade/UF"
                  value={editRecordCidade}
                  onChange={(e) => setEditRecordCidade(e.target.value)}
                  required
                />

                <select
                  className="selectInput"
                  value={editRecordStatus}
                  onChange={(e) => setEditRecordStatus(e.target.value)}
                >
                  <option value="pendente">Pendente</option>
                  <option value="aprovado">Aprovado</option>
                  <option value="reprovado">Reprovado</option>
                </select>

                {editRecordStatus === "reprovado" && (
                  <textarea
                    placeholder="Motivo da reprovação para o usuário"
                    value={editRecordRejectionReason}
                    onChange={(e) => setEditRecordRejectionReason(e.target.value)}
                    rows="3"
                    required
                  />
                )}

                <div className="checkboxBox">
                  <strong>Tipo de ocorrência</strong>

                  <div className="checkboxGrid">
                    {TIPOS_OCORRENCIA.map((tipo) => (
                      <label key={tipo}>
                        <input
                          type="checkbox"
                          checked={editRecordTipos.includes(tipo)}
                          onChange={() => toggleTipoEdicao(tipo)}
                        />
                        {tipo}
                      </label>
                    ))}
                  </div>
                </div>

                {editingRecord.imagem_url && (
                  <div className="imagePreviewBox">
                    <strong>Documento atual:</strong>
                    <a
                      href={editingRecord.imagem_url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {getDocumentoLabel(editingRecord.imagem_url)}
                    </a>
                    {isImageUrl(editingRecord.imagem_url) && (
                      <img src={editingRecord.imagem_url} alt="Documento atual" />
                    )}
                  </div>
                )}

                <input
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={(e) =>
                    setEditRecordImage(e.target.files?.[0] || null)
                  }
                />

                <small className="fieldHelp">
                  Envie uma nova imagem ou PDF apenas se quiser substituir/adicionar
                  documento/comprovante.
                </small>

                <textarea
                  placeholder="Descrição da ocorrência"
                  value={editRecordDescricao}
                  onChange={(e) => setEditRecordDescricao(e.target.value)}
                  rows="5"
                  required
                />

                <button className="btn primary full" disabled={loading}>
                  {loading ? "Salvando..." : "Salvar alterações"}
                </button>

                <button
                  className="btn outline full"
                  type="button"
                  disabled={loading}
                  onClick={() => {
                    setEditRecordStatus("aprovado");
                    setEditRecordRejectionReason("");
                    setEditRecordMessage("Status alterado para aprovado. Clique em Salvar alterações para confirmar.");
                  }}
                >
                  Preparar aprovação
                </button>
              </form>

              {editRecordMessage && (
                <div className="authMessage">{editRecordMessage}</div>
              )}
            </div>
          </div>
        )}

        {showSearchForm && (
          <div className="modalOverlay">
            <div className="recordModal">
              <button
                className="closeModal"
                onClick={() => setShowSearchForm(false)}
              >
                ×
              </button>

              <h2>Consultar CPF</h2>

              <p>
                Escolha entre buscar registros em outras locadoras ou realizar uma consulta externa completa.
              </p>

              <div className="consultTypeGrid">
                <button
                  type="button"
                  className={consultationMode === "internal" ? "consultTypeCard active" : "consultTypeCard"}
                  onClick={() => {
                    setConsultationMode("internal");
                    setSearchResults([]);
                    setSearchMessage("");
                    setCombinedConsultationStatus(null);
                  }}
                >
                  <strong>Consulta Interna</strong>
                  <span>1 crédito</span>
                  <small>Busca registro do locador em outras locadoras.</small>
                </button>

                <button
                  type="button"
                  className={consultationMode === "external_advanced" ? "consultTypeCard active featuredExternalCompleteV36" : "consultTypeCard featuredExternalCompleteV36"}
                  onClick={() => {
                    setConsultationMode("external_advanced");
                    setSearchResults([]);
                    setSearchMessage("");
                    setCombinedConsultationStatus(null);
                  }}
                >
                  <strong>Consulta Externa Completa</strong>
                  <span>3 créditos</span>
                  <small>Fonte externa completa + verificação da base interna, sem crédito extra.</small>
                </button>
              </div>

              <form onSubmit={consultarLocatario} className="recordForm">
                <input
                  type="text"
                  placeholder={consultationMode === "internal" ? "Nome ou CPF" : "CPF completo"}
                  value={searchText}
                  onChange={(e) => {
                    const value = consultationMode === "internal" ? e.target.value : formatCpfInput(e.target.value);
                    setSearchText(value);
                  }}
                  required
                />

                <p className="documentPublicNotice">
                  {consultationMode === "internal"
                    ? "Consulta interna: consome 1 crédito e busca registro do locador em outras locadoras."
                    : "Consulta externa completa: consulta a fonte externa e também verifica a base interna. Total: 3 créditos."}
                </p>

                <button className="btn primary full" disabled={loading}>
                  {loading ? "Consultando..." : "Buscar"}
                </button>
              </form>

              {searchMessage && (
                <div className="authMessage">{searchMessage}</div>
              )}

              {combinedConsultationStatus && (
                <div className="combinedConsultationSummary">
                  <div>
                    <span>Consulta combinada concluída</span>
                    <strong>Fonte externa + base interna LocaCheck</strong>
                  </div>
                  <div className="combinedConsultationChecks">
                    <span className="completed">✓ Externa concluída</span>
                    <span className={combinedConsultationStatus.internalVerified ? "completed" : "warning"}>
                      {combinedConsultationStatus.internalVerified ? "✓ Interna verificada" : "! Interna indisponível"}
                    </span>
                    <span>{combinedConsultationStatus.internalCount || 0} ocorrência(s) interna(s)</span>
                    <span>{combinedConsultationStatus.creditsCharged || 3} créditos no total</span>
                  </div>
                </div>
              )}

              {combinedConsultationStatus && combinedConsultationStatus.internalVerified && Number(combinedConsultationStatus.internalCount || 0) === 0 && (
                <div className="resultCard internalEmptyResultCard">
                  <div className="internalResultSourceHeader">
                    <div>
                      <span>Base interna LocaCheck</span>
                      <strong>Verificação concluída</strong>
                    </div>
                    <span className="internalSourcePill">Nenhum registro</span>
                  </div>
                  <p>{INTERNAL_NO_RECORDS_MESSAGE}</p>
                </div>
              )}

              {searchResults.length > 0 && (
                <div className="resultsBox">
                  {searchResults.map((item) => (
                    <div className="resultCard" key={item.id}>
                      {item.result_origin === "external" ? (
                        <>
                          <div className="externalResultV31" data-version="external-advanced-v35">
                            <div className="externalResultTopV31">
                              <div>
                                <span className="externalResultEyebrowV31">Consulta externa</span>
                                <h3>{item.consultation_label || "Consulta Externa"}</h3>
                                <p>Resultado tratado para apoio à análise do locador.</p>
                              </div>
                              <span className="externalSourcePillV31 new">
                                Fonte externa integrada
                              </span>
                            </div>

                            <div className="externalResultCardsV31">
                              <section className="externalInfoCardV31 main">
                                <span>Dados cadastrais</span>
                                <h4>{item.name || "Nome não informado"}</h4>
                                <p><strong>CPF consultado:</strong> {item.cpf || item.cpf_masked || "Não informado"}</p>
                                <p><strong>Situação cadastral:</strong> {item.document_status || "Não informado"}</p>
                                {item.birth_date && <p><strong>Nascimento:</strong> {formatSimpleDate(item.birth_date)}</p>}
                                {item.mother_name && <p><strong>Nome da mãe:</strong> {item.mother_name}</p>}
                                {item.father_name && <p><strong>Nome do pai:</strong> {item.father_name}</p>}
                                {item.social_number && <p><strong>Número social:</strong> {item.social_number}</p>}
                                {item.zodiac_sign && <p><strong>Signo:</strong> {displayExternalValue(item.zodiac_sign)}</p>}
                              </section>

                              {(Array.isArray(item.phones) && item.phones.length > 0) || (Array.isArray(item.emails) && item.emails.length > 0) ? (
                                <section className="externalInfoCardV31">
                                  <span>Contatos encontrados</span>
                                  <h4>{(item.phones?.length || 0) + (item.emails?.length || 0)} contato(s)</h4>
                                  {item.phones?.map((phone, index) => (
                                    <p key={`phone-${index}`}><strong>Telefone {index + 1}:</strong> {[phone.number, phone.type, phone.status ? `status ${phone.status}` : null, phone.is_main === true ? 'principal' : null, phone.is_recent === true ? 'recente' : null, phone.relationship ? `relação ${phone.relationship}` : null, phone.ranking ? `prioridade ${phone.ranking}` : null].filter(Boolean).join(" • ")}</p>
                                  ))}
                                  {item.emails?.map((email, index) => (
                                    <p key={`email-${index}`}><strong>E-mail {index + 1}:</strong> {[email.email, email.type, email.status ? `status ${email.status}` : null, email.is_main === true ? 'principal' : null, email.is_recent === true ? 'recente' : null, email.relationship ? `relação ${email.relationship}` : null, email.ranking ? `prioridade ${email.ranking}` : null].filter(Boolean).join(" • ")}</p>
                                  ))}
                                </section>
                              ) : null}

                              {Array.isArray(item.addresses) && item.addresses.length > 0 ? (
                                <section className="externalInfoCardV31">
                                  <span>Endereços encontrados</span>
                                  <h4>{item.addresses.length} endereço(s)</h4>
                                  {item.addresses.map((address, index) => (
                                    <p key={`address-${index}`}><strong>Endereço {index + 1}:</strong> {[address.full, address.type, address.is_main === true ? 'principal' : null, address.is_recent === true ? 'recente' : null, address.relationship ? `relação ${address.relationship}` : null].filter(Boolean).join(" • ")}</p>
                                  ))}
                                </section>
                              ) : null}

                              {Array.isArray(item.related_people) && item.related_people.length > 0 ? (
                                <section className="externalInfoCardV31 wide relatedPeopleV34">
                                  <span>Pessoas relacionadas</span>
                                  <h4>{item.related_people.length} pessoa(s) ou relacionamento(s)</h4>
                                  {item.related_people.map((person, index) => (
                                    <div className="externalMiniBlockV32" key={`related-${index}`}>
                                      <strong>{person.name || relatedPersonLabel(person, index)}</strong>
                                      {person.full_name && person.full_name !== person.name && <p><strong>Nome completo:</strong> {person.full_name}</p>}
                                      {person.tax_id && <p><strong>CPF/CNPJ:</strong> {person.tax_id}</p>}
                                      {person.relationship && <p><strong>Grau de parentesco/relacionamento:</strong> {person.relationship}</p>}
                                      {person.email && <p><strong>E-mail:</strong> {person.email}</p>}
                                      {Array.isArray(person.phones) && person.phones.length > 0 && (
                                        <p><strong>Telefones:</strong> {person.phones.map((phone) => [phone.number, phone.type, phone.status].filter(Boolean).join(' • ')).filter(Boolean).join(" | ")}</p>
                                      )}
                                    </div>
                                  ))}
                                </section>
                              ) : null}

                              <section className="externalInfoCardV31">
                                <span>Processos</span>
                                <h4>{item.has_lawsuit_indicators ? "Há informações encontradas" : "Sem informações relevantes"}</h4>
                                <p><strong>Quantidade informada:</strong> {item.lawsuits_total || item.processes?.length || 0}</p>
                                {!item.processes?.length && <p>Não foram retornados detalhes de processos nesta consulta.</p>}
                              </section>

                              {Array.isArray(item.processes) && item.processes.length > 0 ? (
                                <section className="externalInfoCardV31 wide">
                                  <span>Resumo dos principais processos</span>
                                  <h4>{item.processes.length} processo(s) listado(s)</h4>
                                  {item.processes.slice(0, 20).map((process, index) => (
                                    <div className="externalMiniBlockV32" key={`process-${index}`}>
                                      <strong>{process.number || `Processo ${index + 1}`}</strong>
                                      <p>{[process.court, process.state, process.type, process.status].filter(Boolean).join(" • ") || "Informações principais disponíveis."}</p>
                                      {(process.specific_type || process.person_role) && <p><strong>Envolvimento da pessoa:</strong> {process.specific_type || process.person_role}</p>}
                                      {process.distribution_date && <p><strong>Data:</strong> {formatSimpleDate(process.distribution_date)}</p>}
                                      {process.subject && <p><strong>Assunto:</strong> {process.subject}</p>}
                                      {process.value && <p><strong>Valor informado:</strong> {process.value}</p>}
                                    </div>
                                  ))}
                                </section>
                              ) : null}

                              {/* Consumo e origem removidos da visualização do usuário na V36 */}
                            </div>

                            <div className="externalResultNoticeV31">
                              <strong>Uso responsável:</strong> As informações são fornecidas por fonte externa integrada e devem ser usadas apenas como apoio à decisão, respeitando finalidade legítima e análise própria do locador.
                            </div>

                            <div className="modalActionsRow externalResultActions">
                              <button type="button" className="btn secondary" onClick={() => copiarResumoConsultaExterna(item)}>
                                Copiar resumo
                              </button>
                              <button type="button" className="btn primary" onClick={() => exportarConsultaExterna(item)}>
                                Exportar consulta
                              </button>
                            </div>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="internalResultSourceHeader">
                            <div>
                              <span>Base interna LocaCheck</span>
                              <strong>{item.included_with_external ? "Verificação incluída na consulta externa" : "Consulta interna"}</strong>
                            </div>
                            <span className="internalSourcePill">Registro interno</span>
                          </div>
                          <h3>{item.nome}</h3>

                          <p>
                            <strong>CPF:</strong>{" "}
                            {item.cpf_masked || item.cpf4 || "Não informado"}
                          </p>

                          <p>
                            <strong>Cidade/UF:</strong>{" "}
                            {item.cidade || "Não informado"}
                          </p>

                          <p>
                            <strong>Ocorrências:</strong>{" "}
                            {item.tipos?.join(", ")}
                          </p>

                          <p>
                            <strong>Descrição:</strong> {item.descricao}
                          </p>

                          {item.imagem_url && (
                            <div className="imagePreviewBox">
                              <strong>Documento/comprovante:</strong>
                              <a
                                href={item.imagem_url}
                                target="_blank"
                                rel="noreferrer"
                              >
                                {getDocumentoLabel(item.imagem_url)}
                              </a>
                              <p className="documentPublicNotice">Documento disponível para usuários que realizarem uma consulta com resultado aprovado.</p>
                              {isImageUrl(item.imagem_url) && (
                                <img src={item.imagem_url} alt="Documento/comprovante" />
                              )}
                            </div>
                          )}

                          <div className="modalActionsRow externalResultActions">
                            <button type="button" className="btn primary" onClick={() => exportarConsultaInterna(item)}>
                              Exportar relatório
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {showRecordForm && (
          <div className="modalOverlay">
            <div className="recordModal">
              <button
                className="closeModal"
                onClick={() => setShowRecordForm(false)}
              >
                ×
              </button>

              <h2>Registrar Ocorrência</h2>

              <p>
                Cadastre uma ocorrência relacionada a um locatário de veículo.
                O CPF será exibido futuramente apenas pelos 4 últimos números. O documento/comprovante ficará disponível para quem consultar uma ocorrência aprovada.
              </p>

              <form onSubmit={cadastrarOcorrencia} className="recordForm">
                <input
                  type="text"
                  placeholder="Nome do locatário"
                  value={recordNome}
                  onChange={(e) => setRecordNome(e.target.value)}
                  required
                />

                <input
                  type="text"
                  placeholder="WhatsApp do locatário cadastrado"
                  inputMode="numeric"
                  maxLength="15"
                  value={recordWhatsapp}
                  onChange={(e) => setRecordWhatsapp(formatWhatsappInput(e.target.value))}
                  required
                />

                <input
                  type="text"
                  placeholder="CPF completo"
                  inputMode="numeric"
                  maxLength="14"
                  value={recordCpf}
                  onChange={(e) => setRecordCpf(formatCpfInput(e.target.value))}
                  required
                />

                <small className="fieldHelp">
                  Informe um CPF válido. A plataforma exibirá apenas os 4 últimos números nas consultas.
                </small>

                <input
                  type="text"
                  placeholder="Cidade/UF"
                  value={recordCidade}
                  onChange={(e) => setRecordCidade(e.target.value)}
                  required
                />

                <div className="checkboxBox">
                  <strong>Tipo de ocorrência</strong>

                  <div className="checkboxGrid">
                    {TIPOS_OCORRENCIA.map((tipo) => (
                      <label key={tipo}>
                        <input
                          type="checkbox"
                          checked={recordTipos.includes(tipo)}
                          onChange={() => toggleTipo(tipo)}
                        />
                        {tipo}
                      </label>
                    ))}
                  </div>
                </div>

                <input
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={(e) => setRecordImage(e.target.files?.[0] || null)}
                />

                <small className="fieldHelp">
                  Envie uma foto, PDF ou comprovante, se houver.
                </small>

                <textarea
                  placeholder="Descrição da ocorrência"
                  value={recordDescricao}
                  onChange={(e) => setRecordDescricao(e.target.value)}
                  rows="5"
                  required
                />

                <button className="btn primary full" disabled={loading}>
                  {loading ? "Salvando..." : "Registrar ocorrência"}
                </button>
              </form>

              {recordMessage && (
                <div className="authMessage">{recordMessage}</div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="page">
      {toast && (
        <div className={`toastPopup ${toast.type || "success"}`}>
          <strong>{toast.title}</strong>
          <span>{toast.message}</span>
        </div>
      )}
      <header className="header">
        <div className="brand">
          <div className="logo">LC</div>
          <div>
            <strong>LocaCheck</strong>
            <span>Sistema Nacional de Consulta de Locatários de Veículos</span>
          </div>
        </div>

        <div className="actions">
          <button className="btn secondary" onClick={() => setAuthMode("login")}>
            Entrar
          </button>

          <button className="btn primary" onClick={() => setAuthMode("cadastro")}>
            Cadastrar
          </button>
        </div>
      </header>

      <main>
        <section className="hero">
          <div className="badge">Proteção inteligente para locadoras</div>

          <h1>
            Consulte antes de alugar. <br />
            <span className="gradientText">Proteja sua frota.</span>
          </h1>

          <p>
            A LocaCheck ajuda locadoras, frotistas e administradores de veículos
            a consultar históricos, registrar ocorrências e reduzir riscos de
            inadimplência, multas, avarias e não devolução.
          </p>

          <div className="heroActions">
            <button
              className="btn primary large"
              onClick={() => setAuthMode("login")}
            >
              Consultar CPF
            </button>

            <button
              className="btn outline large"
              onClick={() => setAuthMode("login")}
            >
              Registrar Ocorrência
            </button>
          </div>
        </section>

        <section className="cards">
          <div className="card">
            <h3>10 Créditos Grátis</h3>
            <p>Todo novo usuário recebe créditos para começar a consultar.</p>
          </div>

          <div className="card featured">
            <h3>Consulta Completa</h3>
            <p>
              Ao buscar, 1 crédito é descontado e o resultado completo é
              exibido.
            </p>
          </div>

          <div className="card">
            <h3>Cadastro Gratuito</h3>
            <p>Registre ocorrências de locatários sem pagar nada.</p>
          </div>
        </section>

        <section className="marketUseCases">
          <div className="sectionTitle">
            <span>Para quem é</span>
            <h2>Mais segurança para quem trabalha com locação</h2>
            <p>
              A LocaCheck foi pensada para reduzir riscos antes da entrega do veículo,
              mantendo consulta responsável, histórico organizado e apoio à decisão.
            </p>
          </div>

          <div className="useCaseGrid">
            <div className="useCaseCard">
              <span>Locadoras</span>
              <h3>Decisão mais segura antes do contrato</h3>
              <p>Consulte registros aprovados e reduza prejuízos com inadimplência, multas e avarias.</p>
            </div>

            <div className="useCaseCard">
              <span>Frotistas</span>
              <h3>Controle para operações maiores</h3>
              <p>Acompanhe ocorrências, usuários, créditos, pagamentos e exporte relatórios em CSV.</p>
            </div>

            <div className="useCaseCard">
              <span>Motos e carros</span>
              <h3>Uso flexível em diferentes operações</h3>
              <p>Funciona para locação de motos, carros, entregadores, mensalistas e contratos avulsos.</p>
            </div>

            <div className="useCaseCard">
              <span>LGPD</span>
              <h3>Consulta com responsabilidade</h3>
              <p>Usuários comuns visualizam dados limitados e o CPF permanece protegido nas consultas.</p>
            </div>
          </div>
        </section>

        <section className="plans">
          <div className="sectionTitle">
            <span>Planos</span>
            <h2>Escolha como deseja consultar</h2>
            <p>
              Os planos ativos cadastrados no painel admin aparecem automaticamente aqui e na tela de compra.
            </p>
          </div>

          {landingMessage && <div className="landingInlineMessage">{landingMessage}</div>}

          <div className="planGrid dynamicPlanGrid">
            {(publicPlans.length > 0
              ? publicPlans
              : [
                  normalizePlanRow({ id: "fallback-20", name: "20 Créditos", credits: 20, price_cents: 1990, active: true, plan_type: "credits" }),
                  normalizePlanRow({ id: "fallback-50", name: "50 Créditos", credits: 50, price_cents: 3990, active: true, plan_type: "credits" }),
                  normalizePlanRow({ id: "fallback-100", name: "100 Créditos", credits: 100, price_cents: 6990, active: true, plan_type: "credits" }),
                  normalizePlanRow({ id: "fallback-150", name: "150 Créditos", credits: 150, price_cents: 9750, active: true, plan_type: "credits" }),
                ]
            ).map((plano, index, list) => {
              const isUnlimited = plano.is_unlimited === true;
              const isBestValue = false;
              const isLargePack = !isUnlimited && Number(plano.credits || 0) === 150;

              return (
                <div className={`planCard ${isUnlimited ? "unlimited" : ""} ${isLargePack ? "largePack" : ""}`} key={plano.id || plano.name}>
                  {isLargePack && <div className="recommended recommendedGreen">Mais econômico</div>}

                  <h3>{plano.name}</h3>
                  <strong>{formatMoneyCents(plano.price_cents)}</strong>
                  <p>{getPlanDescription(plano)}</p>

                  <button className={isLargePack ? "btn primary full" : "btn outline full"} onClick={abrirCompraPublica}>
                    Comprar créditos
                  </button>
                </div>
              );
            })}
          </div>
        </section>

        <section className="how">
          <h2>Como funciona</h2>

          <div className="steps">
            <div>
              <span>01</span>
              <h4>Cadastre-se</h4>
              <p>Crie sua conta com segurança e adicione créditos para consultar.</p>
            </div>

            <div>
              <span>02</span>
              <h4>Consulte</h4>
              <p>Digite nome ou CPF e veja registros disponíveis.</p>
            </div>

            <div>
              <span>03</span>
              <h4>Proteja sua frota</h4>
              <p>Use as informações para decidir com mais segurança.</p>
            </div>
          </div>

          <div className="trustBox">
            <strong>Fluxo profissional:</strong>
            <span>o usuário consulta, registra ocorrências com comprovante, o admin aprova ou reprova e tudo fica registrado em logs do sistema.</span>
          </div>
        </section>
      </main>

      <div className="heroActions landingSupportActionsV39" style={{ justifyContent: "center", marginBottom: "24px" }}>
        <button
          className="btn primary"
          onClick={() => setShowPublicSupport(true)}
        >
          Falar com suporte
        </button>

        <button
          className="btn outline"
          onClick={() => setShowTermsPrivacy(true)}
        >
          Termos e Política de Privacidade
        </button>
      </div>

      {authMode && (
        <div className="modalOverlay">
          <div className="authModal">
            <button className="closeModal" onClick={() => setAuthMode(null)}>
              ×
            </button>

            <h2>
              {authMode === "reset"
                ? "Recuperar senha"
                : authMode === "login"
                ? "Entrar na LocaCheck"
                : "Criar conta grátis"}
            </h2>

            <p>
              {authMode === "reset"
                ? "Informe seu e-mail para receber o link de recuperação de senha."
                : authMode === "login"
                ? "Para realizar consultas, confirme seu e-mail após criar a conta."
                : "Cadastre-se com seus dados reais. O e-mail precisa ser confirmado para realizar consultas."}
            </p>

            <button
              type="button"
              className="switchAuth"
              onClick={() => setShowTermsPrivacy(true)}
            >
              Ver Termos de Uso e Política de Privacidade
            </button>

            {authMode !== "reset" && (
              <>
                <button
                  type="button"
                  className="btn googleAuthButton full"
                  onClick={entrarComGoogle}
                  disabled={loading}
                >
                  <span className="googleAuthIcon">G</span>
                  {loading ? "Aguarde..." : "Entrar com Google"}
                </button>

                <div className="authDivider">
                  <span>ou continue com e-mail</span>
                </div>
              </>
            )}

            <form
              onSubmit={authMode === "reset" ? recuperarSenha : authMode === "login" ? entrarUsuario : cadastrarUsuario}
            >
              {authMode === "cadastro" && (
                <>
                  <input
                    type="text"
                    placeholder="Nome ou empresa"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    required
                  />

                  <input
                    type="tel"
                    inputMode="numeric"
                    placeholder="WhatsApp com DDD"
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(formatWhatsappInput(e.target.value))}
                    maxLength={15}
                    required
                  />
                  <small className="fieldHelp">Use DDD + número. Exemplo: (88) 99999-9999.</small>
                </>
              )}

              <input
                type="email"
                placeholder="E-mail"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onBlur={() => setEmail(normalizeEmail(email))}
                autoComplete={authMode === "login" ? "email" : "email"}
                required
              />

              {authMode !== "reset" && (
                <input
                  type="password"
                  placeholder="Senha"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  required
                />
              )}

              {authMode === "cadastro" && (
                <label className="termsAcceptBox">
                  <input
                    type="checkbox"
                    checked={termsAccepted}
                    onChange={(e) => setTermsAccepted(e.target.checked)}
                    required
                  />
                  <span>
                    Li e aceito os Termos de Uso e a Política de Privacidade da LocaCheck.
                  </span>
                </label>
              )}

              <button className="btn primary full" disabled={loading}>
                {loading
                  ? "Aguarde..."
                  : authMode === "reset"
                  ? "Enviar link de recuperação"
                  : authMode === "login"
                  ? "Entrar"
                  : "Criar conta"}
              </button>

              {authMode === "login" && (
                <button
                  type="button"
                  className="switchAuth forgotPasswordLinkV39"
                  onClick={() => { setMessage(""); setAuthMode("reset"); }}
                  disabled={loading}
                >
                  Esqueci minha senha
                </button>
              )}
            </form>

            {message && <div className="authMessage">{message}</div>}

            <button
              className="switchAuth"
              onClick={() => {
                setMessage("");
                setAuthMode(authMode === "login" ? "cadastro" : "login");
              }}
            >
              {authMode === "reset" ? "Voltar para entrar" : authMode === "login" ? "Ainda não tenho conta" : "Já tenho conta"}
            </button>
          </div>
        </div>
      )}


      {showPublicSupport && (
        <div className="modalOverlay">
          <div className="recordModal publicSupportModalV39">
            <button className="closeModal" onClick={() => setShowPublicSupport(false)}>
              ×
            </button>

            <h2>Suporte LocaCheck</h2>
            <p>Envie sua dúvida ou solicitação. A mensagem chegará no painel de suporte do administrador.</p>

            <form className="recordForm" onSubmit={enviarSuportePublico}>
              <input
                type="text"
                placeholder="Nome ou empresa"
                value={publicSupportName}
                onChange={(e) => setPublicSupportName(e.target.value)}
                required
              />

              <input
                type="email"
                placeholder="E-mail para retorno"
                value={publicSupportEmail}
                onChange={(e) => setPublicSupportEmail(e.target.value)}
                onBlur={() => setPublicSupportEmail(normalizeEmail(publicSupportEmail))}
              />

              <input
                type="tel"
                inputMode="numeric"
                placeholder="WhatsApp com DDD"
                value={publicSupportWhatsapp}
                onChange={(e) => setPublicSupportWhatsapp(formatWhatsappInput(e.target.value))}
                maxLength={15}
              />

              <textarea
                placeholder="Digite sua mensagem"
                value={publicSupportMessage}
                onChange={(e) => setPublicSupportMessage(e.target.value)}
                rows="5"
                required
              />

              <button className="btn primary full" disabled={loading}>
                {loading ? "Enviando..." : "Enviar mensagem"}
              </button>
            </form>

            {publicSupportFeedback && <div className="authMessage">{publicSupportFeedback}</div>}
          </div>
        </div>
      )}

      {showTermsPrivacy && (
        <div className="modalOverlay">
          <div className="recordModal legalTermsModal">
            <button
              className="closeModal"
              onClick={() => setShowTermsPrivacy(false)}
            >
              ×
            </button>

            <h2>Termos de Uso e Política de Privacidade</h2>
            <LegalTermsContent />
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
