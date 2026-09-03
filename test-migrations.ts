import dotenv from 'dotenv';
dotenv.config();

async function test() {
  const url = `${process.env.VITE_SUPABASE_URL}/rest/v1/schema_migrations?select=*`;
  const res = await fetch(url, {
    headers: {
      'apikey': process.env.VITE_SUPABASE_ANON_KEY!,
      'Authorization': `Bearer ${process.env.VITE_SUPABASE_ANON_KEY!}`,
    }
  });
  console.log(res.status);
  const text = await res.text();
  console.log(text);
}

test();
