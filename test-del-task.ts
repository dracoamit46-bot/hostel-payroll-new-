import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_ANON_KEY!);

async function test() {
  // Create a category
  const { data: cat } = await supabase.from('task_categories').insert({ name: 'Test Cat', property_id: 'a0374b4b-172d-48e2-ad56-d7f889f2b471' }).select().single();
  console.log('Category:', cat?.id);
  
  if (cat) {
    // Delete it
    const { data: del, error, count } = await supabase.from('task_categories').delete({ count: 'exact' }).eq('id', cat.id).select();
    console.log('Delete result:', del, error, count);
  }
}
test();
