const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

let supabaseUrl = "";
let supabaseKey = "";

try {
  const envContent = fs.readFileSync('.env.local', 'utf8');
  const lines = envContent.split('\n');
  for (const line of lines) {
    if (line.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) {
      supabaseUrl = line.split('=')[1].trim();
    }
    if (line.startsWith('NEXT_PUBLIC_SUPABASE_ANON_KEY=')) {
      supabaseKey = line.split('=')[1].trim();
    }
  }
} catch (e) {
  console.error("Failed to read .env.local:", e);
}

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase URL or Key in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkColumns() {
  console.log("Checking columns of profiles table...");
  
  // Query profiles table and print one row keys
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .limit(1);
    
  if (error) {
    console.error("Error querying profiles:", error);
  } else if (data && data.length > 0) {
    console.log("Columns present in profiles table:", Object.keys(data[0]));
  } else {
    console.log("Profiles table is empty or could not retrieve rows.");
  }
}

checkColumns();
