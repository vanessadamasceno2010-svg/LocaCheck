import { supabaseAdmin } from '../_utils/supabaseAdmin.js';

function isSameOriginRequest(req) {
  const origin = String(req.headers.origin || '').trim();
  if (!origin) return true;

  const host = String(req.headers['x-forwarded-host'] || req.headers.host || '').split(',')[0].trim();
  if (!host) return false;

  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function normalizeWhatsapp(value) {
  let digits = String(value || '').replace(/\D/g, '');
  if (digits.startsWith('55') && (digits.length === 12 || digits.length === 13)) digits = digits.slice(2);
  return digits;
}

function validEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

async function getAuthenticatedAdmin(req) {
  const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '').trim();
  if (!token) return { error: 'Sessão administrativa não informada.', status: 401 };

  const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(token);
  if (authError || !authData?.user?.id) return { error: 'Sessão administrativa inválida.', status: 401 };

  const { data: adminProfile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('id,nome,email,role')
    .eq('id', authData.user.id)
    .maybeSingle();

  if (profileError || String(adminProfile?.role || '').toLowerCase() !== 'admin') {
    return { error: 'Acesso permitido somente para administradores.', status: 403 };
  }

  return { user: authData.user, profile: adminProfile };
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'PATCH') {
    return res.status(405).json({ success: false, message: 'Método não permitido.' });
  }

  if (!isSameOriginRequest(req)) {
    return res.status(403).json({ success: false, message: 'Origem da solicitação não permitida.' });
  }

  try {
    const admin = await getAuthenticatedAdmin(req);
    if (admin.error) return res.status(admin.status).json({ success: false, message: admin.error });

    const userId = String(req.body?.userId || '').trim();
    const name = String(req.body?.name || '').trim().replace(/\s+/g, ' ');
    const email = normalizeEmail(req.body?.email);
    const whatsapp = normalizeWhatsapp(req.body?.whatsapp);
    const password = String(req.body?.password || '');

    if (!/^[0-9a-f-]{36}$/i.test(userId)) {
      return res.status(400).json({ success: false, message: 'Usuário inválido.' });
    }
    if (name.length < 2 || name.length > 120) {
      return res.status(400).json({ success: false, message: 'Informe um nome válido com até 120 caracteres.' });
    }
    if (!validEmail(email) || email.length > 254) {
      return res.status(400).json({ success: false, message: 'Informe um e-mail válido.' });
    }
    if (![10, 11].includes(whatsapp.length)) {
      return res.status(400).json({ success: false, message: 'Informe um WhatsApp válido com DDD.' });
    }
    if (password && (password.length < 8 || password.length > 72)) {
      return res.status(400).json({ success: false, message: 'A nova senha deve ter entre 8 e 72 caracteres.' });
    }

    const { data: originalAuthResult, error: originalAuthError } = await supabaseAdmin.auth.admin.getUserById(userId);
    const originalAuthUser = originalAuthResult?.user;
    if (originalAuthError || !originalAuthUser) {
      return res.status(404).json({ success: false, message: 'Conta de autenticação não encontrada.' });
    }

    const { data: originalProfile, error: originalProfileError } = await supabaseAdmin
      .from('profiles')
      .select('id,nome,email,whatsapp')
      .eq('id', userId)
      .maybeSingle();
    if (originalProfileError || !originalProfile) {
      return res.status(404).json({ success: false, message: 'Perfil do usuário não encontrado.' });
    }

    const { data: duplicateWhatsapp } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .neq('id', userId)
      .eq('whatsapp', whatsapp)
      .limit(1);
    if (duplicateWhatsapp?.length) {
      return res.status(409).json({ success: false, message: 'Este WhatsApp já está vinculado a outra conta.' });
    }

    const authChanges = {};
    if (normalizeEmail(originalAuthUser.email) !== email) {
      authChanges.email = email;
      authChanges.email_confirm = true;
    }
    if (password) authChanges.password = password;

    if (Object.keys(authChanges).length > 0) {
      const { error: authUpdateError } = await supabaseAdmin.auth.admin.updateUserById(userId, authChanges);
      if (authUpdateError) {
        return res.status(400).json({ success: false, message: authUpdateError.message || 'Não foi possível atualizar o acesso do usuário.' });
      }
    }

    const { error: profileUpdateError } = await supabaseAdmin
      .from('profiles')
      .update({ nome: name, email, whatsapp })
      .eq('id', userId);

    if (profileUpdateError) {
      if (authChanges.email) {
        await supabaseAdmin.auth.admin.updateUserById(userId, {
          email: originalAuthUser.email,
          email_confirm: Boolean(originalAuthUser.email_confirmed_at),
        });
      }
      return res.status(400).json({ success: false, message: profileUpdateError.message || 'Não foi possível atualizar o perfil.' });
    }

    const details = {
      target_user_id: userId,
      target_name: name,
      changed_name: originalProfile.nome !== name,
      changed_email: normalizeEmail(originalProfile.email) !== email,
      changed_whatsapp: normalizeWhatsapp(originalProfile.whatsapp) !== whatsapp,
      changed_password: Boolean(password),
    };

    await supabaseAdmin.from('activity_logs').insert({
      user_id: admin.user.id,
      action: password ? 'admin_user_password_changed' : 'admin_user_updated',
      details,
    });

    return res.status(200).json({
      success: true,
      user: { id: userId, nome: name, email, whatsapp },
      passwordChanged: Boolean(password),
    });
  } catch (error) {
    console.error('Erro inesperado ao editar usuário:', error);
    return res.status(500).json({ success: false, message: 'Erro inesperado ao editar o usuário.' });
  }
}
