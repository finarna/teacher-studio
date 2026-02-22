import { Client } from 'pg';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
const dbUrl = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const dbUser = 'postgres';
const dbHost = new URL(dbUrl).host;
// Oh wait, postgres connection string is different.
