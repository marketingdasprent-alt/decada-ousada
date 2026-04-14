import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://hkqzzxgeedsmjnhyquke.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhrcXp6eGdlZWRzbWpuaHlxdWtlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg4ODQyMTAsImV4cCI6MjA2NDQ2MDIxMH0.E-x-p5RjQoZfyw6YVwQlWC-Ao27-IPWvyqRIM0PzA-U";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkTable() {
  try {
    console.log('Checking assistencia_categorias table...');
    const { data, error } = await supabase
      .from('assistencia_categorias')
      .select('count', { count: 'exact', head: true });

    if (error) {
      console.error('Error checking table:', error.message);
      if (error.message.includes('does not exist')) {
        console.log('TABLE DOES NOT EXIST');
      }
    } else {
      console.log('Table exists. Count:', data);
      
      const { data: rows, error: rError } = await supabase
        .from('assistencia_categorias')
        .select('*')
        .limit(5);
      
      if (rError) {
          console.error('Error fetching rows:', rError.message);
      } else {
          console.log('First 5 rows:', rows);
      }
    }
  } catch (e) {
    console.error('Fatal error:', e);
  }
}

checkTable();
