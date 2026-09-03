import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function test() {
  const payload = {
     shift_1_start: "08:00:00",
     shift_1_end: "14:00",
     shift_2_start: "17:00",
     shift_2_end: "22:00",
     monthly_salary: 15000,
     joining_date: "2026-09-02",
     is_active: true
  };
  const { data, error } = await supabase.from('users').update(payload).eq('id', '6d3e49e3-26c8-40ac-952e-4cb8348cfec0').select().single();
  console.log("Error from update:", error);
  console.log("Data:", data);
}

test();
