import { supabaseAdmin } from '../_utils/supabaseAdmin.js';

function normalizeStatus(status) {
  return String(status || '').toLowerCase().trim();
}

function extractTransactionId(payload) {
  return (
    payload.id ||
    payload.transaction_id ||
    payload.payment_id ||
    payload.pix_id ||
    payload.charge_id ||
    payload.external_id ||
    payload?.data?.id ||
    payload?.data?.transaction_id ||
    payload?.data?.payment_id ||
    null
  );
}

function extractStatus(payload) {
  return (
    payload.status ||
    payload.payment_status ||
    payload.transaction_status ||
    payload?.data?.status ||
    payload?.data?.payment_status ||
    ''
  );
}

function isPaidStatus(status) {
  const normalized = normalizeStatus(status);

  return [
    'paid',
    'approved',
    'completed',
    'confirmed',
    'success',
    'succeeded',
    'pago',
  ].includes(normalized);
}

async function saveWebhookLog({
  transactionId,
  status,
  payload,
  processingResult = null,
  errorMessage = null,
}) {
  try {
    await supabaseAdmin.from('pushinpay_webhook_logs').insert({
      transaction_id: transactionId || null,
      status: status || null,
      raw_payload: payload || {},
      processing_result: processingResult,
      error_message: errorMessage,
    });
  } catch (logError) {
    console.error('Erro ao salvar log do webhook:', logError);
  }
}

export default async function handler(req, res) {
  let payload = {};
  let transactionId = null;
  let status = '';

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

    payload = req.body || {};
    transactionId = extractTransactionId(payload);
    status = normalizeStatus(extractStatus(payload));

    console.log('Webhook PushinPay recebido:', JSON.stringify(payload));
    console.log('Transaction ID extraído:', transactionId);
    console.log('Status extraído:', status);

    if (!transactionId) {
      await saveWebhookLog({
        transactionId: null,
        status,
        payload,
        errorMessage: 'ID da transação não encontrado no payload',
      });

      return res.status(200).json({
        success: false,
        message: 'ID da transação não encontrado no payload',
      });
    }

    const { data: payment, error: paymentError } = await supabaseAdmin
      .from('payments')
      .select('id, pushinpay_id, gateway_transaction_id, status, processed_at')
      .or(`pushinpay_id.eq.${transactionId},gateway_transaction_id.eq.${transactionId}`)
      .maybeSingle();

    if (paymentError) {
      await saveWebhookLog({
        transactionId,
        status,
        payload,
        errorMessage: paymentError.message,
      });

      return res.status(500).json({
        success: false,
        message: 'Erro ao buscar pagamento',
        error: paymentError.message,
      });
    }

    if (!payment) {
      await saveWebhookLog({
        transactionId,
        status,
        payload,
        errorMessage: 'Pagamento não encontrado no Supabase',
      });

      return res.status(200).json({
        success: false,
        message: 'Pagamento não encontrado no Supabase',
        transactionId,
        status,
      });
    }

    if (!isPaidStatus(status)) {
      const updateResult = await supabaseAdmin
        .from('payments')
        .update({
          status: status || 'pending',
          gateway_payload: payload,
          updated_at: new Date().toISOString(),
        })
        .eq('id', payment.id)
        .is('processed_at', null);

      await saveWebhookLog({
        transactionId,
        status,
        payload,
        processingResult: {
          message: 'Webhook recebido, mas status ainda não é pago',
          updateResult,
        },
      });

      return res.status(200).json({
        success: true,
        message: 'Webhook recebido, mas pagamento ainda não aprovado',
        transactionId,
        status,
      });
    }

    const { data, error } = await supabaseAdmin.rpc('process_paid_payment', {
      p_gateway_transaction_id: transactionId,
      p_gateway_payload: payload,
    });

    if (error) {
      await saveWebhookLog({
        transactionId,
        status,
        payload,
        errorMessage: error.message,
      });

      return res.status(500).json({
        success: false,
        message: 'Erro ao processar pagamento',
        error: error.message,
      });
    }

    await saveWebhookLog({
      transactionId,
      status,
      payload,
      processingResult: data,
    });

    return res.status(200).json({
      success: true,
      message: 'Webhook processado',
      result: data,
    });
  } catch (error) {
    console.error('Erro geral no webhook PushinPay:', error);

    await saveWebhookLog({
      transactionId,
      status,
      payload,
      errorMessage: error.message || 'Erro interno desconhecido',
    });

    return res.status(500).json({
      success: false,
      message: 'Erro interno no webhook',
      error: error.message,
    });
  }
}