const UBER_ID = 'b1789816-92e3-48a4-b012-034c1a95d201';
const UBER_URL = process.env.VITE_SUPABASE_URL || 'https://hkqzzxgeedsmjnhyquke.supabase.co';
const ANON_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhrcXp6eGdlZWRzbWpuaHlxdWtlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg4ODQyMTAsImV4cCI6MjA2NDQ2MDIxMH0.E-x-p5RjQoZfyw6YVwQlWC-Ao27-IPWvyqRIM0PzA-U';

async function testFetch() {
  console.log("A enviar pedido direto à Edge Function sem passar pelo cliente UI...");
  try {
    const res = await fetch(`${UBER_URL}/functions/v1/uber-full-sync`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${ANON_KEY}`
      },
      body: JSON.stringify({ integracao_id: UBER_ID })
    });
    
    console.log("Status recebido:", res.status);
    const textRes = await res.text();
    console.log("Mensagem bruta do servidor:", textRes);
  } catch(e) {
    console.error("Erro na chamada:", e);
  }
}

testFetch();
