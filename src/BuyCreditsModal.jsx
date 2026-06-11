import { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";
import { createPushinPayPix } from "./services/paymentService";

function formatMoney(cents) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(cents || 0) / 100);
}

function getQrCodeImageSrc(qrCodeBase64) {
  if (!qrCodeBase64) return "";

  if (qrCodeBase64.startsWith("data:image")) {
    return qrCodeBase64;
  }

  return `data:image/png;base64,${qrCodeBase64}`;
}

function BuyCreditsModal({ onClose }) {
  const [plans, setPlans] = useState([]);
  const [selectedPlanId, setSelectedPlanId] = useState("");
  const [loadingPlans, setLoadingPlans] = useState(false);
  const [generatingPix, setGeneratingPix] = useState(false);
  const [error, setError] = useState("");
  const [pixCode, setPixCode] = useState("");
  const [pixQrBase64, setPixQrBase64] = useState("");
  const [copied, setCopied] = useState(false);
  const [localToast, setLocalToast] = useState(null);

  function showLocalToast(type, title, message) {
    setLocalToast({ type, title, message });
    setTimeout(() => setLocalToast(null), 4200);
  }

  async function carregarPlanos() {
    setLoadingPlans(true);
    setError("");

    const { data, error: plansError } = await supabase
      .from("plans")
      .select("id, name, credits, price_cents, is_unlimited, duration_days, active")
      .eq("active", true)
      .order("price_cents", { ascending: true });

    if (plansError) {
      console.error("Erro ao carregar planos:", plansError);
      setError(
        "Não foi possível carregar os planos. Verifique se a tabela plans está configurada no Supabase."
      );
      setLoadingPlans(false);
      return;
    }

    setPlans(data || []);

    if (data && data.length > 0) {
      setSelectedPlanId(data[0].id);
    }

    setLoadingPlans(false);
  }

  async function gerarPix() {
    if (!selectedPlanId) {
      setError("Selecione um plano para continuar.");
      return;
    }

    setGeneratingPix(true);
    setError("");
    setPixCode("");
    setPixQrBase64("");
    setCopied(false);

    const response = await createPushinPayPix(selectedPlanId);

    if (!response.success) {
      setError(response.message || "Erro ao gerar PIX.");
      showLocalToast("error", "Erro ao gerar PIX", response.message || "Tente novamente.");
      setGeneratingPix(false);
      return;
    }

    setPixCode(response.pix?.qrCode || "");
    setPixQrBase64(response.pix?.qrCodeBase64 || "");
    showLocalToast("success", "PIX gerado", "Pague o PIX e aguarde a liberação automática.");
    setGeneratingPix(false);
  }

  async function copiarPix() {
    if (!pixCode) return;

    try {
      await navigator.clipboard.writeText(pixCode);
      setCopied(true);
      showLocalToast("success", "Código copiado", "O PIX copia e cola foi copiado.");

      setTimeout(() => {
        setCopied(false);
      }, 2500);
    } catch (err) {
      console.error("Erro ao copiar PIX:", err);
      setError("Não foi possível copiar automaticamente. Copie manualmente o código PIX.");
    }
  }

  function voltarParaPlanos() {
    setPixCode("");
    setPixQrBase64("");
    setCopied(false);
    setError("");
  }

  useEffect(() => {
    carregarPlanos();
  }, []);

  const selectedPlan = plans.find((plan) => plan.id === selectedPlanId);

  return (
    <div className="modalOverlay">
      {localToast && (
        <div className={`toastPopup ${localToast.type || "success"}`}>
          <strong>{localToast.title}</strong>
          <span>{localToast.message}</span>
        </div>
      )}

      <div className="recordModal buyCreditsModal compactModal">
        <button className="closeModal" onClick={onClose}>
          ×
        </button>

        <h2>Comprar Créditos</h2>

        {!pixCode && (
          <p>
            Escolha um plano. Todos os planos ficam visíveis em uma tela para facilitar a comparação.
          </p>
        )}

        {loadingPlans && (
          <div className="emptyState">
            <p>Carregando planos...</p>
          </div>
        )}

        {error && <div className="errorMessage">{error}</div>}

        {!loadingPlans && !pixCode && (
          <>
            {plans.length === 0 ? (
              <div className="emptyState">
                <p>Nenhum plano ativo encontrado.</p>
              </div>
            ) : (
              <div className="buyPlansGrid compactBuyPlansGrid">
                {plans.map((plano) => {
                  const isSelected = selectedPlanId === plano.id;
                  const isUnlimited = plano.is_unlimited === true;

                  return (
                    <button
                      className={`buyPlanCard compactBuyPlanCard ${
                        isUnlimited ? "featuredPlan" : ""
                      } ${isSelected ? "selectedPlan" : ""}`}
                      key={plano.id}
                      onClick={() => setSelectedPlanId(plano.id)}
                      type="button"
                    >
                      {isUnlimited && <span className="miniTag">Ilimitado</span>}

                      <h3>{plano.name}</h3>

                      <strong>{formatMoney(plano.price_cents)}</strong>

                      <p>
                        {isUnlimited
                          ? `${plano.duration_days || 30} dias de consultas ilimitadas.`
                          : `${plano.credits} consultas.`}
                      </p>

                      <small>{isSelected ? "Selecionado" : "Selecionar"}</small>
                    </button>
                  );
                })}
              </div>
            )}

            {selectedPlan && (
              <div className="selectedPlanSummary">
                Plano selecionado: <strong>{selectedPlan.name} - {formatMoney(selectedPlan.price_cents)}</strong>
              </div>
            )}

            <button
              className="btn full primary"
              onClick={gerarPix}
              disabled={generatingPix || loadingPlans || plans.length === 0}
              type="button"
            >
              {generatingPix ? "Gerando PIX..." : "Gerar PIX"}
            </button>
          </>
        )}

        {pixCode && (
          <div className="pixResultBox">
            <h3>PIX gerado com sucesso</h3>

            <p>Pague usando o QR Code ou copie o código PIX abaixo.</p>

            {pixQrBase64 && (
              <div className="qrCodeBox">
                <img src={getQrCodeImageSrc(pixQrBase64)} alt="QR Code PIX" />
              </div>
            )}

            <textarea value={pixCode} readOnly className="pixTextarea" />

            <button className="btn full primary" onClick={copiarPix} type="button">
              {copied ? "Código copiado!" : "Copiar código PIX"}
            </button>

            <button className="btn full secondary" onClick={() => window.location.reload()} type="button">
              Já paguei, atualizar página
            </button>

            <button className="btn full outline" onClick={voltarParaPlanos} type="button">
              Escolher outro plano
            </button>

            <p className="fieldHelp">
              Após o pagamento aprovado, os créditos serão liberados automaticamente pela PushinPay.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default BuyCreditsModal;
