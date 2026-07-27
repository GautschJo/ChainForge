# Uncertainty Auditor — implementation handoff (updated)

## Goal

Make `UncertaintyAuditNode` satisfy this audit requirement:

> **Uncertainty as an audit output.** Auditors need to know the current fairness
> estimate and how much it could still change based on the evidence so far. Tools
> should treat uncertainty as a key output — e.g. live-updated intervals with clear
> stopping points, instead of point estimates that hide what is still unknown.

## Files

- **Logic (pure, unit-tested):** `chainforge/react-server/src/backend/uncertainty.ts`
- **Plot spec builder (pure):** `chainforge/react-server/src/backend/uncertaintyPlot.ts`
- **UI (ReactFlow node):** `chainforge/react-server/src/UncertaintyAuditNode.tsx`
- **Tests:** `chainforge/react-server/src/backend/__test__/uncertainty.test.ts`

Keep all math in `uncertainty.ts` — it stays free of `./utils`/`./cache` imports so Jest
can run it (importing utils pulls an ESM-only Google dep Jest can't transform). The node
injects `resolveLabel` for hashed var values. Run one test file:

```
cd chainforge/react-server
CI=true npx craco test src/backend/__test__/uncertainty.test.ts
```

---

## Already implemented — do NOT redo

- **Interval on the disparity gap** + **gap-driven stop verdict** (`stopDecision`). (uncertainty.ts:355-590, node:222)
- **n<2 / constant-score groups** not faked as certain; Wilson/Bayes for 0/1; zero-width continuous margins don't `meetsTarget`. (uncertainty.ts:196-204, 317-320)
- **Worst/best remaining-movement band** (per group, human mode). (uncertainty.ts:322-333, uncertaintyPlot.ts:42-62)
- **Configurable confidence** + **separate equivalence band** ("Negligible δ"). (node:77, 263-288)
- **Silent method fallback surfaced** (`methodFellBack` → caption). (uncertainty.ts:145-152, node:341-346)
- **Seeded bootstrap** (reproducible). (uncertainty.ts:50-89)
- **Multiplicity** — Bonferroni gap CI when >2 groups, captioned. (uncertainty.ts:382-384, node:417-422)
- **Genuinely anytime-valid gap CI** in sequence mode (interval-arith difference of two `a/2` sequences); Newcombe for the fixed-sample branch; caption gated on `anytimeValid`. (uncertainty.ts:389-400, node:426-437)
- **Sequence-aware sample hint** with a sane clamp (`gapSamplesNeeded` → `Infinity` → "many more"). (uncertainty.ts:437-508)
- **Gap on its own scale** — pure `buildForestPlot`, two stacked panels, 0/±δ confined to the gap panel. (uncertaintyPlot.ts:32-213)
- **Stop respects unrated items, scoped** — `disparity` computes the finite-batch envelope over ALL
  groups (`max(worsts) − min(bests)`), and `stopDecision` takes an `AuditScope`: **model** (default —
  the anytime-valid CI gates, unrated items are unsampled draws it covers, early stop works) vs **batch**
  (the finite-batch envelope gates). A **Scope** Select wires it; the envelope is drawn as a band and the
  captions match the mode. The two are no longer AND-ed. (uncertainty.ts:430-450, 536-604, node:346-456)

---

## Status: the criteria are met

Every clause of the requirement is now satisfied — current fairness estimate, how much it could still
change (gap CI + finite-batch envelope + per-group worst/best), uncertainty as the primary output
(badge + dedicated gap panel), live-updated intervals with a clear, scope-aware stopping point, and no
bare point estimates. The remaining items below are **optional enhancements and polish, not criteria
gaps.** No new substantive defect was found this pass.

**Do this before another design pass:** write the regression tests below and run the node against a real
rated set — reality will surface anything a further source read won't. The one open *product* decision
(Scope default: `model` vs `batch`) is a human judgment, not a bug.

---

## Optional — trajectory ("based on the evidence so far")

- **Convergence trace.** Record `(n, gap, gapLow, gapHigh)` snapshots as evidence accumulates (store on
  `node.data.history`, capped length) and plot the gap band shrinking over n, so the stopping point
  reads as a trajectory and the auditor can see convergence/momentum. The current interval + envelope
  already answer "how much could it still change", so this is an enhancement, not a requirement.

---

## Minor / disclosed

- **Panel layout.** `GAP_DOMAIN=[0,0.16]` / `GROUP_DOMAIN=[0.4,1]` fixed (uncertaintyPlot.ts:22-23) →
  dead space + compressed group rows for several groups; decision panel sits at the bottom. Size domains
  from `ready.length`; consider gap-on-top.
- **Level annotation.** Group whiskers at `alpha`, gap at `a/2` (uncertainty.ts:311 vs 382-397);
  separate titled panels defuse most confusion, but annotate the group panel's level.
- **Continuous-[0,1] gap under sequence** stays fixed-sample Welch (uncertainty.ts:410-423),
  `anytimeValid` false there. Conservatively disclosed.

---

## Testing checklist — the real next step (lock in behavior before more design)

These assert the current behavior; write them before any further change so the six rounds of
statistical logic can't silently regress.

- **Scope decouples the gate:** with `scope: "model"`, two groups at n=40 rated (opposite outcomes) +
  unrated remainder → `stopDecision` can be `confirmed` on the CI alone; with `scope: "batch"`, the same
  input stays `sampling` until the envelope clears.
- **Envelope covers all groups:** three groups where a middle group's unrated best/worst exceed the
  current extreme pair → `envHigh`/`envLow` reflect the middle group, not just hi/lo.
- **Plot scale:** layout has `xaxis2`/`yaxis2`; ±δ band and 0 line on `x2` confined to `GAP_DOMAIN`;
  gap trace x is `gap.gap`; envelope band present in human mode.
- **Core invariants:** `gapLow < gap < gapHigh`; sequence gap is the `a/2` interval-arith width and
  `anytimeValid` only there; `gapSamplesNeeded` → `Infinity` past `SAMPLE_HINT_MAX`; `methodFellBack`
  iff the method can't apply; seeded bootstrap deterministic; `worst <= estimate <= best`.

## Where this stands

The criteria are met. What's left is optional (convergence trace) or cosmetic (the Minor list) — none
of it is a reason the node fails the requirement. The productive next actions are: (1) land the tests
above, (2) run the node against a real rated set to confirm behavior, (3) let a human pick the Scope
default. Further source-only review will keep surfacing design tradeoffs, not defects.
