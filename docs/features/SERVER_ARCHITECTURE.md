# Server Architecture Explanation

## Current State: Two Server Files

### 1. `server.js` (Currently Running ✅)
- **Status**: Active on port 9001
- **Backend**: Redis (cache) + In-Memory fallback
- **Purpose**: Lightweight server for development/testing
- **Features**:
  - ✅ Basic scan CRUD operations
  - ✅ Redis caching
  - ✅ Learning Journey endpoints (recently added)
  - ✅ Subscription & pricing endpoints (recently added)
  - ❌ NO persistent database (data lost on restart)
  - ❌ NO multi-user authentication
  - ❌ NO payment processing

### 2. `server-supabase.js` (Production-Ready, Not Running ❌)
- **Status**: Available but has import conflicts
- **Backend**: Supabase (PostgreSQL) + Redis (optional cache) + Supabase Auth
- **Purpose**: Full-featured production server
- **Features**:
  - ✅ Persistent database storage (Supabase PostgreSQL)
  - ✅ Multi-user authentication (Supabase Auth)
  - ✅ Payment processing (RazorPay integration)
  - ✅ Subscription management
  - ✅ Email queue system
  - ✅ Webhook handlers
  - ✅ All Learning Journey endpoints
  - ✅ Complete API with proper auth middleware

## Why Two Servers Exist

### Historical Context
1. **Phase 1**: Started with `server.js` (Redis-only, simple)
2. **Phase 2**: Built `server-supabase.js` for production (Supabase + all features)
3. **Phase 3**: You kept both for backward compatibility during migration

### Current Problem
- `server.js` is running but lacks many features (was missing subscription endpoints)
- `server-supabase.js` has all features but won't start due to import conflicts with frontend code

## Recommendation: Consolidate to One Server

### Option A: Fix and Use `server-supabase.js` (Recommended)
**Pros**:
- Full feature set
- Production-ready
- Proper authentication
- Database persistence

**Cons**:
- Need to fix import conflicts
- More complex

### Option B: Keep Using `server.js`
**Pros**:
- Simple and working
- Good for quick development

**Cons**:
- No data persistence
- Missing many features
- Not scalable

## Current Patches Applied

I've patched `server.js` to add the missing endpoints:
- ✅ `/api/pricing/plans`
- ✅ `/api/subscription/status`

This keeps your system running but is a **temporary solution**.

## Next Steps (Recommended)

1. **Short-term**: Continue with `server.js` for immediate work
2. **Medium-term**: Fix import issues in `server-supabase.js`
3. **Long-term**: Migrate fully to `server-supabase.js` and delete `server.js`

---

**Current Status**: `server.js` is running with patches. System functional but not production-ready.
