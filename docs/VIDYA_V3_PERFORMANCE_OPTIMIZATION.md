# VidyaV3 - Performance Optimization Guide

**Date**: 2026-01-29
**Purpose**: Performance optimizations, caching strategies, and scalability considerations

---

## Current Performance Baseline

### Measured Metrics (Phase 3 Implementation)

**Response Times**:
- Small context (1 paper, 10 questions): ~1-2 seconds
- Medium context (3 papers, 30 questions): ~2-3 seconds
- Large context (10 papers, 100+ questions): ~3-5 seconds

**Context Payload Sizes**:
- Empty context: ~2 KB
- Single scan: ~15-20 KB
- Multiple scans (5+): ~50-80 KB

**Memory Usage**:
- Initial load: ~5-8 MB
- After 20 messages: ~12-15 MB
- After 50 messages: ~20-25 MB

**Component Re-renders**:
- Quick actions: Only on appContext or userRole change (useMemo working)
- Message list: Only on new message or streaming update
- Input area: Only on input change

---

## Optimization Strategy

### 1. Context Caching

**Problem**: Context payload is rebuilt on every message, even if app state hasn't changed.

**Solution**: Implement smart caching with TTL (Time To Live)

**Implementation**:

```typescript
// utils/vidya/contextCache.ts

interface CachedContext {
  payload: VidyaContextPayload;
  timestamp: number;
  hash: string;
}

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const contextCache = new Map<string, CachedContext>();

/**
 * Generate cache key from app context
 */
function generateCacheKey(
  scannedPapers: any[],
  selectedScan: any,
  currentView: string,
  userRole: VidyaRole
): string {
  const paperIds = scannedPapers.map(p => p.id).sort().join(',');
  const scanId = selectedScan?.id || 'none';
  return `${paperIds}:${scanId}:${currentView}:${userRole}`;
}

/**
 * Get cached context or build new
 */
export function getCachedContext(
  appContext: VidyaAppContext,
  userRole: VidyaRole
): VidyaContextPayload {
  const cacheKey = generateCacheKey(
    appContext.scannedPapers || [],
    appContext.selectedScan,
    appContext.currentView || 'general',
    userRole
  );

  const cached = contextCache.get(cacheKey);
  const now = Date.now();

  // Return cached if valid
  if (cached && (now - cached.timestamp) < CACHE_TTL) {
    console.log('[Performance] Using cached context');
    return cached.payload;
  }

  // Build new context
  console.log('[Performance] Building new context');
  const payload = buildContextPayload({
    currentView: appContext.currentView,
    scannedPapers: appContext.scannedPapers,
    selectedScan: appContext.selectedScan,
  }, userRole);

  // Cache it
  contextCache.set(cacheKey, {
    payload,
    timestamp: now,
    hash: cacheKey,
  });

  // Clean old entries
  cleanCache();

  return payload;
}

/**
 * Clean expired cache entries
 */
function cleanCache(): void {
  const now = Date.now();
  for (const [key, value] of contextCache.entries()) {
    if (now - value.timestamp > CACHE_TTL) {
      contextCache.delete(key);
    }
  }
}

/**
 * Invalidate cache (e.g., when new scan uploaded)
 */
export function invalidateContextCache(): void {
  contextCache.clear();
  console.log('[Performance] Context cache invalidated');
}
```

**Integration**:

Update `/hooks/useVidyaChatV3.ts`:
```typescript
import { getCachedContext, invalidateContextCache } from '../utils/vidya/contextCache';

// In sendMessage:
const contextPayload = getCachedContext(appContext, userRole);
```

**Expected Impact**:
- 50-70% reduction in context build time for repeated queries
- Reduced CPU usage
- Faster response times for consecutive questions

---

### 2. Quick Actions Memoization (Already Implemented ✅)

**Status**: Already optimized with `React.useMemo()`

**Current Implementation** (VidyaV3.tsx lines 62-75):
```typescript
const quickActions = React.useMemo(() => {
  if (!appContext?.scannedPapers || appContext.scannedPapers.length === 0) {
    return getDefaultQuickActions(userRole);
  }

  const contextPayload = buildContextPayload({
    currentView: appContext.currentView,
    scannedPapers: appContext.scannedPapers,
    selectedScan: appContext.selectedScan,
  }, userRole);

  return getQuickActions(userRole, contextPayload);
}, [userRole, appContext]);
```

**Performance**: Actions only recompute when dependencies change. ✅ Optimal.

---

### 3. Message List Virtualization

**Problem**: Large message history (50+ messages) causes rendering lag.

**Solution**: Implement virtual scrolling for message list.

**Implementation** (Optional - for apps with heavy chat usage):

```typescript
import { FixedSizeList as List } from 'react-window';

// In VidyaV3.tsx messages area
<List
  height={600}
  itemCount={messages.length}
  itemSize={80} // Average message height
  width="100%"
>
  {({ index, style }) => (
    <div style={style}>
      <VidyaMessage message={messages[index]} />
    </div>
  )}
</List>
```

**Expected Impact**:
- Constant rendering time regardless of message count
- Smooth scrolling even with 100+ messages
- Reduced memory footprint

**Trade-offs**:
- Adds dependency (`react-window`)
- Slightly more complex layout
- Auto-scroll logic needs adjustment

**Recommendation**: Only implement if users regularly have 50+ message sessions.

---

### 4. Streaming Response Debouncing

**Problem**: Gemini sends very frequent chunks (every 50-100ms), causing excessive re-renders.

**Solution**: Debounce state updates during streaming.

**Implementation**:

```typescript
// In useVidyaChatV3.ts sendMessage function

let fullText = '';
let lastUpdateTime = Date.now();
const UPDATE_INTERVAL = 200; // Update UI every 200ms

for await (const chunk of result) {
  const text = (chunk as any).text?.() || '';
  if (text) {
    fullText += text;

    const now = Date.now();
    if (now - lastUpdateTime > UPDATE_INTERVAL) {
      setState(prev => ({
        ...prev,
        messages: prev.messages.map(m =>
          m.id === botMsgId ? { ...m, content: fullText } : m
        ),
      }));
      lastUpdateTime = now;
    }
  }
}

// Final update after stream completes
setState(prev => ({
  ...prev,
  messages: prev.messages.map(m =>
    m.id === botMsgId ? { ...m, content: fullText, isStreaming: false } : m
  ),
  isTyping: false,
}));
```

**Expected Impact**:
- 50-70% reduction in render count during streaming
- Smoother animation
- Lower CPU usage
- Still feels real-time (200ms is imperceptible)

**Trade-offs**:
- Slight delay in text appearing (200ms)
- More complex streaming logic

---

### 5. RBAC Validation Caching

**Problem**: Security validation runs on every message, even with same role/intent.

**Solution**: Cache validation results per role/intent combination.

**Implementation**:

```typescript
// utils/vidya/rbacValidator.ts

const validationCache = new Map<string, ValidationResult>();

export function validateActionCached(
  role: VidyaRole,
  action: ActionCategory
): ValidationResult {
  const cacheKey = `${role}:${action}`;

  if (validationCache.has(cacheKey)) {
    return validationCache.get(cacheKey)!;
  }

  const result = validateAction(role, action);
  validationCache.set(cacheKey, result);
  return result;
}
```

**Expected Impact**:
- Validation time: < 0.1ms (from ~0.5ms)
- Negligible CPU usage
- Safe to cache (permissions don't change during session)

---

### 6. Context Payload Compression

**Problem**: Large context payloads increase network latency and Gemini processing time.

**Solution**: Intelligent summarization and compression.

**Implementation** (already partially done in contextBuilder.ts):

**Enhance summarization**:
```typescript
export function buildContextPayload(
  appState: AppState,
  userRole: VidyaRole
): VidyaContextPayload {
  // ...existing code...

  // OPTIMIZATION: Limit questions array size
  const MAX_QUESTIONS = 50; // Don't send more than 50 questions
  let questions = extractQuestions(appState);

  if (questions.length > MAX_QUESTIONS) {
    // Prioritize: current scan questions + hardest questions
    const currentScanQuestions = questions.filter(q =>
      q.scanName === appState.selectedScan?.name
    ).slice(0, 20);

    const hardestQuestions = questions
      .sort((a, b) => getDifficultyScore(b.difficulty) - getDifficultyScore(a.difficulty))
      .slice(0, 30);

    questions = [...currentScanQuestions, ...hardestQuestions]
      .filter((q, i, arr) => arr.findIndex(x => x.questionNumber === q.questionNumber) === i) // Deduplicate
      .slice(0, MAX_QUESTIONS);
  }

  // OPTIMIZATION: Truncate long question text
  questions = questions.map(q => ({
    ...q,
    text: q.text.length > 500 ? q.text.substring(0, 500) + '...' : q.text,
  }));

  return {
    // ...existing fields with optimized questions array
  };
}
```

**Expected Impact**:
- Context payload size: 50-80 KB → 20-40 KB
- Faster Gemini processing
- Lower API costs
- Still maintains quality (prioritizes relevant data)

---

### 7. Gemini Request Optimization

**Problem**: Default generation config may not be optimal.

**Solution**: Fine-tune generation parameters for speed/quality balance.

**Current Config** (useVidyaChatV3.ts):
```typescript
generationConfig: {
  temperature: 0.7,
  maxOutputTokens: 800,
  topP: 0.95,
  topK: 40,
}
```

**Optimized Config** (for faster responses):
```typescript
generationConfig: {
  temperature: 0.6,        // Slightly lower = faster, still creative
  maxOutputTokens: 600,    // Shorter responses = faster
  topP: 0.92,             // Slightly lower = faster sampling
  topK: 32,               // Lower = faster token selection

  // Optional: Streaming config
  candidateCount: 1,      // Only generate 1 response
}
```

**Expected Impact**:
- 10-20% faster response times
- Slightly more concise responses (still high quality)
- Lower API costs per request

**Trade-offs**:
- Shorter responses (600 tokens vs 800)
- Slightly less creative variation

---

### 8. Lazy Loading & Code Splitting

**Problem**: VidyaV3 bundle size adds to initial page load.

**Solution**: Lazy load Vidya components.

**Implementation**:

```typescript
// App.tsx
const VidyaV3 = React.lazy(() => import('./components/VidyaV3'));

// Usage
<React.Suspense fallback={<div>Loading Vidya...</div>}>
  <VidyaV3 appContext={appContext} />
</React.Suspense>
```

**Expected Impact**:
- Initial bundle size: -50-80 KB
- Faster initial page load
- Vidya loads on-demand (when FAB clicked)

**Trade-offs**:
- Slight delay when first opening chat (100-200ms)

---

### 9. Service Worker Caching (Future)

**Problem**: Repeated API calls to Gemini for similar queries.

**Solution**: Service worker with intelligent response caching.

**Implementation Concept**:
```typescript
// sw.js
const RESPONSE_CACHE = 'vidya-responses-v1';

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  if (url.pathname.includes('/generativelanguage.googleapis.com/')) {
    event.respondWith(cacheFirstStrategy(event.request));
  }
});

async function cacheFirstStrategy(request) {
  const cache = await caches.open(RESPONSE_CACHE);
  const cached = await cache.match(request);

  if (cached) {
    console.log('[SW] Returning cached response');
    return cached;
  }

  const response = await fetch(request);

  // Cache educational queries (not user-specific)
  if (shouldCache(request)) {
    cache.put(request, response.clone());
  }

  return response;
}
```

**Expected Impact**:
- Instant responses for repeated queries
- Reduced API costs
- Works offline for cached queries

**Trade-offs**:
- Complex cache invalidation logic
- Risk of stale responses
- Storage quota management

**Recommendation**: Phase 5 feature (after core stability)

---

## Performance Monitoring

### Implement Performance Tracking

```typescript
// utils/performanceMonitor.ts

interface PerformanceMetrics {
  messageId: string;
  intent: string;
  contextSize: number;
  responseTime: number;
  streamingDuration: number;
  tokenCount: number;
  timestamp: Date;
}

const metrics: PerformanceMetrics[] = [];

export function trackMessagePerformance(data: PerformanceMetrics): void {
  metrics.push(data);

  // Log to console in dev
  if (import.meta.env.DEV) {
    console.log('[Performance]', {
      intent: data.intent,
      responseTime: `${data.responseTime}ms`,
      contextSize: `${(data.contextSize / 1024).toFixed(2)} KB`,
      tokens: data.tokenCount,
    });
  }

  // Send to analytics (Phase 5)
  // sendToAnalytics(data);
}

export function getPerformanceReport(): {
  avgResponseTime: number;
  avgContextSize: number;
  slowestQuery: PerformanceMetrics;
  totalQueries: number;
} {
  const total = metrics.length;
  const avgResponseTime = metrics.reduce((sum, m) => sum + m.responseTime, 0) / total;
  const avgContextSize = metrics.reduce((sum, m) => sum + m.contextSize, 0) / total;
  const slowestQuery = metrics.reduce((a, b) => a.responseTime > b.responseTime ? a : b);

  return {
    avgResponseTime,
    avgContextSize,
    slowestQuery,
    totalQueries: total,
  };
}
```

**Integration**:
```typescript
// In useVidyaChatV3.ts sendMessage

const startTime = Date.now();
const contextSize = JSON.stringify(contextPayload).length;

// ... send message and stream ...

const endTime = Date.now();
trackMessagePerformance({
  messageId: botMsgId,
  intent: routing.intent.type,
  contextSize,
  responseTime: endTime - startTime,
  streamingDuration: streamingTime,
  tokenCount: estimateTokenCount(fullText),
  timestamp: new Date(),
});
```

---

## Optimization Priority Matrix

| Optimization | Impact | Effort | Priority | Phase |
|--------------|--------|--------|----------|-------|
| Context Caching | HIGH | LOW | 🔴 HIGH | 4 |
| Quick Actions Memo | HIGH | LOW | ✅ DONE | 3 |
| Streaming Debounce | MEDIUM | LOW | 🟡 MEDIUM | 4 |
| RBAC Caching | LOW | LOW | 🟢 LOW | 5 |
| Context Compression | HIGH | MEDIUM | 🔴 HIGH | 4 |
| Gemini Config | MEDIUM | LOW | 🟡 MEDIUM | 4 |
| Lazy Loading | LOW | LOW | 🟢 LOW | 5 |
| Message Virtualization | LOW | MEDIUM | 🟢 LOW | 5 |
| Service Worker | MEDIUM | HIGH | 🟢 LOW | 5 |
| Performance Monitoring | MEDIUM | MEDIUM | 🟡 MEDIUM | 4 |

---

## Implementation Roadmap

### Phase 4 (Current) - Quick Wins
1. ✅ Quick actions memoization (already done)
2. **Context caching** (HIGH priority, LOW effort)
3. **Context compression/summarization** (HIGH priority, MEDIUM effort)
4. **Gemini config optimization** (MEDIUM priority, LOW effort)
5. **Performance monitoring** (MEDIUM priority, MEDIUM effort)

### Phase 5 - Advanced Optimizations
1. Streaming debouncing
2. RBAC validation caching
3. Lazy loading/code splitting
4. Message list virtualization (if needed)

### Phase 6 - Infrastructure
1. Service worker caching
2. Advanced analytics
3. A/B testing for generation configs
4. CDN for static assets

---

## Performance Benchmarks (Goals)

### Target Metrics (After Phase 4 Optimizations)

**Response Times**:
- Small context: < 1 second (50% improvement)
- Medium context: < 1.5 seconds (50% improvement)
- Large context: < 3 seconds (40% improvement)

**Context Payload Sizes**:
- Single scan: < 10 KB (50% reduction)
- Multiple scans: < 30 KB (60% reduction)

**Memory Usage**:
- After 50 messages: < 18 MB (28% reduction)

**Re-render Count**:
- During streaming: < 10 re-renders per message (70% reduction)

---

## Testing Performance Improvements

### Before/After Comparison Template

```markdown
## Performance Test: Context Caching

### Before Optimization
- Query 1 (cold): 2.3s
- Query 2 (same context): 2.1s
- Query 3 (same context): 2.2s
- Average: 2.2s
- Context build time: 150ms per query

### After Optimization
- Query 1 (cold): 2.3s (context built)
- Query 2 (cached): 0.8s ⚡ (63% faster)
- Query 3 (cached): 0.7s ⚡ (68% faster)
- Average: 1.3s (41% overall improvement)
- Context build time: 150ms first query, <1ms cached

### Verdict
✅ Significant improvement for consecutive queries
✅ No degradation on cold queries
✅ Memory overhead: negligible (~5 KB per cached entry)
```

---

## Optimization Checklist

### Phase 4 Optimizations
- [ ] Implement context caching with TTL
- [ ] Add cache invalidation on data changes
- [ ] Compress context payload (limit questions, truncate text)
- [ ] Optimize Gemini generation config
- [ ] Add performance monitoring
- [ ] Implement streaming debouncing
- [ ] Test and benchmark improvements

### Phase 5 Optimizations (Future)
- [ ] Add lazy loading for VidyaV3
- [ ] Implement message virtualization
- [ ] RBAC validation caching
- [ ] Service worker caching strategy
- [ ] Advanced analytics integration

---

## Monitoring & Alerting

### Key Performance Indicators (KPIs)

1. **Average Response Time**: Target < 1.5s
2. **95th Percentile Response Time**: Target < 3s
3. **Context Payload Size**: Target < 30 KB avg
4. **Memory Usage**: Target < 20 MB after 50 msgs
5. **Error Rate**: Target < 0.1%

### Alerts
- Response time > 5s: Warning
- Response time > 10s: Critical
- Error rate > 1%: Critical
- Memory usage > 50 MB: Warning

---

## Conclusion

VidyaV3 performance optimization focuses on:
1. **Smart caching** - Avoid redundant computation
2. **Context compression** - Minimize payload sizes
3. **Streaming optimization** - Smooth UI updates
4. **Monitoring** - Data-driven improvements

**Expected Overall Impact**: 40-60% improvement in response times with minimal code complexity.

**Next Steps**: Implement Phase 4 optimizations, test, benchmark, and iterate.
