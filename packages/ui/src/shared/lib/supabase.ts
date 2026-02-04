import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const isSupabaseEnabled = import.meta.env.VITE_DATA_SOURCE === 'supabase';

// Check if we verify env vars mostly for debugging. 
// For production code, we might just letting it be created or check existence.
// If isSupabaseEnabled is true, we expect these to be present.

export const supabase = (isSupabaseEnabled && supabaseUrl && supabaseAnonKey)
  ? createClient(supabaseUrl, supabaseAnonKey)
  : createClient('https://placeholder.supabase.co', 'placeholder'); 
  // Placeholder to avoid crash if imported but not used, or if env missing but code executed. 
  // However, usage should be guarded by VITE_DATA_SOURCE check usually.
