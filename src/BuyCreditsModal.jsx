const PLANOS = [
  {
    name: "20 Créditos",
    price: "R$ 19,90",
    description: "Ideal para começar e testar a plataforma.",
    type: "credits",
    credits: 20,
  },
  {
    name: "50 Créditos",
    price: "R$ 39,90",
    description: "Boa opção para locadores com consultas frequentes.",
    type: "credits",
    credits: 50,
  },
  {
    name: "100 Créditos",
    price: "R$ 69,90",
    description: "Mais economia para quem consulta com regularidade.",
    type: "credits",
    credits: 100,
  },
  {
    name: "Ilimitado Mensal",
    price: "R$ 97,00",
    description: "Consultas ilimitadas durante 30 dias.",
    type: "unlimited",
    credits: 0,
    featured: true,
  },
];

function BuyCreditsModal({ onClose }) {
  function escolherPlano(plano) {
    alert(
      `Plano selecionado: ${plano.name}\n\nNa próxima etapa vamos gerar o Pix automaticamente pela PushinPay.`
    );
  }

  return (
    <div className="modalOverlay">
      <div className="recordModal">
        <button className="closeModal" onClick={onClose}>
          ×
        </button>

        <h2>Comprar Créditos</h2>

        <p>
          Escolha um plano para continuar. A integração Pix com PushinPay será
          ativada na próxima fase.
        </p>

        <div className="buyPlansGrid">
          {PLANOS.map((plano) => (
            <div
              className={`buyPlanCard ${plano.featured ? "featuredPlan" : ""}`}
              key={plano.name}
            >
              {plano.featured && (
                <div className="recommended">Mais indicado para locadoras</div>
              )}

              <h3>{plano.name}</h3>
              <strong>{plano.price}</strong>
              <p>{plano.description}</p>

              <button
                className={`btn full ${
                  plano.featured ? "secondary" : "primary"
                }`}
                onClick={() => escolherPlano(plano)}
              >
                {plano.type === "unlimited"
                  ? "Assinar por 30 dias"
                  : "Comprar créditos"}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default BuyCreditsModal;