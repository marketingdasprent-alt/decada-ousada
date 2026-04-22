const SUPABASE_URL = "https://hkqzzxgeedsmjnhyquke.supabase.co";
const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhrcXp6eGdlZWRzbWpuaHlxdWtlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg4ODQyMTAsImV4cCI6MjA2NDQ2MDIxMH0.E-x-p5RjQoZfyw6YVwQlWC-Ao27-IPWvyqRIM0PzA-U";
const INTEGRACAO_ID = "b1789816-92e3-48a4-b012-034c1a95d201";

async function run() {
  const headers = { "apikey": ANON_KEY, "Authorization": `Bearer ${ANON_KEY}` };
  
  console.log("== LATEST UBER DRIVERS ==");
  const dRes = await fetch(`${SUPABASE_URL}/rest/v1/uber_drivers?integracao_id=eq.${INTEGRACAO_ID}&select=*&limit=5`, { headers });
  const drivers = await dRes.json();
  if (drivers.length > 0) { console.table(drivers); } else { console.log(drivers); }

  console.log("\n== LATEST SYNC LOGS ==");
  const lRes = await fetch(`${SUPABASE_URL}/rest/v1/uber_sync_logs?integracao_id=eq.${INTEGRACAO_ID}&order=created_at.desc&limit=1`, { headers });
  const logs = await lRes.json();
  if (logs.length > 0) { console.log(JSON.stringify(logs[0], null, 2)); } else { console.log(logs); }
}

run();
