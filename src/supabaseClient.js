import { createClient } from '@supabase/supabase-js';

// Replace these values with your actual Supabase Project URL and Anon Key
const supabaseUrl = 'https://bbngridioulomvdhkawi.supabase.co'; 
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJibmdyaWRpb3Vsb212ZGhrYXdpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc5ODI5MjUsImV4cCI6MjA5MzU1ODkyNX0.NrWIIvZ1TD6OXQNuPwgB_BRKyUUn6pdboA__IMDu2N4';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);