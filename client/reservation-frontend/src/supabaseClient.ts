import { createClient } from '@supabase/supabase-js';

const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL || 'https://krthlxjbkyetcjastulc.supabase.co';
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtydGhseGpia3lldGNqYXN0dWxjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkwODI4MDcsImV4cCI6MjEwNDY1ODgwN30.7hBgP05oU4PW-vAGjDiO06qKyKM_m9ln0BsxMHl6bN8';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);