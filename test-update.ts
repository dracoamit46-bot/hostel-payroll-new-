import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_ANON_KEY!);

async function test() {
  const { data: users } = await supabase.from('users').select('id, name, role').neq('role', 'owner').limit(1);
  const target = users![0];
  console.log('Target:', target);
  
  const { data, error } = await supabase.from('users').update({ name: target.name + '1' }).eq('id', target.id).select();
  console.log('Update:', data, error);
}

test();
