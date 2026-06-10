import { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";
import { createPushinPayPix } from "./services/paymentService";

function formatMoney(cents) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100);
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
      setGeneratingPix(false);
      return;
    }

    setPixCode(response.pix?.qrCode || "");
    setPixQrBase64(response.pix?.qrCodeBase64 || "");

    setGeneratingPix(false);
  }

  async function copiarPix() {
    if (!pixCode) return;

    try {
      await navigator.clipboard.writeText(pixCode);
      setCopied(true);

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
      <div className="recordModal">
        <button className="closeModal" onClick={onClose}>
          ×
        </button>

        <h2>Comprar Créditos</h2>

        {!pixCode && (
          <p>
            Escolha um plano e gere o PIX. Após a confirmação do pagamento, os
            créditos serão liberados automaticamente.
          </p>
        )}

        {loadingPlans && (
          <div className="emptyState">
            <p>Carregando planos...</p>
          </div>
        )}

        {error && (
          <div
            style={{
              background: "#fee2e2",
              color: "#991b1b",
              padding: "12px",
              borderRadius: "10px",
              marginBottom: "16px",
              fontSize: "14px",
              fontWeight: "600",
            }}
          >
            {error}
          </div>
        )}

        {!loadingPlans && !pixCode && (
          <>
            {plans.length === 0 ? (
              <div className="emptyState">
                <p>Nenhum plano ativo encontrado.</p>
              </div>
            ) : (
              <div className="buyPlansGrid">
                {plans.map((plano) => {
                  const isSelected = selectedPlanId === plano.id;
                  const isUnlimited = plano.is_unlimited === true;

                  return (
                    <div
                      className={`buyPlanCard ${
                        isUnlimited ? "featuredPlan" : ""
                      }`}
                      key={plano.id}
                      style={{
                        border: isSelected ? "2px solid #2563eb" : undefined,
                      }}
                    >
                      {isUnlimited && (
                        <div className="recommended">
                          Mais indicado para locadoras
                        </div>
                      )}

                      <h3>{plano.name}</h3>

                      <strong>{formatMoney(plano.price_cents)}</strong>

                      <p>
                        {isUnlimited
                          ? `Consultas ilimitadas durante ${
                              plano.duration_days || 30
                            } dias.`
                          : `${plano.credits} consultas disponíveis.`}
                      </p>

                      <button
                        className={`btn full ${
                          isUnlimited ? "secondary" : "primary"
                        }`}
                        onClick={() => setSelectedPlanId(plano.id)}
                        type="button"
                      >
                        {isSelected ? "Plano selecionado" : "Selecionar plano"}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {selectedPlan && (
              <div
                style={{
                  marginTop: "18px",
                  padding: "14px",
                  borderRadius: "12px",
                  background: "#f8fafc",
                  border: "1px solid #e5e7eb",
                }}
              >
                <p style={{ margin: 0, fontSize: "14px" }}>
                  Plano selecionado:{" "}
                  <strong>
                    {selectedPlan.name} - {formatMoney(selectedPlan.price_cents)}
                  </strong>
                </p>
              </div>
            )}

            <button
              className="btn full primary"
              onClick={gerarPix}
              disabled={generatingPix || loadingPlans || plans.length === 0}
              type="button"
              style={{ marginTop: "18px" }}
            >
              {generatingPix ? "Gerando PIX..." : "Gerar PIX"}
            </button>
          </>
        )}

        {pixCode && (
          <div
            style={{
              marginTop: "18px",
              padding: "18px",
              borderRadius: "16px",
              background: "#f8fafc",
              border: "1px solid #e5e7eb",
              textAlign: "center",
            }}
          >
            <h3 style={{ marginTop: 0 }}>PIX gerado com sucesso</h3>

            <p style={{ fontSize: "14px", color: "#475569" }}>
              Pague usando o QR Code ou copie o código PIX abaixo.
            </p>

            {pixQrBase64 && (
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  margin: "16px 0",
                }}
              >
                <img
                  src={getQrCodeImageSrc(pixQrBase64)}
                  alt="QR Code PIX"
                  style={{
                    width: "220px",
                    height: "220px",
                    background: "#ffffff",
                    padding: "10px",
                    borderRadius: "12px",
                    border: "1px solid #e5e7eb",
                  }}
                />
              </div>
            )}

            <textarea
              value={pixCode}
              readOnly
              style={{
                width: "100%",
                minHeight: "110px",
                resize: "none",
                padding: "12px",
                borderRadius: "10px",
                border: "1px solid #d1d5db",
                fontSize: "12px",
                boxSizing: "border-box",
              }}
            />

            <button
              className="btn full primary"
              onClick={copiarPix}
              type="button"
              style={{ marginTop: "12px" }}
            >
              {copied ? "Código copiado!" : "Copiar código PIX"}
            </button>

            <button
              className="btn full secondary"
              onClick={voltarParaPlanos}
              type="button"
              style={{ marginTop: "10px" }}
            >
              Escolher outro plano
            </button>

            <p
              style={{
                marginTop: "14px",
                fontSize: "12px",
                color: "#64748b",
              }}
            >
              Após o pagamento, aguarde alguns instantes. A confirmação é feita
              automaticamente pela PushinPay.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default BuyCreditsModal;