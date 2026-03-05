# Supabase Database Files

This folder contains SQL scripts for database management.

## 📁 Files Overview

### Production Files

#### `CLEAN_SLATE.sql` ⚠️
**Complete database schema for fresh installations**
- **Version:** v6.1 (March 2026)
- **Use Case:** Setting up a brand new database from scratch
- **WARNING:** This will DROP all existing data
- **Includes:** All migrations through 20260303010000
- **After Setup:** Run `npx tsx migrations/seed_rei_v3.ts` to seed baseline data

**When to use:**
- Fresh Supabase project setup
- Complete database reset (development only)
- Documentation/reference for complete schema

**When NOT to use:**
- Live production database (use migrations instead)
- Databases with existing data

### Troubleshooting Tools

#### `DIAGNOSE_AUTH.sql`
**Diagnostic script for auth system issues**
- Checks for NULL confirmation_token records
- Displays problematic auth records
- Verifies auth/profile sync
- Shows orphaned records

**When to use:**
- Signup/login errors
- Auth system debugging
- Before running cleanup scripts

**Safe to run:** ✅ Read-only, no data modifications

#### `COMPREHENSIVE_AUTH_CLEANUP.sql`
**Comprehensive auth cleanup for corrupted records**
- Fixes NULL confirmation_token issues
- Cleans up incomplete signups
- Repairs confirmed users with NULL timestamps
- Removes orphaned profiles

**When to use:**
- After DIAGNOSE_AUTH.sql identifies issues
- "Scan error on column index 3, name confirmation_token" errors
- Corrupted auth records preventing signups

**IMPORTANT:**
1. Run `DIAGNOSE_AUTH.sql` first
2. Wait 1 hour after cleanup (rate limit cooldown)
3. Clear browser cache before retrying signup

## 📂 Migrations Folder

The `migrations/` folder (at project root) contains:
- All incremental schema changes
- Numbered migrations (017, 018, 019, 020, etc.)
- Timestamped migrations (20260227180000, etc.)

**Migration naming:**
- `0XX_*` - Sequential migrations
- `YYYYMMDDHHMMSS_*` - Timestamped migrations

**To apply migrations to existing database:**
```bash
# Through Supabase Dashboard
1. Go to SQL Editor
2. Run each migration in order
3. Verify with scripts/verify-database.ts

# Or use Supabase CLI
supabase db push
```

## 🔄 Database Setup Workflows

### Fresh Setup (New Project)
```bash
1. Run: CLEAN_SLATE.sql in Supabase SQL Editor
2. Seed: npx tsx migrations/seed_rei_v3.ts
3. Seed: npx tsx scripts/seedRealTopics.ts
4. Verify: npm run verify:db
```

### Migration (Existing Database)
```bash
1. Run migrations in order from migrations/ folder
2. Check migration notes for required seed scripts
3. Verify: npm run verify:db
```

### Troubleshooting Auth Issues
```bash
1. Run: DIAGNOSE_AUTH.sql
2. Review output for issues
3. If issues found: Run COMPREHENSIVE_AUTH_CLEANUP.sql
4. Wait 1 hour (Supabase rate limit)
5. Clear browser cache
6. Retry signup/login
```

## 📋 Migration History

### Latest Migrations (supabase/migrations/)
- `20260303010000_fix_auth_confirmation_token.sql` - Auth cleanup for existing DBs
- `20260303000000_fix_calibration_rls.sql` - Calibration RLS policies
- `20260228020000_definitive_calibration_fix.sql` - Calibration schema fix
- `20260228010000_fix_calibration_uniqueness.sql` - Calibration constraints
- `20260228000000_fix_calibration_columns.sql` - Calibration column fixes
- `20260227190000_add_evolution_note_to_patterns.sql` - Pattern evolution tracking
- `20260227180000_create_ai_calibration.sql` - REI v3.0 calibration
- `020_rbac_and_subscriptions.sql` - Role-based access control
- `019_student_performance_profiles.sql` - AI personalization
- `018_fix_scans_rls_for_system_scans.sql` - System scans RLS
- `017_add_year_to_scans.sql` - Year-based filtering

### Root Migrations (migrations/)
See `migrations/CLEAN_START_SCHEMA_v6.0.sql` for full migration history (001-027)

## 🛠️ Maintenance

### Regular Tasks
- Run `DIAGNOSE_AUTH.sql` if auth errors occur
- Monitor orphaned profiles
- Check auth/profile sync

### After Schema Changes
1. Update `CLEAN_SLATE.sql` with new tables/columns
2. Create migration file in `supabase/migrations/` or `migrations/`
3. Document changes in migration header
4. Update this README

## 📚 Resources

- [Supabase Auth Docs](https://supabase.com/docs/guides/auth)
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
- [Migrations Guide](https://supabase.com/docs/guides/cli/local-development)

## ⚠️ Important Notes

1. **Never run CLEAN_SLATE.sql on production** - It drops all data
2. **Always backup before running cleanup scripts**
3. **Respect Supabase rate limits** - Max 4 signup attempts per hour per email
4. **Test migrations in development first**
5. **Keep migrations idempotent** - Safe to run multiple times
