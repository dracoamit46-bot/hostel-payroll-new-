import webpush from 'web-push';
import { createClient } from '@supabase/supabase-js';

const VAPID_PUBLIC_KEY =
  process.env.VAPID_PUBLIC_KEY ||
  'BPm2hM6BKJwvlaFW_B4knSdWcCEHi5LfccBjDbSKjhLdQQuVJQJoLKnZZPGkPP0Tx-vqOWV7KmiVBxGCtAocoq8';

const VAPID_PRIVATE_KEY =
  process.env.VAPID_PRIVATE_KEY || '-ucL86XZWIuWiOqBgV_rofJhJ_giTxqa16aLhRofYYA';

const VAPID_SUBJECT =
  process.env.VAPID_SUBJECT || 'mailto:support@hostelops.app';

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_ANON_KEY;

const supabase =
  supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

export default async (req: Request) => {
  // CORS Headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
      status: 405,
      headers,
    });
  }

  try {
    const body = await req.json();
    const {
      targetUserId,
      targetUserIds,
      subscription,
      title = 'HostelOps Notification',
      message = '',
      url = '/',
      tab,
      tag = 'hostelops-alert',
    } = body;

    const payload = JSON.stringify({
      title,
      body: message,
      url,
      tab,
      tag,
      icon: '/pwa-192x192.png',
      badge: '/badge-72x72.png',
      timestamp: Date.now(),
    });

    // 1. Direct subscription provided (e.g. direct test or immediate browser client)
    if (subscription && subscription.endpoint) {
      try {
        await webpush.sendNotification(subscription, payload);
        return new Response(
          JSON.stringify({ success: true, delivered: 1 }),
          { status: 200, headers }
        );
      } catch (err: unknown) {
        const error = err as { statusCode?: number; message?: string };
        console.error('Direct push delivery failed:', error);
        return new Response(
          JSON.stringify({
            success: false,
            error: error.message || 'Push delivery failed',
            statusCode: error.statusCode,
          }),
          { status: 500, headers }
        );
      }
    }

    // 2. Query subscriptions from Supabase
    if (!supabase) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Supabase client is not configured on server',
        }),
        { status: 500, headers }
      );
    }

    const idsToTarget: string[] = [];
    if (targetUserId) idsToTarget.push(targetUserId);
    if (Array.isArray(targetUserIds)) idsToTarget.push(...targetUserIds);

    let query = supabase.from('push_subscriptions').select('*');
    if (idsToTarget.length > 0) {
      query = query.in('user_id', idsToTarget);
    }

    const { data: subs, error: dbError } = await query;

    if (dbError) {
      console.warn('Could not query push_subscriptions table:', dbError);
      return new Response(
        JSON.stringify({
          success: false,
          error: dbError.message,
          hint: 'Ensure push_subscriptions table exists in Supabase.',
        }),
        { status: 500, headers }
      );
    }

    if (!subs || subs.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          delivered: 0,
          message: 'No active push subscriptions found for targeted users.',
        }),
        { status: 200, headers }
      );
    }

    let successCount = 0;
    const expiredIds: string[] = [];

    await Promise.all(
      subs.map(async (sub) => {
        const pushSub = {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth,
          },
        };

        try {
          await webpush.sendNotification(pushSub, payload);
          successCount++;
        } catch (err: unknown) {
          const pushErr = err as { statusCode?: number };
          if (pushErr.statusCode === 410 || pushErr.statusCode === 404) {
            // Subscription has expired or unsubscribed
            expiredIds.push(sub.id);
          } else {
            console.error('Push error for sub', sub.id, pushErr);
          }
        }
      })
    );

    // Clean up expired subscriptions
    if (expiredIds.length > 0) {
      await supabase.from('push_subscriptions').delete().in('id', expiredIds);
    }

    return new Response(
      JSON.stringify({
        success: true,
        delivered: successCount,
        total: subs.length,
        cleanedExpired: expiredIds.length,
      }),
      { status: 200, headers }
    );
  } catch (err: unknown) {
    const error = err as Error;
    console.error('Failed to process push notification request:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Internal Server Error',
      }),
      { status: 500, headers }
    );
  }
};
