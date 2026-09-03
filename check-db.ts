import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_ANON_KEY!);

async function main() {
  const url = `${process.env.VITE_SUPABASE_URL}/rest/v1/users?id=eq.21213abc-3175-4923-9f18-a0cd558297c0`;
  const res = await fetch(url, {
    method: 'DELETE',
    headers: {
      'apikey': process.env.VITE_SUPABASE_ANON_KEY!,
      'Authorization': `Bearer ${process.env.VITE_SUPABASE_ANON_KEY!}`,
      'Prefer': 'return=representation'
    }
  });
  console.log(res.status);
  console.log(await res.text());
}
main();
