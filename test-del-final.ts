import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_ANON_KEY!);

async function test() {
  const { data: newUser, error: iErr } = await supabase.from('users').insert({ name: 'Final DelTest', phone: '3334445556', role: 'staff' }).select().single();
  console.log('Insert:', newUser?.id, iErr);
  if (newUser) {
    const { error: dErr } = await supabase.from('users').delete().eq('id', newUser.id);
    console.log('Delete error:', dErr);
    const { data: check } = await supabase.from('users').select('*').eq('id', newUser.id);
    console.log('Still exists?', check);
  }
}

test();
