import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://hkqzzxgeedsmjnhyquke.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhrcXp6eGdlZWRzbWpuaHlxdWtlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg4ODQyMTAsImV4cCI6MjA2NDQ2MDIxMH0.E-x-p5RjQoZfyw6YVwQlWC-Ao27-IPWvyqRIM0PzA-U";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkManagers() {
  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('nome, is_admin, cargo')
    .or('nome.ilike.%Eduarda%,nome.ilike.%Juliana%');
  
  if (error) {
    console.error('Error:', error);
    return;
  }
  
  console.log('Managers found:', profiles);
}

checkManagers();
