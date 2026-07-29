import webpush from 'web-push';
import db from './db.js';

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:admin@example.com';

export const pushEnabled = Boolean(VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY);

if (pushEnabled) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
} else {
  console.warn('VAPID_PUBLIC_KEY/VAPID_PRIVATE_KEY não configuradas — notificações push desativadas.');
}

export function getVapidPublicKey() {
  return VAPID_PUBLIC_KEY || null;
}

export function saveSubscription(usuarioId, subscription) {
  db.prepare(
    `INSERT INTO push_subscriptions (usuario_id, endpoint, p256dh, auth)
     VALUES (@usuario_id, @endpoint, @p256dh, @auth)
     ON CONFLICT(endpoint) DO UPDATE SET usuario_id = excluded.usuario_id, p256dh = excluded.p256dh, auth = excluded.auth`
  ).run({
    usuario_id: usuarioId,
    endpoint: subscription.endpoint,
    p256dh: subscription.keys.p256dh,
    auth: subscription.keys.auth,
  });
}

export function removeSubscription(endpoint) {
  db.prepare('DELETE FROM push_subscriptions WHERE endpoint = ?').run(endpoint);
}

export async function sendNotificationToAll(payload) {
  if (!pushEnabled) return { sent: 0, skipped: true };

  const subs = db.prepare('SELECT * FROM push_subscriptions').all();
  const body = JSON.stringify(payload);
  let sent = 0;

  for (const sub of subs) {
    const subscription = {
      endpoint: sub.endpoint,
      keys: { p256dh: sub.p256dh, auth: sub.auth },
    };
    try {
      await webpush.sendNotification(subscription, body);
      sent += 1;
    } catch (err) {
      if (err.statusCode === 404 || err.statusCode === 410) {
        removeSubscription(sub.endpoint);
      } else {
        console.error('Falha ao enviar push:', err.message);
      }
    }
  }

  return { sent, skipped: false };
}
