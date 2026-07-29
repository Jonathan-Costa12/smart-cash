import { api } from './api.js';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

export function isPushSupported() {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

export async function getCurrentSubscription() {
  if (!isPushSupported()) return null;
  const registration = await navigator.serviceWorker.ready;
  return registration.pushManager.getSubscription();
}

export async function subscribeToPush(token) {
  if (!isPushSupported()) throw new Error('Notificações push não são suportadas neste navegador');

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') throw new Error('Permissão de notificação negada');

  const { publicKey, enabled } = await api.vapidPublicKey();
  if (!enabled || !publicKey) throw new Error('Servidor não configurou as chaves de notificação (VAPID)');

  const registration = await navigator.serviceWorker.ready;
  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    });
  }

  await api.pushSubscribe(token, subscription.toJSON());
  return subscription;
}

export async function unsubscribeFromPush(token) {
  const subscription = await getCurrentSubscription();
  if (!subscription) return;
  await api.pushUnsubscribe(token, subscription.endpoint);
  await subscription.unsubscribe();
}
