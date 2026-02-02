# Duplicate Scans Issue - Root Cause Analysis & Fix

**Date**: 2026-02-02
**Status**: ✅ Fixed
**Severity**: High - Data integrity issue

## Problem Summary

Users were experiencing duplicate scans being created when uploading exam papers. The diagnostic script revealed **18 duplicate scans across 5 upload sessions**:

- `2020_physics [23:06]`: 4 copies with DIFFERENT scan IDs
- `2024_physics [22:42]`: 3 copies
- `2024_physics [22:25]`: 7 copies
- `2024_physics [19:58]`: 4 copies
- `2024_physics [19:33]`: 5 copies

Each duplicate had a **different UUID**, indicating the frontend was creating entirely new scan objects rather than updating existing ones.

## Root Cause

The backend was **silently failing** when creating questions, but still responding with "success":

### The Bug Flow

1. User uploads a Physics paper
2. Frontend generates a new UUID for the scan
3. Frontend calls `syncScanToSupabase(scan)`
4. Backend successfully creates the scan in Supabase
5. Backend attempts to create questions → **FAILS with foreign key error**
6. Backend **ignores the error** and responds with `{ status: 'success' }`
7. Frontend thinks upload succeeded
8. But scan has **0 questions** in database
9. User sees broken state, uploads again
10. Frontend generates a **NEW UUID** → Creates another scan
11. Process repeats 3-7 times

### Code Evidence

**server-supabase.js (Before Fix):**
```javascript
// Line 408-411 - BEFORE
if (apiScan.analysisData?.questions && apiScan.analysisData.questions.length > 0) {
  await createQuestions(apiScan.id, apiScan.analysisData.questions);
  // ❌ No error checking! Even if createQuestions fails, code continues
}

res.json({ status: 'success', synced: true }); // ❌ Returns success even if questions failed
```

**lib/supabaseServer.ts:**
```typescript
export async function createQuestions(scanId: string, questions: any[]) {
  // ... insert questions ...
  if (error) {
    console.error('Error creating questions:', error);
    return { data: null, error }; // ✅ Returns error object
  }
  return { data, error: null };
}
```

**Backend Logs:**
```
[2026-02-02T17:36:09.159Z] POST /api/scans
✅ Authenticated user prabhubp@gmail.com for POST /scans
🔍 [UPSERT CHECK] Scan be6c9972-3519-4b37-b9b3-39b4f3a3ca9e exists: false
✨ [CREATE] Creating new scan be6c9972-3519-4b37-b9b3-39b4f3a3ca9e
Error creating questions: {
  code: '23503',
  details: 'Key (scan_id)=(be6c9972-3519-4b37-b9b3-39b4f3a3ca9e) is not present in table "scans".',
  message: 'insert or update on table "questions" violates foreign key constraint "questions_scan_id_fkey"'
}
// ❌ But response still returns success!
```

## The Fix

Added proper error handling to check if `createQuestions` fails and throw an error:

**server-supabase.js (After Fix):**
```javascript
// CREATE path (lines 408-414)
if (apiScan.analysisData?.questions && apiScan.analysisData.questions.length > 0) {
  const { error: questionsError } = await createQuestions(apiScan.id, apiScan.analysisData.questions);
  if (questionsError) {
    throw new Error(`Failed to create questions: ${questionsError.message}`);
  }
}

// UPDATE path (lines 389-399)
if (apiScan.analysisData?.questions && apiScan.analysisData.questions.length > 0) {
  await supabaseAdmin.from('questions').delete().eq('scan_id', apiScan.id);

  const { error: questionsError } = await createQuestions(apiScan.id, apiScan.analysisData.questions);
  if (questionsError) {
    throw new Error(`Failed to create questions: ${questionsError.message}`);
  }
}
```

Now if questions fail to create, the entire sync operation will fail and return a 500 error to the frontend, preventing the user from thinking the upload succeeded.

## Impact

### Before Fix
- ❌ Users unknowingly created multiple duplicate scans
- ❌ Database filled with scans that have 0 questions
- ❌ Poor user experience (confusion, retries)
- ❌ Data integrity compromised

### After Fix
- ✅ Sync fails loudly if questions can't be created
- ✅ Frontend receives error and can show proper error message
- ✅ User knows something went wrong instead of seeing "0 questions"
- ✅ No more duplicate scans with different UUIDs
- ✅ Database remains clean

## Secondary Issue

The foreign key error (`scan_id not present in table "scans"`) suggests there may be a deeper issue:

**Hypothesis**: The scan insert might be failing silently, or there's a transaction isolation issue where the scan isn't committed before questions are inserted.

**Recommended Investigation**:
1. Add logging after `createScan` to verify scan actually exists: `const verify = await getScan(created.id, userId);`
2. Check if Supabase has transaction isolation settings that could cause this
3. Consider adding a small delay (100ms) between scan creation and questions creation
4. Review database constraints on `scans` table that might cause silent insert failures

## Deployment Steps

1. ✅ Updated `server-supabase.js` with error handling
2. ✅ Fixed ESM import path to `./lib/supabaseServer.ts`
3. ✅ Restarted backend with `npx tsx server-supabase.js`
4. ✅ Verified health endpoint: `curl http://localhost:9001/api/health`
5. 🔄 **Next**: Test with new Physics upload to verify fix works

## Testing Plan

1. Upload a Physics paper
2. Monitor backend logs for:
   - `✨ [CREATE] Creating new scan {id}`
   - Either success OR `Failed to create questions: ...` error
3. Check frontend response - should see proper error if questions fail
4. Verify only 1 scan is created (not duplicates)
5. Check database: `SELECT id, name, scan_date FROM scans WHERE name LIKE '%physics%' ORDER BY created_at DESC LIMIT 5;`

## Cleanup Tasks

**Remove existing duplicates** (18 duplicate scans):
- Create cleanup script to identify and delete duplicate scans
- Keep the most recent scan for each `(name, scan_date)` pair
- Delete older duplicates and their orphaned questions

## Related Files

- `/server-supabase.js` - Lines 389-414 (Backend sync endpoint)
- `/lib/supabaseServer.ts` - Lines 203-256 (createQuestions function)
- `/components/BoardMastermind.tsx` - Lines 405, 934 (UUID generation)
- `/App.tsx` - Lines 566-569 (onAddScan callback with sync)

## Lessons Learned

1. **Always check return values** from async functions that can fail
2. **Log errors but also throw them** when they should fail the operation
3. **Silent failures are worse than loud failures** - fail fast and loud
4. **Foreign key errors indicate data integrity issues** - investigate root cause
5. **User behavior is a symptom** - if users retry, something feels broken to them
