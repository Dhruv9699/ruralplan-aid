# PERFORMANCE BASELINE — BEFORE OPTIMIZATION

**Date:** September 4, 2026  
**Purpose:** Record performance metrics before optimization to quantify improvements

## Metrics to Track

### 1. Initial Page Load
- Full page load time (first paint, first meaningful paint)
- Bundle size
- Time to interactive

### 2. Language Switching Performance
- Time to complete language switch (EN → HI)
- Time to complete language switch (HI → MR)
- Time to complete language switch (MR → EN)
- Any UI lag/jank observed

### 3. Dashboard Navigation
- Time to load /dashboard
- Time to select different product
- Time for demand/weather/alerts recalculation

### 4. Assistant Operations
- Time to open assistant page
- Time for first message to respond
- Time for subsequent messages

### 5. Network Requests
- Supabase queries on app load
- Supabase queries on language switch (should be 0)
- Weather API calls on assistant message
- Any duplicate requests

## Baseline Test Procedure

1. Hard refresh (clear cache)
2. Measure time to interactive
3. Navigate to dashboard
4. Measure product selector load
5. Switch language EN → HI (measure time)
6. Switch language HI → MR (measure time)
7. Switch language MR → EN (measure time)
8. Navigate to assistant
9. Send message (measure response time)
10. Check DevTools Network tab for duplicates

## Expected Issues (from inspection report)

- [ ] Language switching causes full app re-render
- [ ] Dashboard recalculates on language change
- [ ] Weather called on every assistant message
- [ ] Translation lookup not memoized
- [ ] getNestedTranslation called repeatedly

## POST-OPTIMIZATION GOAL

Achieve measurable improvement in:
- Language switch time (target: <100ms)
- Dashboard load (target: <500ms)
- Assistant response (target: current + LLM time)
- No unnecessary re-renders during language change

---

**Status:** Ready to baseline  
**Next:** Profile current performance
