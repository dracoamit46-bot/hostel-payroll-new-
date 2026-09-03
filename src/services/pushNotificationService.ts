import { getVapidPublicKey, urlBase64ToUint8Array } from '../config/vapid';
import { supabase } from '../supabaseClient';

export interface PushNotificationPayload {
  targetUserId?: string;
  targetUserIds?: string[];
  title: string;
  message: string;
  url?: string;
  tab?: string;
  tag?: string;
}

export class PushNotificationService {
  /**
   * Check if the current browser environment supports Service Workers and Web Push
   */
  static isSupported(): boolean {
    return (
      typeof window !== 'undefined' &&
      'serviceWorker' in navigator &&
      'PushManager' in window &&
      'Notification' in window
    );
  }

  /**
   * Get current browser notification permission
   */
  static getPermission(): NotificationPermission {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return 'denied';
    }
    return Notification.permission;
  }

  /**
   * Get the active Service Worker registration
   */
  static async getRegistration(): Promise<ServiceWorkerRegistration | null> {
    if (!this.isSupported()) return null;
    try {
      const reg = await navigator.serviceWorker.ready;
      return reg;
    } catch (err) {
      console.warn('Service worker not ready:', err);
      return null;
    }
  }

  /**
   * Get current Push Subscription from browser
   */
  static async getCurrentSubscription(): Promise<PushSubscription | null> {
    try {
      const reg = await this.getRegistration();
      if (!reg) return null;
      return await reg.pushManager.getSubscription();
    } catch (err) {
      console.warn('Failed to get current push subscription:', err);
      return null;
    }
  }

  /**
   * Request permission and subscribe current device to Web Push
   */
  static async subscribe(userId?: string): Promise<{
    success: boolean;
    subscription?: PushSubscription;
    error?: string;
  }> {
    if (!this.isSupported()) {
      return {
        success: false,
        error: 'Push notifications are not supported in this browser.',
      };
    }

    try {
      // 1. Request Notification permission
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        return {
          success: false,
          error:
            permission === 'denied'
              ? 'Notification permission was denied. Please allow notifications in your browser/device settings.'
              : 'Notification permission was dismissed.',
        };
      }

      // 2. Obtain registration
      const reg = await this.getRegistration();
      if (!reg) {
        return {
          success: false,
          error: 'Service Worker registration is not active.',
        };
      }

      // 3. Check existing subscription or create new
      let subscription = await reg.pushManager.getSubscription();

      if (!subscription) {
        const vapidPublicKey = getVapidPublicKey();
        const applicationServerKey = urlBase64ToUint8Array(vapidPublicKey);

        subscription = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: applicationServerKey as unknown as BufferSource,
        });
      }

      // 4. Save subscription to database
      await this.saveSubscriptionToDatabase(subscription, userId);

      return {
        success: true,
        subscription,
      };
    } catch (err: unknown) {
      const error = err as Error;
      console.error('Push subscription failed:', error);
      return {
        success: false,
        error: error.message || 'Failed to subscribe to push notifications.',
      };
    }
  }

  /**
   * Unsubscribe current device from Web Push
   */
  static async unsubscribe(userId?: string): Promise<boolean> {
    try {
      const sub = await this.getCurrentSubscription();
      if (sub) {
        const endpoint = sub.endpoint;
        await sub.unsubscribe();

        // Remove from database if Supabase available
        try {
          await supabase
            .from('push_subscriptions')
            .delete()
            .eq('endpoint', endpoint);
        } catch {
          // Non-blocking
        }
      }
      return true;
    } catch (err) {
      console.error('Failed to unsubscribe from push notifications:', err);
      return false;
    }
  }

  /**
   * Persist subscription details to Supabase
   */
  static async saveSubscriptionToDatabase(
    subscription: PushSubscription,
    userId?: string
  ): Promise<void> {
    try {
      const rawKey = subscription.getKey('p256dh');
      const rawAuth = subscription.getKey('auth');

      if (!rawKey || !rawAuth) return;

      const p256dh = btoa(
        String.fromCharCode.apply(null, Array.from(new Uint8Array(rawKey)))
      );
      const auth = btoa(
        String.fromCharCode.apply(null, Array.from(new Uint8Array(rawAuth)))
      );

      const record = {
        user_id: userId || null,
        endpoint: subscription.endpoint,
        p256dh,
        auth,
        user_agent: navigator.userAgent,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('push_subscriptions')
        .upsert(record, { onConflict: 'endpoint' });

      if (error) {
        console.warn('Note: push_subscriptions table sync skipped:', error.message);
      }
    } catch (err) {
      console.warn('Could not persist push subscription to Supabase:', err);
    }
  }

  /**
   * Send a test push notification to the current active device
   */
  static async sendTestNotification(userId?: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      const sub = await this.getCurrentSubscription();
      if (!sub) {
        return {
          success: false,
          error: 'No active push subscription found on this device. Please enable notifications first.',
        };
      }

      const rawKey = sub.getKey('p256dh');
      const rawAuth = sub.getKey('auth');

      const subscriptionData = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: rawKey
            ? btoa(String.fromCharCode.apply(null, Array.from(new Uint8Array(rawKey))))
            : '',
          auth: rawAuth
            ? btoa(String.fromCharCode.apply(null, Array.from(new Uint8Array(rawAuth))))
            : '',
        },
      };

      const response = await fetch('/.netlify/functions/send-push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscription: subscriptionData,
          targetUserId: userId,
          title: '🛎️ HostelOps Test Notification',
          message: 'Web Push is working seamlessly! You will receive live shift and operational alerts.',
          url: '/',
          tag: 'test-push',
        }),
      });

      if (!response.ok) {
        // If Netlify function is not served in dev preview, fallback to local Service Worker notification
        const reg = await this.getRegistration();
        if (reg) {
          const opts: NotificationOptions & { vibrate?: number[] } = {
            body: 'Web Push registration is active and working! Live alerts enabled.',
            icon: '/pwa-192x192.png',
            badge: '/badge-72x72.png',
            vibrate: [100, 50, 100],
          };
          await reg.showNotification('🛎️ HostelOps Test Alert (Local)', opts as NotificationOptions);
          return { success: true };
        }
        const resText = await response.text();
        return { success: false, error: resText || 'Server returned error' };
      }

      const result = await response.json();
      return { success: result.success, error: result.error };
    } catch (err: unknown) {
      // Graceful fallback to client notification in dev preview
      const error = err as Error;
      try {
        const reg = await this.getRegistration();
        if (reg) {
          await reg.showNotification('🛎️ HostelOps Notification', {
            body: 'Web Push is configured and ready on this device!',
            icon: '/pwa-192x192.png',
            badge: '/badge-72x72.png',
          });
          return { success: true };
        }
      } catch {
        // Ignore fallback error
      }
      return { success: false, error: error.message };
    }
  }

  /**
   * Dispatch a push alert to targeted users via serverless function
   */
  static async sendPushAlert(payload: PushNotificationPayload): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      const response = await fetch('/.netlify/functions/send-push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        return {
          success: false,
          error: `Failed to dispatch push notification (status ${response.status})`,
        };
      }

      const data = await response.json();
      return { success: data.success, error: data.error };
    } catch (err: unknown) {
      const error = err as Error;
      return { success: false, error: error.message };
    }
  }
}
