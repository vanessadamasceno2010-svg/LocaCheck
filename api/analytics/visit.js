import { supabaseAdmin } from '../_utils/supabaseAdmin.js';

const SESSION_KEY_PATTERN = /^[a-zA-Z0-9_-]{16,100}$/;

function getFortalezaDate() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Fortaleza',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

function sanitizePath(value) {
  const path = String(value || '/').trim();
  if (!path.startsWith('/')) return '/';
  return path.split('?')[0].slice(0, 250) || '/';
}

function isSameOriginRequest(req) {
  const origin = String(req.headers.origin || '').trim();
  if (!origin) return true;

  const forwardedHost = String(req.headers['x-forwarded-host'] || req.headers.host || '').split(',')[0].trim();
  if (!forwardedHost) return true;

  try {
    return new URL(origin).host === forwardedHost;
  } catch {
    return false;
  }
}

async function getOptionalUserId(req) {
  const authHeader = String(req.headers.authorization || '');
  const accessToken = authHeader.replace(/^Bearer\s+/i, '').trim();

  if (!accessToken) return null;

  const { data, error } = await supabaseAdmin.auth.getUser(accessToken);
  if (error || !data?.user?.id) return null;
  return data.user.id;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Método não permitido.' });
  }

  try {
    if (!isSameOriginRequest(req)) {
      return res.status(403).json({ success: false, message: 'Origem da visita não permitida.' });
    }

    const sessionKey = String(req.body?.sessionKey || '').trim();

    if (!SESSION_KEY_PATTERN.test(sessionKey)) {
      return res.status(400).json({ success: false, message: 'Identificador de visita inválido.' });
    }

    const userId = await getOptionalUserId(req);
    const visitDate = getFortalezaDate();
    const now = new Date().toISOString();
    const payload = {
      session_key: sessionKey,
      visit_date: visitDate,
      path: sanitizePath(req.body?.path),
      last_seen_at: now,
    };

    if (userId) payload.user_id = userId;

    const { error } = await supabaseAdmin
      .from('site_visits')
      .upsert(payload, { onConflict: 'session_key,visit_date' });

    if (error) {
      console.error('Erro ao registrar visita:', error);
      return res.status(500).json({ success: false, message: 'Não foi possível registrar a visita.' });
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Erro inesperado ao registrar visita:', error);
    return res.status(500).json({ success: false, message: 'Erro inesperado ao registrar visita.' });
  }
}
