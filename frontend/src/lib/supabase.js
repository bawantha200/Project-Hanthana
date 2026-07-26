// frontend/src/lib/supabase.js

import { createClient } from '@supabase/supabase-js';

// Get environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://bbngridioulomvdhkawi.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Validate environment variables
if (!supabaseAnonKey) {
    console.error('❌ VITE_SUPABASE_ANON_KEY is not set in .env file');
    console.error('Please add: VITE_SUPABASE_ANON_KEY=your_anon_key_here');
}

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: window.localStorage,
  },
});

// Export a function to check connection
export const checkSupabaseConnection = async () => {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('count')
      .limit(1);
    
    if (error) {
      console.error('❌ Supabase connection error:', error.message);
      return false;
    }
    
    console.log('✅ Supabase connected successfully');
    return true;
  } catch (err) {
    console.error('❌ Supabase connection failed:', err.message);
    return false;
  }
};

export default supabase;