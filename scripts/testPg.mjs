import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
// VITE_SUPABASE_URL=https://[ID].supabase.co
const id = process.env.VITE_SUPABASE_URL.split('https://')[1].split('.supabase')[0];
// Wait, we don't have the db password. The service role key is not the pg connection string.
