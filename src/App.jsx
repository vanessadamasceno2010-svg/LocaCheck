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

  const [consultationHistory, setConsultationHistory] = useState([]);
  const [consultationHistoryMessage, setConsultationHistoryMessage] = useState("");
  const [paymentsHistory, setPaymentsHistory] = useState([]);
  const [paymentsHistoryMessage, setPaymentsHistoryMessage] = useState("");
  const [myRecords, setMyRecords] = useState([]);
  const [myRecordsMessage, setMyRecordsMessage] = useState("");

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

  const [adminUsers, setAdminUsers] = useState([]);
  const [adminUsersMessage, setAdminUsersMessage] = useState("");

  const [adminFinancialData, setAdminFinancialData] = useState(null);
  const [adminFinancialMessage, setAdminFinancialMessage] = useState("");
  const [loadingFinancialDashboard, setLoadingFinancialDashboard] = useState(false);

  const [editingRecord, setEditingRecord] = useState(null);
  const [editRecordNome, setEditRecordNome] = useState("");
  const [editRecordCpf, setEditRecordCpf] = useState("");
  const [editRecordWhatsapp, setEditRecordWhatsapp] = useState("");
  const [editRecordCidade, setEditRecordCidade] = useState("");
  const [editRecordTipos, setEditRecordTipos] = useState([]);
  const [editRecordDescricao, setEditRecordDescricao] = useState("");
  const [editRecordStatus, setEditRecordStatus] = useState("pendente");
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
    }
  }, [session, profile]);

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
          "Ocorrência registrada com sucesso! Breve a ocorrência já estará disponível para consulta na plataforma. Parabéns por contribuir com outros locadores."
        );
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
      setSearchMessage("Digite um nome, CPF ou cidade para consultar.");
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
    const { error } = await supabase
      .from("records")
      .update({
        status,
        approved_at: status === "aprovado" ? new Date().toISOString() : null,
      })
      .eq("id", id);

    if (error) {
      console.log(error);
      setAdminMessage("Erro ao atualizar ocorrência.");
      return;
    }

    setAdminMessage("Ocorrência atualizada com sucesso.");
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
        })
        .eq("id", editingRecord.id);

      if (error) {
        console.log(error);
        setEditRecordMessage("Erro ao salvar edição.");
        setLoading(false);
        return;
      }

      setEditRecordMessage("Ocorrência editada com sucesso.");
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
      .select("id, nome, cpf4, cidade, tipos, descricao, imagem_url, status, created_at, approved_at")
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

                    {(adminFinancialData.recent_payments || []).map((payment) => {
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
                  </div>
                </>
              )}
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
                  <span>Administração</span>
                  <h2>Ocorrências cadastradas</h2>
                  <p>Aprove, reprove, edite ou exclua ocorrências enviadas.</p>
                </div>

                <div className="adminButtons">
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
                {adminRecords.filter((item) =>
                  adminRecordFilter === "todos"
                    ? true
                    : item.status === adminRecordFilter
                ).length === 0 && (
                  <div className="adminEmpty">
                    Nenhuma ocorrência encontrada para este filtro.
                  </div>
                )}

                {adminRecords
                  .filter((item) =>
                    adminRecordFilter === "todos"
                      ? true
                      : item.status === adminRecordFilter
                  )
                  .map((item) => (
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
          {myRecords.map((item) => (
            <div className="resultCard" key={item.id}>
              <div className="adminRecordTop">
                <h3>{item.nome || "Locatário não informado"}</h3>
                <span className={`statusBadge ${item.status}`}>
                  {item.status || "pendente"}
                </span>
              </div>

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
          ))}
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
                Altere os dados completos da ocorrência. Para usuários comuns, o
                CPF continuará aparecendo apenas com os 4 últimos números.
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
                Digite nome, CPF completo ou cidade. A consulta desconta 1
                crédito ao buscar, exceto usuários com plano ilimitado ativo.
              </p>

              <form onSubmit={consultarLocatario} className="recordForm">
                <input
                  type="text"
                  placeholder="Nome, CPF ou cidade"
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
              <button className="btn outline full">Comprar</button>
            </div>

            <div className="planCard">
              <h3>50 Créditos</h3>
              <strong>R$ 39,90</strong>
              <p>Boa opção para locadores com consultas frequentes.</p>
              <button className="btn outline full">Comprar</button>
            </div>

            <div className="planCard">
              <h3>100 Créditos</h3>
              <strong>R$ 69,90</strong>
              <p>Mais economia para quem consulta com regularidade.</p>
              <button className="btn outline full">Comprar</button>
            </div>

            <div className="planCard unlimited">
              <div className="recommended">Mais indicado para locadoras</div>
              <h3>Ilimitado Mensal</h3>
              <strong>R$ 97,00</strong>
              <p>Consultas ilimitadas durante 30 dias.</p>
              <button className="btn primary full">Assinar por 30 dias</button>
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
              <p>Digite nome, CPF ou cidade e veja registros disponíveis.</p>
            </div>

            <div>
              <span>03</span>
              <h4>Proteja sua frota</h4>
              <p>Use as informações para decidir com mais segurança.</p>
            </div>
          </div>
        </section>
      </main>

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
    </div>
  );
}

export default App;
