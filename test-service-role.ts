import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

// Use Service Role key if available, else fail
if (!process.env.VITE_SUPABASE_SERVICE_ROLE_KEY) {
  console.log('No service role key available.');
  process.exit(1);
}
const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY);

async function test() {
  const id = '21213abc-3175-4923-9f18-a0cd558297c0';
  
  const { error: rawErr } = await supabase.from('users').delete().eq('id', id);
  console.log('Service role delete error:', rawErr);
  
  const { data: check } = await supabase.from('users').select('*').eq('id', id);
  console.log('Still exists?', check);
}
test();
