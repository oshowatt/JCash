import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://qprbjynenerpcpxkdald.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFwcmJqeW5lbmVycGNweGtkYWxkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIzOTkyODEsImV4cCI6MjA3Nzk3NTI4MX0.UOXrfzWSyRuxJ0ORBuGKp77j1r5S-606H6Sb5YdvuTM';

export const supabase = createClient(supabaseUrl, supabaseKey);
