const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();
const supabaseUrl = `https://${
  process.env.SUPABASE_PROJECT_ID || process.env.NEXT_PUBLIC_SUPABASE_PROJECT_ID
}.supabase.co`;
const supabaseKey =
  process.env.SUPABASE_KEY || process.env.NEXT_PUBLIC_SUPABASE_KEY;

const options = {
  schema: "public",
  headers: { "x-my-custom-header": "joinlist-bot" },
  autoRefreshToken: true,
  persistSession: true,
  detectSessionInUrl: true,
};
const db = createClient(supabaseUrl, supabaseKey, options);

module.exports = {
  db,
};
