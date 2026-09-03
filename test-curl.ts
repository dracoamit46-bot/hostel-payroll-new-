import dotenv from 'dotenv';
dotenv.config();

async function test() {
  const url = `${process.env.VITE_SUPABASE_URL}/rest/v1/users?id=eq.7e196091-175a-4c50-9703-0eb0b4f8fe1a`;
  const res = await fetch(url, {
    method: 'DELETE',
    headers: {
      'apikey': process.env.VITE_SUPABASE_ANON_KEY!,
      'Authorization': `Bearer ${process.env.VITE_SUPABASE_ANON_KEY!}`,
      'Prefer': 'return=representation'
    }
  });
  console.log(res.status, res.statusText);
  const text = await res.text();
  console.log(text);
}

test();
