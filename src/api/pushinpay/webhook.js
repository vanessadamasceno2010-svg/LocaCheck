import { supabaseAdmin } from '../_utils/supabaseAdmin.js';

function normalizeStatus(status) {
  return String(status || '').toLowerCase().trim();
}

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({
        success: false,
        message: 'Método não permitido',
      });
    }

    const webhookSecret = process.env.WEBHOOK_SECRET;
    const secretFromQuery = String(req.query.secret || '');

    if (!webhookSecret || secretFromQuery !== webhookSecret) {
      return res.status(401).json({
        success: false,
        message: 'Webhook não autorizado',
      });
    }

    const payload = req.body;

    const transactionId = payload.id;
    const status = normalizeStatus(payload.status);

    if (!transactionId) {
      return res.status(400).json({
        success: false,
        message: 'ID da transação não informado',
      });
    }

    await supabaseAdmin.from('activity_logs').insert({
      action: 'pushinpay_webhook_received',
      details: payload,
      created_at: new Date().toISOString(),
    });

    if (status !== 'paid') {
      await supabaseAdmin
        .from('payments')
        .update({
          status: status || 'pending',
          gateway_payload: payload,
          updated_at: new Date().toISOString(),
        })
        .eq('gateway', 'pushinpay')
        .eq('gateway_transaction_id', transactionId)
        .is('processed_at', null);

      return res.status(200).json({
        success: true,
        message: 'Webhook recebido, pagamento ainda não aprovado',
      });
    }

    const { data, error } = await supabaseAdmin.rpc('process_paid_payment', {
      p_gateway_transaction_id: transactionId,
      p_gateway_payload: payload,
    });

    if (error) {
      console.error('Erro ao processar pagamento:', error);

      return res.status(500).json({
        success: false,
        message: 'Erro ao processar pagamento',
        error: error.message,
      });
    }

    return res.status(200).json(data);
  } catch (error) {
    console.error('Erro webhook PushinPay:', error);

    return res.status(500).json({
      success: false,
      message: 'Erro interno no webhook',
    });
  }
}