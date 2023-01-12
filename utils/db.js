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
const db = createClient(
  supabaseUrl,
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRwc3Bzeml6dXJlcHBtcnhrY3JpIiwicm9sZSI6ImFub24iLCJpYXQiOjE2NTM1NzQxNjMsImV4cCI6MTk2OTE1MDE2M30._ux0yI5Kct8aTQS_KhCRDSqMgRtxmY_skFDFOMOlI8Q",
  options
);

module.exports = {
  db,
};
