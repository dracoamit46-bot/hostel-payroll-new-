import { supabase } from './src/supabaseClient';
async function test() {
  const { data: newUser } = await supabase.from('users').insert({ name: 'RLS Delete Test', phone: '9998887779', role: 'staff' }).select().single();
  if (newUser) {
    console.log('Created user:', newUser.id);
    const { data: readUser } = await supabase.from('users').select('id').eq('id', newUser.id);
    console.log('Read user:', readUser);
    const { data: delData, error: delErr } = await supabase.from('users').delete().eq('id', newUser.id).select();
    console.log('Delete result:', delData, delErr);
  }
}
test();
