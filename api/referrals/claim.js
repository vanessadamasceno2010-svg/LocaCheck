import { supabaseAdmin } from '../_utils/supabaseAdmin.js';

function sanitizeCode(value) {
  return String(value || '').trim();
}

function sanitizeUuid(value) {
  const text = String(value || '').trim();
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(text) ? text : '';
}

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({
        success: false,
        message: 'Método não permitido',
      });
    }

    const referralCode = sanitizeCode(req.body?.referralCode || req.body?.referral_code);
    const newUserId = sanitizeUuid(req.body?.newUserId || req.body?.new_user_id);

    if (!referralCode || !newUserId) {
      return res.status(400).json({
        success: false,
        message: 'Código de indicação ou usuário inválido.',
      });
    }

    const { data, error } = await supabaseAdmin.rpc('service_claim_referral_bonus', {
      p_new_user_id: newUserId,
      p_referral_code: referralCode,
    });

    if (error) {
      console.error('Erro ao aplicar bônus de indicação:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Erro ao aplicar indicação.',
      });
    }

    const success = Boolean(data?.success || data?.already_applied);

    return res.status(success ? 200 : 400).json({
      success,
      ...(data || {}),
    });
  } catch (error) {
    console.error('Erro inesperado na indicação:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro inesperado ao aplicar indicação.',
    });
  }
}
