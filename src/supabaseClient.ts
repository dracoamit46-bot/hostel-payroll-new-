import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseConfig } from './config/env';

const config = getSupabaseConfig();

export const isSupabaseConfigured = config.isConfigured;

/**
 * Sanitize header value to guarantee standard ASCII/ISO-8859-1 encoding.
 * Prevents "TypeError: Failed to execute 'set' on 'Headers'" in browser.
 */
export function sanitizeHeaderValue(val: any): string {
  if (val === null || val === undefined) return '';
  const str = String(val);
  return str.replace(/[^\x20-\x7E]/g, '');
}

/**
 * Custom fetch wrapper to ensure all outgoing headers are strictly ASCII-compliant.
 */
export const safeFetch: typeof fetch = async (input, init) => {
  if (init && init.headers) {
    const cleanHeaders: Record<string, string> = {};
    if (init.headers instanceof Headers) {
      init.headers.forEach((val, key) => {
        cleanHeaders[key] = sanitizeHeaderValue(val);
      });
    } else if (Array.isArray(init.headers)) {
      for (const [k, v] of init.headers) {
        cleanHeaders[k] = sanitizeHeaderValue(v);
      }
    } else if (typeof init.headers === 'object') {
      for (const [k, v] of Object.entries(init.headers)) {
        cleanHeaders[k] = sanitizeHeaderValue(v);
      }
    }
    init.headers = cleanHeaders;
  }
  return fetch(input, init);
};

// Clean up any potentially corrupted localStorage auth tokens on startup
try {
  if (typeof window !== 'undefined' && window.localStorage) {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('sb-') || key.includes('supabase'))) {
        const val = localStorage.getItem(key);
        if (val && /[^\x20-\x7E]/.test(val)) {
          console.warn(`Sanitizing non-ASCII session storage for ${key}`);
          localStorage.removeItem(key);
        }
      }
    }
  }
} catch (e) {
  // Ignore storage errors in private browsing/sandboxes
}

// Live Supabase Client Initialization:
// Connected directly to the configured Supabase project instance with safe fetch.
export const supabase: SupabaseClient = createClient(
  config.url || 'https://placeholder.supabase.co',
  config.anonKey || 'placeholder-anon-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
    global: {
      fetch: safeFetch,
    },
  }
);

/**
 * Helper to normalize phone numbers into standard digits
 * Strips non-digits and removes leading country code 91 if 12 digits
 */
export function normalizePhoneDigits(phone: string): string {
  if (!phone) return '';
  const clean = phone.replace(/\D/g, '');
  if (clean.length === 12 && clean.startsWith('91')) {
    return clean.slice(2);
  }
  return clean;
}

/**
 * Helper to convert a phone number into the internal hidden email format
 * Example: "+91 98765 00001" -> "9876500001@hostelops.internal"
 */
export function formatInternalEmail(phone: string): string {
  const cleanDigits = normalizePhoneDigits(phone);
  return `${cleanDigits || 'user'}@hostelops.internal`;
}

/**
 * Helper to extract raw digits from an internal email
 * Example: "9876500001@hostelops.internal" -> "9876500001"
 */
export function extractPhoneDigitsFromEmail(email: string): string {
  if (!email) return '';
  const [localPart] = email.split('@');
  return normalizePhoneDigits(localPart);
}
