import { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";

function SupportModal({ session, onClose }) {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [feedback, setFeedback] = useState("");
  const [loading, setLoading] = useState(false);

  async function carregarMensagens() {
    const { data, error } = await supabase
      .from("support_messages")
      .select("*")
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: false });

    if (!error) {
      setMessages(data || []);
    }
  }

  useEffect(() => {
    carregarMensagens();
  }, []);

  async function enviarMensagem(e) {
    e.preventDefault();

    if (!message.trim()) {
      setFeedback("Digite sua mensagem.");
      return;
    }

    setLoading(true);
    setFeedback("");

    const { error } = await supabase.from("support_messages").insert({
      user_id: session.user.id,
      message,
      status: "novo",
    });

    if (error) {
      console.log(error);
      setFeedback("Erro ao enviar mensagem.");
    } else {
      setFeedback("Mensagem enviada com sucesso.");
      setMessage("");
      carregarMensagens();
    }

    setLoading(false);
  }

  return (
    <div className="modalOverlay">
      <div className="recordModal">
        <button className="closeModal" onClick={onClose}>
          ×
        </button>

        <h2>Suporte</h2>

        <p>
          Envie uma mensagem para o suporte da LocaCheck. A resposta aparecerá
          aqui no seu painel.
        </p>

        <form onSubmit={enviarMensagem} className="recordForm">
          <textarea
            placeholder="Digite sua dúvida ou solicitação"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows="5"
            required
          />

          <button className="btn primary full" disabled={loading}>
            {loading ? "Enviando..." : "Enviar mensagem"}
          </button>
        </form>

        {feedback && <div className="authMessage">{feedback}</div>}

        <div className="resultsBox">
          {messages.map((item) => (
            <div className="resultCard" key={item.id}>
              <h3>Mensagem enviada</h3>

              <p>
                <strong>Sua mensagem:</strong> {item.message}
              </p>

              <p>
                <strong>Status:</strong> {item.status}
              </p>

              {item.reply && (
                <p>
                  <strong>Resposta do suporte:</strong> {item.reply}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default SupportModal;