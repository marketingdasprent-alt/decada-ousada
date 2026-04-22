const SUPABASE_URL = "https://hkqzzxgeedsmjnhyquke.supabase.co";
const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhrcXp6eGdlZWRzbWpuaHlxdWtlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg4ODQyMTAsImV4cCI6MjA2NDQ2MDIxMH0.E-x-p5RjQoZfyw6YVwQlWC-Ao27-IPWvyqRIM0PzA-U";

async function fetchSchema(table) {
  const headers = { "apikey": ANON_KEY, "Authorization": `Bearer ${ANON_KEY}` };
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?limit=1&select=*`, { headers });
  if (!res.ok) {
    console.error(`Error fetching ${table}:`, await res.text());
    return;
  }
  const data = await res.json();
  if (data.length > 0) {
    console.log(`\nColumns in ${table}:`, Object.keys(data[0]));
  } else {
    console.log(`\nTable ${table} is empty but exists.`);
  }
}

async function run() {
  await fetchSchema("uber_drivers");
  await fetchSchema("uber_sync_logs");
}
run();
