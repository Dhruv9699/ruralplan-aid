# RuralPlan AI - Merge Instructions for Old Version Restoration

**Status:** ✅ READY FOR MERGE

**Old Version:** `a2d097d` - "Built full RuralPlan app" (2026-08-09)
**Current Version:** `3de7ca1` - "Update RuralPlan AI" (2026-09-04)
**Test Report:** `RESTORED_OLD_VERSION_TEST_REPORT.md` (✅ ALL TESTS PASSED)

---

## BACKUP BRANCHES CREATED

Before any merge, these branches were created for safety:

1. **`backup/before-old-version-restore`** - Points to current HEAD (3de7ca1)
   - Contains all current work
   - Fully recoverable if needed
   - Will NOT be deleted

2. **`restore/old-ruralplan`** - Points to old version (a2d097d)
   - Ready to merge to main
   - Build verified (0 errors)
   - All routes and features verified

---

## EXACT MERGE COMMANDS

### ⚠️ IMPORTANT: DO NOT EXECUTE THESE YET

User must explicitly approve before running these commands.

### Command Option 1: Simple Merge (Fast-Forward)

```bash
git checkout main
git merge restore/old-ruralplan
```

**Result:** Moves main branch pointer to a2d097d commit
**History:** Linear, clean
**Time:** Instant

### Command Option 2: Merge Commit (Preserves History)

```bash
git checkout main
git merge --no-ff restore/old-ruralplan -m "Restore full RuralPlan app from a2d097d (Built full RuralPlan app)"
```

**Result:** Creates new merge commit
**History:** Shows both branches merged
**Time:** Creates 1 new commit

### Command Option 3: After Merge, Push to GitHub

```bash
git push origin main
```

**Important:** Only run this if deploying to production
**Consequence:** Changes visible to all team members
**Reversible:** Yes (git revert possible)

---

## WHAT WILL CHANGE WHEN MERGED

### Files That Will Revert to Old Version

**Routes (12 pages):**
- `src/routes/index.tsx` - Landing page
- `src/routes/auth.tsx` - Authentication
- `src/routes/dashboard.tsx` - Dashboard
- `src/routes/products.tsx` - Products
- `src/routes/sales.tsx` - Sales
- `src/routes/inventory.tsx` - Inventory
- `src/routes/planner.tsx` - Production Planner
- `src/routes/production-history.tsx` - Production History
- `src/routes/weather.tsx` - Weather
- `src/routes/alerts.tsx` - Alerts
- `src/routes/assistant.tsx` - Assistant
- `src/routes/settings.tsx` - Settings

**Core Engine (7 modules):**
- `src/lib/ruralplan/engine.ts` - Production planning logic
- `src/lib/ruralplan/alerts.ts` - Alert generation
- `src/lib/ruralplan/weather.ts` - Weather impact
- `src/lib/ruralplan/assistant.ts` - LLM assistant
- `src/lib/ruralplan/store.tsx` - State management
- `src/lib/ruralplan/types.ts` - Type definitions
- `src/lib/ruralplan/demo.ts` - Demo data

**Components:**
- `src/components/app-shell.tsx` - App shell
- `src/components/field.tsx` - Field component
- `src/components/stat-card.tsx` - Stat card component

**Styles:**
- `src/styles.css` - Stylesheet

---

## WHAT WILL BE REMOVED

### Files Deleted After Merge

These files will be removed from working tree:

```
src/routes/recipes.tsx                          ← Removed
src/routes/product-discovery.tsx                ← Removed
src/lib/ruralplan/recipes.ts                    ← Removed
src/lib/ruralplan/coldStartDemand.ts            ← Removed
src/lib/ruralplan/coldStartTransition.ts        ← Removed
src/lib/ruralplan/productSuitability.ts         ← Removed
src/lib/ruralplan/learningLoop.ts               ← Removed
src/lib/ruralplan/productionPlanning.ts         ← Removed
src/lib/ruralplan/useAssistantLLM.ts            ← Removed
src/components/product-discovery/               ← Removed
src/components/cold-start-setup.tsx             ← Removed
src/i18n/en.json                                ← Removed
src/i18n/hi.json                                ← Removed
src/i18n/mr.json                                ← Removed
src/i18n/useTranslation.tsx                     ← Removed
src/integrations/supabase/                      ← All Supabase files removed
supabase/functions/assistant/                   ← Removed
supabase/migrations/                            ← All migrations removed
```

---

## WHAT WILL NOT BE AFFECTED

### Safety Guarantees

✅ **Supabase database remains untouched**
- All data in Supabase tables stays intact
- `profiles`, `products`, `sales_history`, `inventory`, `production_history`, `production_recommendations` tables preserved
- No schema modifications
- No data loss

✅ **.env file safely ignored**
- Old code doesn't use Supabase variables
- SUPABASE_URL and SUPABASE_ANON_KEY will be ignored (not accessed)
- .env file remains as-is (you may want to comment out Supabase vars)

✅ **Backup branch preserved**
- `backup/before-old-version-restore` points to 3de7ca1
- Can always checkout `backup/before-old-version-restore` to restore current work
- Easy rollback available

✅ **Git history preserved**
- No force pushes
- No history rewriting
- All commits remain

---

## RECOVERY PROCEDURE (If Needed)

If you want to revert back to current version after merge:

```bash
# Option 1: Go back to current version (switch branches)
git checkout main
git reset --hard 3de7ca1

# Option 2: Revert the merge commit (creates new commit)
git revert HEAD -m 1

# Option 3: Restore to backup branch
git checkout backup/before-old-version-restore
git branch -D main
git branch -m main
git push -f origin main  # Only if needed
```

---

## PRE-MERGE CHECKLIST

Before executing merge commands:

- [ ] Read and understand `RESTORED_OLD_VERSION_TEST_REPORT.md`
- [ ] All tests passed (✅ confirmed)
- [ ] Backup branch created (`backup/before-old-version-restore`)
- [ ] Old version branch ready (`restore/old-ruralplan`)
- [ ] Understand what changes (routes, features, storage method)
- [ ] Know recovery procedure (if rollback needed)
- [ ] Decision made: merge now or wait?
- [ ] If merging: choose merge command (Option 1 or Option 2)
- [ ] If pushing: ensure team is informed

---

## MERGE DECISION MATRIX

| If You Want... | Command | Time | Notes |
|---|---|---|---|
| **Simple, fast merge** | Option 1 | Instant | Recommended for most cases |
| **Keep branch history** | Option 2 | Instant | Better for complex changes |
| **Deploy to production** | Option 3 (after 1 or 2) | Seconds | Pushes to GitHub/Vercel |
| **Test first** | `npm run dev` | Minutes | Start dev server on restore/old-ruralplan branch |
| **Rollback later** | Use recovery procedure | Varies | Easy undo if problems arise |

---

## VERIFICATION AFTER MERGE

After merge, verify the restored website:

```bash
# 1. Verify branch state
git branch -v                    # Should show main at a2d097d
git log --oneline -5             # Should show old commits

# 2. Verify files exist
ls -la src/routes/dashboard.tsx  # Should exist
ls -la src/lib/ruralplan/engine.ts  # Should exist

# 3. Start development server
npm run dev

# 4. Test in browser
# Visit http://localhost:5173
# - See landing page
# - Click auth → test signup
# - Add product
# - See dashboard
# - Test all routes
```

---

## SUMMARY

| Item | Status |
|------|--------|
| **Old version ready?** | ✅ YES |
| **Build passes?** | ✅ YES (0 errors) |
| **All features present?** | ✅ YES (12 routes, 7 engines) |
| **Safe to merge?** | ✅ YES (data protected, backup available) |
| **Merge commands ready?** | ✅ YES (see above) |
| **Recovery possible?** | ✅ YES (easy rollback) |

---

## FINAL DECISION

**User must explicitly decide:**

1. **YES, merge now** → Execute Command Option 1 or 2
2. **NO, keep testing** → Stay on restore/old-ruralplan branch, run `npm run dev`
3. **MAYBE, review more** → Read `RESTORED_OLD_VERSION_TEST_REPORT.md` again

---

**Ready when you are. User approval required before merge.**

