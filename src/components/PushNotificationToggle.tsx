import React, { useState, useEffect } from 'react';
import { Bell, BellOff, BellRing, Send, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { PushNotificationService } from '../services/pushNotificationService';
import { useAuth } from '../context/AuthContext';

interface PushNotificationToggleProps {
  className?: string;
  variant?: 'card' | 'compact' | 'badge';
}

export const PushNotificationToggle: React.FC<PushNotificationToggleProps> = ({
  className = '',
  variant = 'card',
}) => {
  const { currentUser } = useAuth();
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [testSending, setTestSending] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const isSupported = PushNotificationService.isSupported();

  useEffect(() => {
    async function checkStatus() {
      if (!isSupported) return;
      const perm = PushNotificationService.getPermission();
      setPermission(perm);

      const sub = await PushNotificationService.getCurrentSubscription();
      setIsSubscribed(!!sub);
    }

    checkStatus();
  }, [isSupported]);

  const handleToggle = async () => {
    if (!isSupported) {
      setStatusMessage({
        type: 'error',
        text: 'Web Push is not supported on this browser version.',
      });
      return;
    }

    setLoading(true);
    setStatusMessage(null);

    try {
      if (isSubscribed) {
        // Unsubscribe
        const success = await PushNotificationService.unsubscribe(currentUser?.id);
        if (success) {
          setIsSubscribed(false);
          setStatusMessage({ type: 'success', text: 'Push notifications disabled on this device.' });
        }
      } else {
        // Subscribe
        const result = await PushNotificationService.subscribe(currentUser?.id);
        if (result.success) {
          setIsSubscribed(true);
          setPermission('granted');
          setStatusMessage({
            type: 'success',
            text: 'Push notifications enabled! You will receive live shift & task alerts.',
          });
        } else {
          setStatusMessage({
            type: 'error',
            text: result.error || 'Could not enable push notifications.',
          });
        }
      }
    } catch (err: unknown) {
      const error = err as Error;
      setStatusMessage({
        type: 'error',
        text: error.message || 'An unexpected error occurred.',
      });
    } finally {
      setLoading(false);
      const perm = PushNotificationService.getPermission();
      setPermission(perm);
    }
  };

  const handleSendTest = async () => {
    setTestSending(true);
    setStatusMessage(null);
    try {
      const res = await PushNotificationService.sendTestNotification(currentUser?.id);
      if (res.success) {
        setStatusMessage({
          type: 'success',
          text: 'Test notification dispatched! Check your device notification tray.',
        });
      } else {
        setStatusMessage({
          type: 'error',
          text: res.error || 'Failed to dispatch test notification.',
        });
      }
    } catch (err: unknown) {
      const error = err as Error;
      setStatusMessage({ type: 'error', text: error.message });
    } finally {
      setTestSending(false);
    }
  };

  if (!isSupported) {
    if (variant === 'badge') return null;
    return (
      <div className={`p-4 rounded-2xl bg-slate-900/50 border border-slate-800 text-xs text-slate-400 ${className}`}>
        Web Push Notifications are not supported in this browser window.
      </div>
    );
  }

  if (variant === 'badge') {
    return (
      <button
        onClick={handleToggle}
        disabled={loading}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition cursor-pointer ${
          isSubscribed
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
            : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-700'
        } ${className}`}
        title={isSubscribed ? 'Notifications Active' : 'Enable Notifications'}
      >
        {loading ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-400" />
        ) : isSubscribed ? (
          <BellRing className="w-3.5 h-3.5 text-emerald-400" />
        ) : (
          <Bell className="w-3.5 h-3.5 text-slate-400" />
        )}
        <span>{isSubscribed ? 'Alerts ON' : 'Enable Alerts'}</span>
      </button>
    );
  }

  return (
    <div className={`p-4 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-3.5 ${className}`}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center border ${
              isSubscribed
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
            }`}
          >
            {isSubscribed ? <BellRing className="w-5 h-5" /> : <Bell className="w-5 h-5" />}
          </div>
          <div>
            <h4 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
              <span>Push Notifications</span>
              {isSubscribed && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  Active
                </span>
              )}
            </h4>
            <p className="text-xs text-slate-400">
              {isSubscribed
                ? 'Receiving instant shift reminders, task updates, and review approvals.'
                : 'Enable to receive instant shift alarms, task assignments, and review approvals.'}
            </p>
          </div>
        </div>

        {/* Toggle Button */}
        <button
          onClick={handleToggle}
          disabled={loading}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition shrink-0 flex items-center gap-1.5 cursor-pointer ${
            isSubscribed
              ? 'bg-slate-800 hover:bg-slate-700 text-rose-300 border border-slate-700'
              : 'bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-500/20'
          }`}
        >
          {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          {isSubscribed ? 'Turn Off' : 'Enable'}
        </button>
      </div>

      {/* Test Button & Permission Info */}
      <div className="pt-2 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="text-slate-400">
          Browser status:{' '}
          <span
            className={`font-semibold ${
              permission === 'granted'
                ? 'text-emerald-400'
                : permission === 'denied'
                ? 'text-rose-400'
                : 'text-amber-400'
            }`}
          >
            {permission}
          </span>
        </div>

        {isSubscribed && (
          <button
            onClick={handleSendTest}
            disabled={testSending}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-blue-400 border border-slate-700 transition cursor-pointer text-xs"
          >
            {testSending ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <Send className="w-3 h-3" />
            )}
            <span>Send Test Alert</span>
          </button>
        )}
      </div>

      {/* Feedback Banner */}
      {statusMessage && (
        <div
          className={`flex items-center gap-2 p-2.5 rounded-xl text-xs ${
            statusMessage.type === 'success'
              ? 'bg-emerald-950/40 text-emerald-300 border border-emerald-500/30'
              : 'bg-rose-950/40 text-rose-300 border border-rose-500/30'
          }`}
        >
          {statusMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}
    </div>
  );
};
