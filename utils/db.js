const { createClient } = require("@supabase/supabase-js");
// require the dotenv package
require("dotenv").config();

const supabaseUrl = `${process.env.SUPABASE_URL}`;
const supabaseKey = process.env.SUPABASE_KEY;
const db = createClient(supabaseUrl, supabaseKey);

module.exports = db;
