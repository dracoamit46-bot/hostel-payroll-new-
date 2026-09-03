import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_ANON_KEY!);

async function test() {
  const { data, error } = await supabase.from('users').delete().eq('id', '7e196091-175a-4c50-9703-0eb0b4f8fe1a').select();
  console.log(data, error);
}

test();
