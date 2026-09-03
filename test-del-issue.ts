import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_ANON_KEY!);

async function test() {
  const { data: users } = await supabase.from('users').select('id, name, role').neq('role', 'owner').limit(1);
  if (!users || users.length === 0) return;
  const target = users[0];
  console.log('Target:', target);
  
  // Try to delete
  const { data, error, count } = await supabase.from('users').delete({ count: 'exact' }).eq('id', target.id).select();
  console.log('Delete result:', data, 'Error:', error, 'Count:', count);
}
test();
