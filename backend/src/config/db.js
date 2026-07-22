// backend/src/config/db.js
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables');
}

// Regular client — respects RLS. Use this for all normal queries.
const supabase = createClient(supabaseUrl, supabaseKey);

// Admin client — bypasses RLS, required for supabase.auth.admin.* calls
// (e.g. createUser, deleteUser, updateUserById). NEVER expose this key
// or this client to the frontend.
let supabaseAdmin = null;
if (supabaseServiceKey) {
  supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
} else {
  console.warn(
    '⚠️ [db] SUPABASE_SERVICE_ROLE_KEY not set — admin auth operations (create/delete user) will fail.'
  );
}

module.exports = supabase;
module.exports.supabaseAdmin = supabaseAdmin;