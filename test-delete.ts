import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_ANON_KEY!);

async function test() {
  const { data: users } = await supabase.from('users').select('id, name, role').neq('role', 'owner').limit(3);
  console.log('Found users:', users);
  
  if (users && users.length > 0) {
    const target = users[0];
    console.log('Attempting to delete:', target.id);
    const { data, error } = await supabase.from('users').delete().eq('id', target.id).select();
    console.log('Delete returning data:', data);
    console.log('Delete returning error:', error);
    
    const { data: check } = await supabase.from('users').select('*').eq('id', target.id);
    console.log('Still exists?', check);
  }
}

test();
