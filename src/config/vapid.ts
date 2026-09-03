// VAPID Public Key for Web Push Subscriptions
// Can be overridden by import.meta.env.VITE_VAPID_PUBLIC_KEY
export const DEFAULT_VAPID_PUBLIC_KEY =
  'BPm2hM6BKJwvlaFW_B4knSdWcCEHi5LfccBjDbSKjhLdQQuVJQJoLKnZZPGkPP0Tx-vqOWV7KmiVBxGCtAocoq8';

export function getVapidPublicKey(): string {
  return import.meta.env.VITE_VAPID_PUBLIC_KEY || DEFAULT_VAPID_PUBLIC_KEY;
}

// Utility to convert Base64 URL-safe string to Uint8Array for PushManager
export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
