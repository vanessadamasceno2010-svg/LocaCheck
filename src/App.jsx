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

function diasAte(dataIso) {
  if (!dataIso) return null;
  const hoje = new Date();
  const alvo = new Date(dataIso);
  const diff = alvo.getTime() - hoje.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
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
  const [showNotifications, setShowNotifications] = useState(false);
  const [showSystemLogs, setShowSystemLogs] = useState(false);
  const [toast, setToast] = useState(null);
  const [notificationReadIds, setNotificationReadIds] = useState([]);
  const [showAllRecentPayments, setShowAllRecentPayments] = useState(false);

  const [consultationHistory, setConsultationHistory] = useState([]);
  const [consultationHistoryMessage, setConsultationHistoryMessage] = useState("");
  const [paymentsHistory, setPaymentsHistory] = useState([]);
  const [paymentsHistoryMessage, setPaymentsHistoryMessage] = useState("");
  const [myRecords, setMyRecords] = useState([]);
  const [myRecordsMessage, setMyRecordsMessage] = useState("");
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

    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    if (data) {
      setProfile(data);
      return;
    }

    const { data: newProfile, error } = await supabase
      .from("profiles")
      .insert({
        id: userId,
        nome: user?.user_metadata?.nome || "Usuário",
        whatsapp: user?.user_metadata?.whatsapp || "",
        role: "user",
        credits: 20,
        consultas: 0,
      })
      .select()
      .single();

    if (!error) {
      setProfile(newProfile);
    } else {
      console.log("Erro ao criar perfil:", error);
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
      carregarMensagensSuporteAdmin();
      carregarLogsSistema();
    }
  }, [session, profile]);

  useEffect(() => {
    if (profile) {
      setProfileNome(profile.nome || "");
      setProfileWhatsapp(profile.whatsapp || "");
      setProfileEmail(session?.user?.email || "");
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
      carregarNotificacoes();
    }
  }, [session?.user?.id, profile?.credits, profile?.unlimited_until]);


  function showToast(type, title, messageText) {
    setToast({ type, title, message: messageText });
    setTimeout(() => setToast(null), 4200);
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
    setProfileWhatsapp(profile?.whatsapp || "");
    setProfileEmail(session?.user?.email || "");
    setProfileNewPassword("");
    setProfileMessage("");
    setShowProfileData(true);
  }

  async function salvarMeusDados(e) {
    e.preventDefault();

    if (!session?.user?.id) return;

    if (!profileNome.trim()) {
      setProfileMessage("Informe seu nome ou nome da empresa.");
      return;
    }

    if (!profileWhatsapp.trim()) {
      setProfileMessage("Informe seu WhatsApp.");
      return;
    }

    setLoading(true);
    setProfileMessage("");

    const { error: profileError } = await supabase
      .from("profiles")
      .update({
        nome: profileNome.trim(),
        whatsapp: profileWhatsapp.trim(),
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

    if (profileEmail.trim() && profileEmail.trim() !== session.user.email) {
      authPayload.email = profileEmail.trim();
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

    const { error } = await supabase.auth.signUp({
      email,
      password: senha,
      options: {
        data: {
          nome,
          whatsapp,
        },
      },
    });

    if (error) {
      setMessage(error.message);
    } else {
      setMessage("Cadastro realizado com sucesso. Você já pode entrar.");
      showToast("success", "Cadastro realizado", "Sua conta foi criada com 20 créditos iniciais.");
      setAuthMode("login");
      setNome("");
      setWhatsapp("");
      setEmail("");
      setSenha("");
    }

    setLoading(false);
  }

  async function entrarUsuario(e) {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    const { error } = await supabase.auth.signInWithPassword({
      email,
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
    setLoading(true);
    setRecordMessage("");

    const cpfLimpo = recordCpf.replace(/\D/g, "");
    const cpf4 = cpfLimpo.slice(-4);

    if (recordTipos.length === 0) {
      setRecordMessage("Selecione pelo menos um tipo de ocorrência.");
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
        whatsapp_locatario: recordWhatsapp,
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

    if (!searchText.trim()) {
      setSearchMessage("Digite um nome ou CPF para consultar.");
      return;
    }

    setLoading(true);
    setSearchMessage("");
    setSearchResults([]);

    const { data, error } = await supabase.rpc("secure_consult_renter", {
      p_search: searchText,
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

    const results = data.results || [];

    setSearchResults(results);

    if (results.length === 0) {
      setSearchMessage(
        "Consulta realizada. Nenhum registro aprovado foi encontrado para os dados informados."
      );
    } else {
      setSearchMessage(
        `Consulta realizada. ${results.length} registro(s) encontrado(s).`
      );
    }

    await loadProfile(session.user.id);
    setLoading(false);
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
      return;
    }

    setAdminMessage("Ocorrência atualizada com sucesso.");
    showToast("success", "Ocorrência atualizada", `Status alterado para ${status}.`);
    await registrarLogAdmin(`ocorrencia_${status}`, { record_id: id, status });
    carregarOcorrenciasAdmin();
  }

  async function excluirOcorrencia(id) {
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

  async function alterarCreditosUsuario(userId, quantidade) {
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
      const statusOk =
        adminRecordFilter === "todos" ? true : item.status === adminRecordFilter;

      if (!statusOk) return false;
      if (!termo) return true;

      const campos = [
        item.nome,
        item.cpf_full,
        item.cpf4,
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

          <button className="btn secondary" onClick={sair}>
            Sair
          </button>
        </header>

        <main className="dashboard">
          <section className="dashboardHero">
            <span>Painel LocaCheck</span>
            <h1>Bem-vindo, {profile.nome || "Usuário"}</h1>
            <p>
              Consulte locatários, registre ocorrências e acompanhe seus créditos
              em um só lugar.
            </p>
          </section>

          <section className="dashboardGrid">
            <div className="dashboardCard">
              <small>Créditos disponíveis</small>
              <strong>{profile.credits}</strong>
            </div>

            <div className="dashboardCard">
              <small>Consultas realizadas</small>
              <strong>{profile.consultas}</strong>
            </div>

            <div className="dashboardCard">
              <small>Plano ilimitado</small>
              <strong>{unlimitedActive ? "Ativo" : "Inativo"}</strong>
            </div>
          </section>

          <section className="dashboardActions">
            <button
              className="btn primary large"
              onClick={() => {
                setSearchMessage("");
                setSearchResults([]);
                setSearchText("");
                setShowSearchForm(true);
              }}
            >
              Consultar Locatário
            </button>

            <button
              className="btn outline large"
              onClick={() => {
                setRecordMessage("");
                setShowRecordForm(true);
              }}
            >
              Registrar Ocorrência
            </button>

            <button
              className="btn outline large"
              onClick={() => {
                setShowMyRecords(true);
                carregarMinhasOcorrencias();
              }}
            >
              Minhas Ocorrências
            </button>

            <button
              className="btn outline large"
              onClick={() => {
                setShowBuyCredits(true);
              }}
            >
              Comprar Créditos
            </button>

            <button
              className="btn outline large"
              onClick={() => {
                setShowConsultationHistory(true);
                carregarHistoricoConsultas();
              }}
            >
              Minhas Consultas
            </button>

            <button
              className="btn outline large"
              onClick={() => {
                setShowPaymentsHistory(true);
                carregarHistoricoPagamentos();
              }}
            >
              Meus Pagamentos
            </button>

            <button
              className="btn outline large"
              onClick={abrirMeusDados}
            >
              Meus Dados
            </button>

            <button
              className="btn outline large notificationButton"
              onClick={() => {
                setShowNotifications(true);
                carregarNotificacoes();
              }}
            >
              Notificações
              {notificationItems.some((item) => notificacaoNaoLida(item)) && (
                <span className="notificationDot" />
              )}
            </button>

            <button
              className="btn outline large"
              onClick={() => setShowTermsPrivacy(true)}
            >
              Termos e Privacidade
            </button>

            <button
              className="btn outline large"
              onClick={() => setShowSupport(true)}
            >
              Suporte
            </button>
          </section>

          {profile.role === "admin" && (
            <section className="adminPanel">
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
                      const amountCents = Number(payment.amount_cents || 0);
                      const statusLabel = traduzirStatusPagamento(payment.status);

                      return (
                        <div className="adminRecord" key={payment.id}>
                          <div className="adminRecordTop">
                            <h3>{payment.plan_type || "Pagamento"}</h3>
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
                            <strong>Valor:</strong>{" "}
                            {new Intl.NumberFormat("pt-BR", {
                              style: "currency",
                              currency: "BRL",
                            }).format(amountCents / 100)}
                          </p>

                          <p>
                            <strong>Créditos:</strong> {payment.credits || 0}
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

          {profile.role === "admin" && (
            <section className="adminPanel">
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

          {profile.role === "admin" && (
            <section className="adminPanel">
              <div className="adminHeader">
                <div>
                  <span>Administração</span>
                  <h2>Usuários cadastrados</h2>
                  <p>Gerencie créditos e plano ilimitado dos usuários.</p>
                </div>

                <button className="btn secondary" onClick={carregarUsuariosAdmin}>
                  Atualizar usuários
                </button>
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
                        <span
                          className={`statusBadge ${
                            user.role === "admin" ? "aprovado" : "pendente"
                          }`}
                        >
                          {user.role}
                        </span>
                      </div>

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
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {profile.role === "admin" && (
            <section className="adminPanel">
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

          {profile.role === "admin" && (
            <section className="adminPanel">
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

          {profile.role === "admin" && (
            <section className="adminPanel">
              <div className="adminHeader">
                <div>
                  <span>Administração</span>
                  <h2>Ocorrências cadastradas</h2>
                  <p>Aprove, reprove, edite ou exclua ocorrências enviadas.</p>
                </div>

                <div className="adminButtons">
                  <input
                    type="text"
                    className="selectInput"
                    placeholder="Buscar por nome, CPF, cidade ou status"
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

                  <button
                    className="btn secondary"
                    onClick={carregarOcorrenciasAdmin}
                  >
                    Atualizar
                  </button>
                </div>
              </div>

              {adminMessage && <div className="authMessage">{adminMessage}</div>}

              <div className="adminList">
                {filtrarOcorrenciasAdmin().length === 0 && (
                  <div className="adminEmpty">
                    Nenhuma ocorrência encontrada para este filtro.
                  </div>
                )}

                {filtrarOcorrenciasAdmin().map((item) => (
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
                        <strong>Imagem/comprovante:</strong>
                        <a href={item.imagem_url} target="_blank" rel="noreferrer">
                          Abrir imagem
                        </a>
                        <img src={item.imagem_url} alt="Comprovante" />
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

      <h2>Meus Dados</h2>

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
          type="text"
          placeholder="WhatsApp"
          value={profileWhatsapp}
          onChange={(e) => setProfileWhatsapp(e.target.value)}
          required
        />

        <input
          type="email"
          placeholder="E-mail de acesso"
          value={profileEmail}
          onChange={(e) => setProfileEmail(e.target.value)}
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
    <div className="recordModal">
      <button
        className="closeModal"
        onClick={() => setShowTermsPrivacy(false)}
      >
        ×
      </button>

      <h2>Termos de Uso e Política de Privacidade</h2>

      <div className="resultsBox">
        <div className="resultCard">
          <h3>Uso responsável da plataforma</h3>
          <p>
            A LocaCheck é uma ferramenta de apoio para locadoras, frotistas e
            empresas que desejam registrar e consultar ocorrências relacionadas
            à locação de veículos. As informações devem ser usadas com
            responsabilidade, boa-fé e finalidade legítima.
          </p>
        </div>

        <div className="resultCard">
          <h3>Proteção de dados e LGPD</h3>
          <p>
            Os dados cadastrados devem ser verdadeiros, necessários e relacionados
            a uma ocorrência real. A plataforma aplica medidas para reduzir a
            exposição de dados pessoais, como exibição de CPF mascarado para
            usuários comuns.
          </p>
        </div>

        <div className="resultCard">
          <h3>Responsabilidade do usuário</h3>
          <p>
            Quem cadastra uma ocorrência declara que possui base legítima para o
            registro e que as informações fornecidas são corretas. É proibido
            cadastrar dados falsos, ofensivos, discriminatórios ou sem relação
            com uma locação de veículo.
          </p>
        </div>

        <div className="resultCard">
          <h3>Consultas</h3>
          <p>
            Cada consulta pode consumir crédito, salvo nos casos de plano ilimitado
            ativo. O histórico de consultas pode ser registrado para segurança,
            auditoria e prevenção de uso indevido.
          </p>
        </div>

        <div className="resultCard">
          <h3>Solicitações e suporte</h3>
          <p>
            Solicitações de correção, revisão ou remoção de informações podem ser
            tratadas pelo suporte da plataforma. O objetivo é manter uma base útil,
            segura e responsável para todos os usuários.
          </p>
        </div>
      </div>
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
                  <strong>Imagem/comprovante:</strong>
                  <a href={item.imagem_url} target="_blank" rel="noreferrer">
                    Abrir imagem
                  </a>
                  <img src={item.imagem_url} alt="Comprovante" />
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
                    <strong>Imagem atual:</strong>
                    <a
                      href={editingRecord.imagem_url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Abrir imagem atual
                    </a>
                    <img src={editingRecord.imagem_url} alt="Comprovante atual" />
                  </div>
                )}

                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) =>
                    setEditRecordImage(e.target.files?.[0] || null)
                  }
                />

                <small className="fieldHelp">
                  Envie uma nova imagem apenas se quiser substituir/adicionar
                  comprovante.
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

              <h2>Consultar Locatário</h2>

              <p>
                Digite nome ou CPF completo. A consulta desconta 1
                crédito ao buscar, exceto usuários com plano ilimitado ativo.
              </p>

              <form onSubmit={consultarLocatario} className="recordForm">
                <input
                  type="text"
                  placeholder="Nome ou CPF"
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  required
                />

                <button className="btn primary full" disabled={loading}>
                  {loading ? "Consultando..." : "Buscar"}
                </button>
              </form>

              {searchMessage && (
                <div className="authMessage">{searchMessage}</div>
              )}

              {searchResults.length > 0 && (
                <div className="resultsBox">
                  {searchResults.map((item) => (
                    <div className="resultCard" key={item.id}>
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
                          <strong>Imagem/comprovante:</strong>
                          <a
                            href={item.imagem_url}
                            target="_blank"
                            rel="noreferrer"
                          >
                            Abrir imagem
                          </a>
                          <img src={item.imagem_url} alt="Comprovante" />
                        </div>
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
                O CPF será exibido futuramente apenas pelos 4 últimos números.
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
                  value={recordWhatsapp}
                  onChange={(e) => setRecordWhatsapp(e.target.value)}
                  required
                />

                <input
                  type="text"
                  placeholder="CPF completo"
                  value={recordCpf}
                  onChange={(e) => setRecordCpf(e.target.value)}
                  required
                />

                <small className="fieldHelp">
                  O CPF completo pode ser digitado, mas a plataforma exibirá
                  apenas os 4 últimos números.
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
                  accept="image/*"
                  onChange={(e) => setRecordImage(e.target.files?.[0] || null)}
                />

                <small className="fieldHelp">
                  Envie uma foto ou comprovante, se houver.
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
            Proteja sua frota de prejuízos.
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
              Consultar Locatário
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
            <h3>20 Créditos Grátis</h3>
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

        <section className="plans">
          <div className="sectionTitle">
            <span>Planos</span>
            <h2>Escolha como deseja consultar</h2>
            <p>
              Compre créditos avulsos ou assine o plano ilimitado mensal para
              consultar sem se preocupar com saldo.
            </p>
          </div>

          <div className="planGrid">
            <div className="planCard">
              <h3>20 Créditos</h3>
              <strong>R$ 19,90</strong>
              <p>Ideal para começar e testar a plataforma.</p>
              <button className="btn outline full" onClick={() => { setMessage("Entre ou cadastre-se para comprar créditos via PIX."); setAuthMode("login"); }}>Comprar</button>
            </div>

            <div className="planCard">
              <h3>50 Créditos</h3>
              <strong>R$ 39,90</strong>
              <p>Boa opção para locadores com consultas frequentes.</p>
              <button className="btn outline full" onClick={() => { setMessage("Entre ou cadastre-se para comprar créditos via PIX."); setAuthMode("login"); }}>Comprar</button>
            </div>

            <div className="planCard">
              <h3>100 Créditos</h3>
              <strong>R$ 69,90</strong>
              <p>Mais economia para quem consulta com regularidade.</p>
              <button className="btn outline full" onClick={() => { setMessage("Entre ou cadastre-se para comprar créditos via PIX."); setAuthMode("login"); }}>Comprar</button>
            </div>

            <div className="planCard unlimited">
              <div className="recommended">Mais indicado para locadoras</div>
              <h3>Ilimitado Mensal</h3>
              <strong>R$ 97,00</strong>
              <p>Consultas ilimitadas durante 30 dias.</p>
              <button className="btn primary full" onClick={() => { setMessage("Entre ou cadastre-se para assinar via PIX."); setAuthMode("login"); }}>Assinar por 30 dias</button>
            </div>
          </div>
        </section>

        <section className="how">
          <h2>Como funciona</h2>

          <div className="steps">
            <div>
              <span>01</span>
              <h4>Cadastre-se</h4>
              <p>Crie sua conta e receba 20 créditos grátis.</p>
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
        </section>
      </main>

      <div className="heroActions" style={{ justifyContent: "center", marginBottom: "24px" }}>
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
              {authMode === "login"
                ? "Entrar na LocaCheck"
                : "Criar conta grátis"}
            </h2>

            <p>
              {authMode === "login"
                ? "Acesse seu painel para consultar locatários."
                : "Cadastre-se e receba 20 créditos grátis."}
            </p>

            <button
              type="button"
              className="switchAuth"
              onClick={() => setShowTermsPrivacy(true)}
            >
              Ver Termos de Uso e Política de Privacidade
            </button>

            <form
              onSubmit={authMode === "login" ? entrarUsuario : cadastrarUsuario}
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
                    type="text"
                    placeholder="WhatsApp"
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(e.target.value)}
                    required
                  />
                </>
              )}

              <input
                type="email"
                placeholder="E-mail"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />

              <input
                type="password"
                placeholder="Senha"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                required
              />

              <button className="btn primary full" disabled={loading}>
                {loading
                  ? "Aguarde..."
                  : authMode === "login"
                  ? "Entrar"
                  : "Cadastrar grátis"}
              </button>
            </form>

            {message && <div className="authMessage">{message}</div>}

            <button
              className="switchAuth"
              onClick={() => {
                setMessage("");
                setAuthMode(authMode === "login" ? "cadastro" : "login");
              }}
            >
              {authMode === "login" ? "Ainda não tenho conta" : "Já tenho conta"}
            </button>
          </div>
        </div>
      )}


      {showTermsPrivacy && (
        <div className="modalOverlay">
          <div className="recordModal">
            <button
              className="closeModal"
              onClick={() => setShowTermsPrivacy(false)}
            >
              ×
            </button>

            <h2>Termos de Uso e Política de Privacidade</h2>

            <div className="resultsBox">
              <div className="resultCard">
                <h3>Uso responsável da plataforma</h3>
                <p>
                  A LocaCheck é uma ferramenta de apoio para locadoras, frotistas
                  e empresas que desejam registrar e consultar ocorrências
                  relacionadas à locação de veículos.
                </p>
              </div>

              <div className="resultCard">
                <h3>Proteção de dados e LGPD</h3>
                <p>
                  Os dados cadastrados devem ser verdadeiros, necessários e
                  relacionados a uma ocorrência real. A plataforma reduz a
                  exposição de dados pessoais, como exibição de CPF mascarado para
                  usuários comuns.
                </p>
              </div>

              <div className="resultCard">
                <h3>Responsabilidade do usuário</h3>
                <p>
                  Quem cadastra uma ocorrência declara que possui base legítima
                  para o registro e que as informações fornecidas são corretas.
                </p>
              </div>

              <div className="resultCard">
                <h3>Consultas e auditoria</h3>
                <p>
                  Consultas podem consumir créditos e podem ser registradas para
                  segurança, auditoria e prevenção de uso indevido.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
