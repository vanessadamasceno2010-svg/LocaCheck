import { createClient } from '@supabase/supabase-js';
import { supabaseAdmin } from '../_utils/supabaseAdmin.js';

function getBearerToken(req) {
  const authHeader = req.headers.authorization;

  if (!authHeader) return null;

  const [type, token] = authHeader.split(' ');

  if (type !== 'Bearer' || !token) return null;

  return token;
}

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({
        success: false,
        message: 'Método não permitido',
      });
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
    const pushinpayToken = process.env.PUSHINPAY_TOKEN;
    const pushinpayBaseUrl =
      process.env.PUSHINPAY_BASE_URL || 'https://api.pushinpay.com.br/api';
    const webhookSecret = process.env.WEBHOOK_SECRET;
    const vercelAppUrl = process.env.VERCEL_APP_URL;

    if (!supabaseUrl || !supabaseAnonKey) {
      return res.status(500).json({
        success: false,
        message: 'Supabase não configurado no servidor',
      });
    }

    if (!pushinpayToken) {
      return res.status(500).json({
        success: false,
        message: 'Token PushinPay não configurado',
      });
    }

    if (!webhookSecret || !vercelAppUrl) {
      return res.status(500).json({
        success: false,
        message: 'Webhook não configurado',
      });
    }

    const token = getBearerToken(req);

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Usuário não autenticado',
      });
    }

    const supabaseUserClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    });

    const {
      data: { user },
      error: userError,
    } = await supabaseUserClient.auth.getUser();

    if (userError || !user) {
      return res.status(401).json({
        success: false,
        message: 'Sessão inválida',
      });
    }

    const { planId } = req.body;

    if (!planId) {
      return res.status(400).json({
        success: false,
        message: 'Plano não informado',
      });
    }

    const { data: plan, error: planError } = await supabaseAdmin
      .from('plans')
      .select('*')
      .eq('id', planId)
      .neq('active', false)
      .single();

    if (planError || !plan) {
      return res.status(404).json({
        success: false,
        message: 'Plano não encontrado',
      });
    }

    const priceCents = Number(plan.price_cents || 0) > 0
      ? Number(plan.price_cents)
      : Math.round(Number(plan.price || 0) * 100);

    const planType = plan.plan_type || (plan.is_unlimited ? 'unlimited' : 'credits');

    if (!priceCents || priceCents < 50) {
      return res.status(400).json({
        success: false,
        message: 'Valor do plano inválido. Edite o plano no painel admin e informe um preço maior que R$ 0,50.',
      });
    }

    const { data: payment, error: paymentError } = await supabaseAdmin
      .from('payments')
      .insert({
        user_id: user.id,
        plan_id: plan.id,
        gateway: 'pushinpay',
        amount_cents: priceCents,
        amount: priceCents,
        credits: Number(plan.credits || 0),
        plan_type: planType,
        status: 'pending',
      })
      .select('id')
      .single();

    if (paymentError || !payment) {
      return res.status(500).json({
        success: false,
        message: 'Erro ao criar pagamento interno',
        error: paymentError?.message,
      });
    }

    const webhookUrl = `${vercelAppUrl}/api/pushinpay/webhook?secret=${encodeURIComponent(
      webhookSecret
    )}`;

    const pushinpayResponse = await fetch(`${pushinpayBaseUrl}/pix/cashIn`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${pushinpayToken}`,
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        value: priceCents,
        webhook_url: webhookUrl,
      }),
    });

    const pushinpayData = await pushinpayResponse.json();

    if (!pushinpayResponse.ok) {
      await supabaseAdmin
        .from('payments')
        .update({
          status: 'failed',
          gateway_payload: pushinpayData,
          updated_at: new Date().toISOString(),
        })
        .eq('id', payment.id);

      return res.status(pushinpayResponse.status).json({
        success: false,
        message: 'Erro ao gerar PIX na PushinPay',
        details: pushinpayData,
      });
    }

    const transactionId = pushinpayData.id;

    const { error: updateError } = await supabaseAdmin
      .from('payments')
      .update({
        pushinpay_id: transactionId,
        gateway_transaction_id: transactionId,
        pix_code: pushinpayData.qr_code,
        pix_qr_code_base64: pushinpayData.qr_code_base64 || null,
        gateway_payload: pushinpayData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', payment.id);

    if (updateError) {
      return res.status(500).json({
        success: false,
        message: 'PIX gerado, mas houve erro ao salvar no Supabase',
        error: updateError.message,
      });
    }

    return res.status(200).json({
      success: true,
      paymentId: payment.id,
      transactionId,
      status: pushinpayData.status,
      plan: {
        id: plan.id,
        name: plan.name,
        credits: plan.credits,
        price_cents: priceCents,
        is_unlimited: plan.is_unlimited,
      },
      pix: {
        qrCode: pushinpayData.qr_code,
        qrCodeBase64: pushinpayData.qr_code_base64,
      },
    });
  } catch (error) {
    console.error('Erro create-pix:', error);

    return res.status(500).json({
      success: false,
      message: 'Erro interno ao gerar PIX',
      error: error.message,
    });
  }
}