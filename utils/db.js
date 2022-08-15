const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()
const supabaseUrl = `https://${
  process.env.SUPABASE_PROJECT_ID || process.env.NEXT_PUBLIC_SUPABASE_PROJECT_ID
}.supabase.co`
const supabaseKey =
  process.env.SUPABASE_KEY || process.env.NEXT_PUBLIC_SUPABASE_KEY
const db = createClient(supabaseUrl, supabaseKey)

module.exports = {
  db
}
