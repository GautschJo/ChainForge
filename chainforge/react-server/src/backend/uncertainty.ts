/**
 * Uncertainty-as-an-output helpers for the Uncertainty Auditor node.
 *
 * Pure functions (no React) so they can be unit-tested — the repo tests
 * backend/*.ts but has no React component tests. The node (UncertaintyAuditNode.tsx)
 * only wires these into UI + a Plotly forest plot.
 *
 * The confidence-interval approach (t-stat for small n, bootstrap for large n, with the
 * n=50 cutoff from Zhu & Kolassa https://doi.org/10.1080/03610918.2017.1348516) mirrors
 * the in-progress error-bar code stubbed out in VisNode.tsx.
 */
import {
  sampleWithReplacement,
  mean,
  quantile,
  sampleVariance,
  standardDeviation,
} from "simple-statistics";
import jStat from "jstat";
import {
  LLMResponse,
  EvaluationScore,
  LLMResponseData,
  RatingDict,
} from "./typing";

// This module stays pure (no ./utils or ./cache imports) so the math is unit-testable —
// importing utils.ts transitively pulls an ESM-only Google dep that Jest can't transform.
// The node injects `resolveLabel` (llmResponseDataToString) to resolve hashed var values.

/** Default label resolver: used in tests; the node passes llmResponseDataToString. */
const defaultResolve = (d: LLMResponseData): string =>
  typeof d === "string"
    ? d
    : typeof d === "number"
      ? String(d)
      : d?.d ?? "(none)";

/** Metavars that are internal machinery rather than user variables. */
const isUserMetavar = (key: string): boolean =>
  !(key.startsWith("LLM_") || key.startsWith("__pt"));

/** Coerce an eval score to a number: booleans -> 1/0, non-numbers -> 0. */
export const castEvalScoreToNum = (score: EvaluationScore): number => {
  if (typeof score === "number") return score;
  else if (typeof score === "boolean") return score ? 1 : 0;
  else return 0; // unknown / string / object leaf — soft fail to 0
};

/** mulberry32 PRNG — seeded so the bootstrap is reproducible frame-to-frame. */
const seededRandom = (seed: number): (() => number) => {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

/** FNV-1a over the (rounded) values, so identical data always seeds identically. */
const hashValues = (values: number[]): number => {
  let h = 2166136261;
  for (const v of values) {
    h ^= Math.round(v * 1e6) | 0;
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
};

/**
 * Bootstrap percentile CI. LLM outputs need not be normal, so for larger n we resample.
 * Seeded from the data itself: the audit number must not jiggle between re-renders on
 * identical evidence (it lives inside a React useMemo the node recomputes on every rating).
 */
export const bootstrapCI = (
  values: number[],
  numSamples = 1000,
  alpha = 0.05,
): { low: number; high: number } => {
  const rand = seededRandom(hashValues(values));
  const means: number[] = [];
  for (let i = 0; i < numSamples; i++)
    means.push(mean(sampleWithReplacement(values, values.length, rand)));
  return {
    low: quantile(means, alpha / 2),
    high: quantile(means, 1 - alpha / 2),
  };
};

export interface CI {
  mean: number;
  low: number;
  high: number;
  margin: number; // half-width = (high - low) / 2
}

/**
 * Interval method. "auto" = t/bootstrap (Wilson for 0/1); "wilson"/"bayes" force a
 * proportion interval; "sequence" = an anytime-valid confidence sequence, valid under
 * continuous monitoring (the live human-rating / peeking case).
 */
export type StatMethod = "auto" | "wilson" | "bayes" | "sequence";

/**
 * Robbins normal-mixture confidence-sequence bounds for a proportion p of n trials.
 * Anytime-valid: the coverage guarantee holds no matter when you stop looking, so
 * recomputing it after every rating and stopping when it's narrow does NOT inflate the
 * error rate the way a fixed-sample CI does. Always wider than the fixed interval.
 * The radius depends only on (n, alpha), so it also feeds the gap-difference combination.
 * ponytail: σ=1/2 is the Hoeffding sub-Gaussian proxy for [0,1]; tighten with an
 *           empirical-Bernstein variance proxy if the extra width bites.
 */
const sequenceBounds = (
  p: number,
  n: number,
  alpha: number,
): { low: number; high: number; margin: number } => {
  const rho = 1;
  const radius =
    0.5 *
    Math.sqrt(
      ((2 * (n * rho + 1)) / (n * n * rho)) *
        Math.log(Math.sqrt(n * rho + 1) / alpha),
    );
  return {
    low: Math.max(0, p - radius),
    high: Math.min(1, p + radius),
    margin: radius,
  };
};

/** Anytime-valid confidence sequence for a [0,1]-bounded mean. */
const sequenceCI = (samples: number[], alpha: number): CI => {
  const p = mean(samples);
  return { mean: p, ...sequenceBounds(p, samples.length, alpha) };
};

/**
 * Whether the selected interval method actually applies to this data, mirroring the
 * routing in `confidenceInterval`: sequence needs [0,1]-bounded, Wilson/Bayes need
 * strict 0/1, auto always applies. When false, the method silently falls back to
 * t/bootstrap — the node surfaces that so the displayed interval isn't misrepresented.
 */
export const methodApplies = (
  scores: number[],
  method: StatMethod = "auto",
): boolean => {
  if (scores.length === 0 || method === "auto") return true;
  if (method === "sequence") return scores.every((s) => s >= 0 && s <= 1);
  return scores.every((s) => s === 0 || s === 1); // wilson / bayes
};

/** Wilson score bounds for a proportion p of n trials (also used by Newcombe). */
const wilsonBounds = (
  p: number,
  n: number,
  alpha: number,
): { low: number; high: number; margin: number } => {
  const z = jStat.normal.inv(1 - alpha / 2, 0, 1);
  const denom = 1 + (z * z) / n;
  const center = (p + (z * z) / (2 * n)) / denom;
  const half =
    (z / denom) * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n));
  return { low: center - half, high: center + half, margin: half };
};

/** Wilson score interval for a proportion. `mean` stays the raw sample mean. */
const wilsonCI = (samples: number[], alpha: number): CI => {
  const p = mean(samples);
  return { mean: p, ...wilsonBounds(p, samples.length, alpha) };
};

/** Equal-tailed Beta credible interval with a uniform prior: Beta(s+1, n−s+1). */
const bayesCI = (samples: number[], alpha: number): CI => {
  const n = samples.length;
  const s = samples.reduce((a, b) => a + b, 0);
  const low = jStat.beta.inv(alpha / 2, s + 1, n - s + 1);
  const high = jStat.beta.inv(1 - alpha / 2, s + 1, n - s + 1);
  return { mean: mean(samples), low, high, margin: (high - low) / 2 };
};

/** 95%-by-default CI for the mean of `samples`, returned as absolute bounds. */
export const confidenceInterval = (
  samples: number[],
  alpha = 0.05,
  method: StatMethod = "auto",
): CI => {
  if (samples.length === 0) return { mean: 0, low: 0, high: 0, margin: 0 };

  // Anytime-valid confidence sequence: any [0,1]-bounded data (proportions, thumbs).
  // Checked before the 0/1 branch so "sequence" wins over Wilson for binary data.
  if (method === "sequence" && samples.every((s) => s >= 0 && s <= 1))
    return sequenceCI(samples, alpha);

  // 0/1 data is a proportion — Wilson (or Beta) is the right interval and is never
  // degenerate at p∈{0,1} or n=1, so a constant pass/fail column can't render as a
  // zero-width "certain" whisker. "auto" therefore also routes binary data here.
  // ponytail: Wilson/Bayes on NON-binary data silently falls back to t/bootstrap
  //           below. The fallback lives here and nowhere else.
  if (samples.every((s) => s === 0 || s === 1))
    return method === "bayes"
      ? bayesCI(samples, alpha)
      : wilsonCI(samples, alpha);

  const m = mean(samples);
  if (samples.length < 2) return { mean: m, low: m, high: m, margin: 0 };

  if (samples.length < 50) {
    // t-based CI — more reliable than bootstrapping below n=50 (Zhu & Kolassa).
    const se = standardDeviation(samples) / Math.sqrt(samples.length);
    const t = jStat.studentt.inv(1 - alpha / 2, samples.length - 1);
    const margin = t * se;
    return { mean: m, low: m - margin, high: m + margin, margin };
  }

  const { low, high } = bootstrapCI(samples, 1000, alpha);
  return { mean: m, low, high, margin: (high - low) / 2 };
};

/** A group-by selector: "__llm__", a var name, or "__meta_"+metavarName. */
export type GroupBy = string;
export const GROUP_BY_LLM = "__llm__";

const groupValue = (
  r: LLMResponse,
  groupBy: GroupBy,
  resolve: (d: LLMResponseData) => string,
): string => {
  if (groupBy === GROUP_BY_LLM)
    return typeof r.llm === "string" || typeof r.llm === "number"
      ? resolve(r.llm)
      : r.llm?.name ?? "(unknown LLM)";
  const raw: LLMResponseData | undefined = groupBy.startsWith("__meta_")
    ? r.metavars?.[groupBy.slice("__meta_".length)]
    : r.vars?.[groupBy];
  return raw === undefined ? "(none)" : resolve(raw);
};

const scoresForResponse = (r: LLMResponse, metric: string): number[] =>
  (r.eval_res?.items ?? []).map((it) =>
    castEvalScoreToNum(
      typeof it === "object" && it !== null
        ? (it as Record<string, EvaluationScore>)[metric]
        : it,
    ),
  );

/** Thumbs grades for a response as 1/0. Unrated items are excluded, NOT zeroed. */
const humanScoresForResponse = (
  r: LLMResponse,
  grades: Record<string, RatingDict>,
): number[] =>
  Object.values(grades[r.uid] ?? {})
    .filter((v): v is boolean => typeof v === "boolean")
    .map((v) => (v ? 1 : 0));

export interface GroupEstimate {
  name: string;
  n: number;
  estimate: number;
  ciLow: number;
  ciHigh: number;
  margin: number;
  variance: number; // sample variance (0 when n<2), for Welch gap CI
  binary: boolean; // all scores 0/1 — gap CI uses Newcombe instead of Welch
  sufficient: boolean; // n >= 2 — below that, the CI is degenerate, not certain
  methodFellBack: boolean; // selected method couldn't apply → t/bootstrap was used
  meetsTarget: boolean;
  worst?: number; // human mode only: estimate if every unrated item were 👎
  best?: number; // human mode only: estimate if every unrated item were 👍
  total?: number; // human mode only: total items incl. unrated (for the "rate remaining" hint)
}

/** Per-group running estimate + CI + stopping decision. */
export const estimateGroups = (
  responses: LLMResponse[],
  opts: {
    groupBy: GroupBy;
    metric: string;
    targetMargin: number;
    resolveLabel?: (d: LLMResponseData) => string;
    method?: StatMethod;
    alpha?: number; // one confidence level for group CIs AND the gap CI
    scoreSource?: "eval" | "human";
    grades?: Record<string, RatingDict>; // uid -> RatingDict, for "human"
  },
): GroupEstimate[] => {
  const { groupBy, metric, targetMargin, method } = opts;
  const alpha = opts.alpha ?? 0.05;
  const resolve = opts.resolveLabel ?? defaultResolve;

  const byGroup = new Map<string, number[]>();
  const totalByGroup = new Map<string, number>(); // items per group, incl. unrated
  for (const r of responses) {
    const g = groupValue(r, groupBy, resolve);
    const arr = byGroup.get(g) ?? [];
    const scores =
      opts.scoreSource === "human"
        ? humanScoresForResponse(r, opts.grades ?? {})
        : scoresForResponse(r, metric);
    for (const s of scores) arr.push(s);
    byGroup.set(g, arr);
    totalByGroup.set(
      g,
      (totalByGroup.get(g) ?? 0) + (r.responses?.length ?? 0),
    );
  }

  const out: GroupEstimate[] = [];
  for (const [name, scores] of byGroup.entries()) {
    const ci = confidenceInterval(scores, alpha, method);
    const sufficient = scores.length >= 2;
    const binary = scores.length > 0 && scores.every((s) => s === 0 || s === 1);
    // ponytail: a zero-width CI from constant continuous scores below the bootstrap
    //           cutoff is coincidence, not precision — it must not "meet target".
    //           (< 1e-12, not === 0: constant floats leave ~1e-16 rounding dust.)
    const meetsTarget =
      sufficient &&
      ci.margin <= targetMargin &&
      !(ci.margin < 1e-12 && scores.length < 50);

    // Human mode: exact bounds on where the estimate can still end up
    // ("how much it could still change based on the evidence so far").
    let worst: number | undefined;
    let best: number | undefined;
    let total: number | undefined;
    if (opts.scoreSource === "human") {
      const t = totalByGroup.get(name) ?? 0;
      if (t > 0) {
        total = t;
        const s = scores.reduce((a, b) => a + b, 0);
        worst = s / t; // all remaining 👎
        best = (s + (t - scores.length)) / t; // all remaining 👍
      }
    }

    out.push({
      name,
      n: scores.length,
      estimate: ci.mean,
      ciLow: ci.low,
      ciHigh: ci.high,
      margin: ci.margin,
      variance: sufficient ? sampleVariance(scores) : 0,
      binary,
      sufficient,
      methodFellBack: !methodApplies(scores, method),
      meetsTarget,
      worst,
      best,
      total,
    });
  }
  out.sort((a, b) => a.name.localeCompare(b.name));
  return out;
};

export interface Disparity {
  gap: number; // highest group estimate − lowest
  gapLow: number; // Welch CI on the difference-of-means
  gapHigh: number;
  conclusive: boolean; // true when the gap CI excludes 0
  low: string; // name of lowest-estimate group
  high: string; // name of highest-estimate group
  nLow: number; // sample size of the lowest-estimate group (for the sample hint)
  nHigh: number; // sample size of the highest-estimate group
  anytimeValid: boolean; // gap CI holds under continuous monitoring (safe live stopping)
  alpha: number; // Bonferroni-adjusted level actually used (for the sample-size hint)
  envLow?: number; // finite-batch envelope: gap if every unrated item went against the gap
  envHigh?: number; // gap if every unrated item went with it (human mode only)
  unrated?: number; // items still ungraded across all groups (human mode; "rate remaining k")
}

/** Between-group disparity of the extreme groups. Null if <2 groups have enough data. */
export const disparity = (
  groups: GroupEstimate[],
  alpha = 0.05,
  method: StatMethod = "auto",
): Disparity | null => {
  const valid = groups.filter((g) => g.n >= 2);
  if (valid.length < 2) return null;
  let lo = valid[0];
  let hi = valid[0];
  for (const g of valid) {
    if (g.estimate < lo.estimate) lo = g;
    if (g.estimate > hi.estimate) hi = g;
  }
  // Bonferroni: the extreme pair is picked post hoc among k·(k−1)/2 comparisons.
  const k = valid.length;
  const a = k > 2 ? alpha / ((k * (k - 1)) / 2) : alpha;
  const gap = hi.estimate - lo.estimate;
  let gapLow: number;
  let gapHigh: number;
  let anytimeValid = false;
  if (hi.binary && lo.binary && method === "sequence") {
    // Genuinely anytime-valid difference: interval-arithmetic (Minkowski) difference of
    // two confidence SEQUENCES, each union-bounded at a/2 so both hold simultaneously
    // over all stopping times. Wider than Newcombe, but the anytime guarantee is real —
    // Newcombe-of-sequences would be tighter but does NOT inherit over-time coverage.
    const h = sequenceBounds(hi.estimate, hi.n, a / 2);
    const l = sequenceBounds(lo.estimate, lo.n, a / 2);
    gapLow = h.low - l.high;
    gapHigh = h.high - l.low;
    anytimeValid = true;
  } else if (hi.binary && lo.binary) {
    // Newcombe difference-of-proportions (Wilson) — fixed-sample, tighter, not anytime-valid.
    // Honest (nonzero width) even at p = 0 or 1 where variance is zero.
    const h = wilsonBounds(hi.estimate, hi.n, a);
    const l = wilsonBounds(lo.estimate, lo.n, a);
    gapLow =
      gap - Math.sqrt((hi.estimate - h.low) ** 2 + (l.high - lo.estimate) ** 2);
    gapHigh =
      gap + Math.sqrt((h.high - hi.estimate) ** 2 + (lo.estimate - l.low) ** 2);
  } else {
    // Welch CI for (hi − lo): independent continuous samples, unequal variances.
    // ponytail: no closed-form anytime-valid difference bound for continuous data here,
    //           so this stays fixed-sample and anytimeValid is false — the node then
    //           refuses to promise safe live stopping.
    const seDiff = Math.sqrt(hi.variance / hi.n + lo.variance / lo.n);
    const dfNum = (hi.variance / hi.n + lo.variance / lo.n) ** 2;
    const dfDen =
      (hi.variance / hi.n) ** 2 / (hi.n - 1) +
      (lo.variance / lo.n) ** 2 / (lo.n - 1);
    const df = dfDen > 0 ? dfNum / dfDen : 1;
    const half = seDiff > 0 ? jStat.studentt.inv(1 - a / 2, df) * seDiff : 0;
    gapLow = gap - half;
    gapHigh = gap + half;
  }
  // Finite-batch envelope: where the max−min gap could still land once every unrated
  // item resolves. Taken over ALL groups, not just the current extreme pair — a middle
  // group's unrated items could push it past hi.best or below lo.worst and become the
  // new extreme (so a pair-only envelope is not conservative for k>2). Human mode only.
  const bests: number[] = [];
  const worsts: number[] = [];
  let unratedTotal = 0;
  for (const g of valid) {
    if (g.worst !== undefined && g.best !== undefined) {
      bests.push(g.best);
      worsts.push(g.worst);
      unratedTotal += (g.total ?? g.n) - g.n;
    }
  }
  // envLow = smallest guaranteed max−min gap (highest floor − lowest ceiling; >0 means a
  // disparity is certain however the unrated resolve). envHigh = largest possible gap.
  // Generalizes the pair's [hi.worst − lo.best, hi.best − lo.worst] to all groups, so a
  // middle group swinging past the current extremes still counts (conservative for k>2).
  const hasEnv = bests.length >= 2;
  const envLow = hasEnv ? Math.max(...worsts) - Math.min(...bests) : undefined;
  const envHigh = hasEnv ? Math.max(...bests) - Math.min(...worsts) : undefined;
  return {
    gap,
    gapLow,
    gapHigh,
    conclusive: gapLow > 0,
    low: lo.name,
    high: hi.name,
    nLow: lo.n,
    nHigh: hi.n,
    anytimeValid,
    alpha: a,
    envLow,
    envHigh,
    unrated: hasEnv ? unratedTotal : undefined,
  };
};

/** Anytime-valid gap half-width (interval-arith of two a/2 sequences) at grown sizes. */
const seqGapHalf = (nLow: number, nHigh: number, a: number): number =>
  sequenceBounds(0, nLow, a / 2).margin +
  sequenceBounds(0, nHigh, a / 2).margin;

/** Past this many extra samples the hint is useless for hand-rating — report Infinity. */
const SAMPLE_HINT_MAX = 100000;

/**
 * Additional samples (across the two extreme groups) to make the *gap* CI resolve the
 * audit — either exclude 0 (confirm a disparity) or fit inside ±delta (confirm none),
 * whichever is closer. This is the honest "keep sampling" hint: it tracks the gap CI,
 * not per-group precision, so it agrees with the gap-driven stop decision.
 * Returns `Infinity` when the target is unreachable within a sane budget (the node
 * renders that as "many" rather than a nonsense count).
 */
export const gapSamplesNeeded = (gap: Disparity, delta: number): number => {
  const h = (gap.gapHigh - gap.gapLow) / 2;
  if (h <= 0) return 0;
  const g = Math.abs(gap.gap);
  // Feasible target half-widths: shrink below |gap| to exclude 0, or below delta−|gap|
  // to fit the equivalence band. Larger target ⇒ less shrinking ⇒ fewer samples.
  const target = Math.max(g > 0 ? g : 0, g < delta ? delta - g : 0);
  if (target <= 0 || h <= target) return 0;
  const n = gap.nLow + gap.nHigh;

  if (gap.anytimeValid) {
    // A confidence sequence shrinks like √(log n′/n′), not 1/√n, so the 1/√n law
    // undershoots. Invert the sequence width numerically: doubling search + bisection
    // on total added samples, split proportionally to current group sizes.
    const fracLow = gap.nLow / n;
    const halfAt = (m: number) =>
      seqGapHalf(
        gap.nLow + m * fracLow,
        gap.nHigh + m * (1 - fracLow),
        gap.alpha,
      );
    let hiM = 1;
    while (halfAt(hiM) > target) {
      hiM *= 2;
      if (hiM > SAMPLE_HINT_MAX) return Infinity;
    }
    let loM = 0;
    while (hiM - loM > 1) {
      const mid = Math.floor((loM + hiM) / 2);
      if (halfAt(mid) <= target) hiM = mid;
      else loM = mid;
    }
    return hiM;
  }

  // ponytail: fixed-sample half-width ∝ 1/√n. A hint, not a power calc.
  const m = Math.ceil(n * ((h / target) ** 2 - 1));
  return m > SAMPLE_HINT_MAX ? Infinity : m;
};

export interface StopDecision {
  state:
    | "confirmed"
    | "equivalent"
    | "sampling"
    | "collecting"
    | "insufficient";
  color: string;
  label: string;
  moreNeeded?: number; // gap-based sample hint, when state is "sampling"
}

/** Which population the audit is about: the finite batch of items, or the model. */
export type AuditScope = "batch" | "model";

/**
 * The audit's stop/continue verdict. Never green-lights stopping while any group is
 * still unmeasured (`awaitingCount > 0`). Which interval gates depends on `scope`:
 * "model" (default) infers the super-population rate, so unrated items are just
 * unsampled draws the CI already covers — the CI gates and the envelope is context;
 * "batch" is about these exact items, so the finite-batch envelope gates and the CI
 * is context. The two are NOT AND-ed (that forbids the early stop the sequence enables).
 */
export const stopDecision = (
  gap: Disparity | null,
  awaitingCount: number,
  equivalenceDelta: number,
  scope: AuditScope = "model",
): StopDecision => {
  if (!gap)
    return {
      state: "insufficient",
      color: "gray",
      label: "Need ≥2 groups with data to compare",
    };
  if (awaitingCount > 0)
    return {
      state: "collecting",
      color: "yellow",
      label: `Collecting — ${awaitingCount} group${
        awaitingCount > 1 ? "s" : ""
      } awaiting data`,
    };

  const { envLow, envHigh, unrated } = gap;
  // "This batch": the finite-batch envelope IS the interval — it clears only when every
  // possible resolution of the unrated items agrees.
  if (scope === "batch" && envLow !== undefined && envHigh !== undefined) {
    if (envLow > 0)
      return {
        state: "confirmed",
        color: "red",
        label: "Batch disparity confirmed — safe to stop",
      };
    if (envLow >= -equivalenceDelta && envHigh <= equivalenceDelta)
      return {
        state: "equivalent",
        color: "green",
        label: "No meaningful batch disparity — safe to stop",
      };
    const k = unrated ?? 0;
    return {
      state: "sampling",
      color: "yellow",
      label: `Keep rating — ${k} item${
        k === 1 ? "" : "s"
      } left (gap could be [${envLow.toFixed(2)}, ${envHigh.toFixed(2)}])`,
    };
  }

  // "The model": the (rated-only) CI gates; unrated items are unsampled draws it covers.
  if (gap.gapLow > 0)
    return {
      state: "confirmed",
      color: "red",
      label: "Disparity confirmed — safe to stop",
    };
  if (gap.gapLow >= -equivalenceDelta && gap.gapHigh <= equivalenceDelta)
    return {
      state: "equivalent",
      color: "green",
      label: "No meaningful disparity — safe to stop",
    };
  const moreNeeded = gapSamplesNeeded(gap, equivalenceDelta);
  return {
    state: "sampling",
    color: "yellow",
    label: Number.isFinite(moreNeeded)
      ? `Keep sampling (~${moreNeeded} more)`
      : "Keep sampling (many more)",
    moreNeeded,
  };
};

/** Group-by options present in the responses: var names + "__meta_"-prefixed metavars. */
export const findGroupVars = (responses: LLMResponse[]): string[] => {
  const vars = new Set<string>();
  for (const r of responses) {
    Object.keys(r.vars ?? {}).forEach((k) => vars.add(k));
    Object.keys(r.metavars ?? {})
      .filter(isUserMetavar)
      .forEach((k) => vars.add("__meta_" + k));
  }
  return Array.from(vars);
};

/**
 * Which response to hand-rate next.
 * "random": uniform over unrated items. "active": an unrated item from the
 * widest-CI group that hasn't met the target margin — rate where it shrinks
 * uncertainty fastest.
 */
export const pickNextToRate = (
  responses: LLMResponse[],
  groups: GroupEstimate[],
  grades: Record<string, RatingDict>,
  opts: {
    policy: "random" | "active";
    groupBy: GroupBy;
    resolveLabel?: (d: LLMResponseData) => string;
  },
): { uid: string; innerIdx: number; group: string } | null => {
  const resolve = opts.resolveLabel ?? defaultResolve;
  const candidates: { uid: string; innerIdx: number; group: string }[] = [];
  for (const r of responses) {
    const group = groupValue(r, opts.groupBy, resolve);
    for (let i = 0; i < (r.responses?.length ?? 0); i++)
      if (typeof grades[r.uid]?.[i] !== "boolean")
        candidates.push({ uid: r.uid, innerIdx: i, group });
  }
  if (candidates.length === 0) return null;

  if (opts.policy === "active") {
    // Widest-margin unmet group first, walking down until one has an unrated item.
    const unmet = groups
      .filter((g) => !g.meetsTarget)
      .sort((a, b) => b.margin - a.margin);
    for (const g of unmet) {
      const c = candidates.find((cand) => cand.group === g.name);
      if (c) return c;
    }
    // All unmet groups fully rated (or none unmet) -> any remaining item.
    return candidates[0];
  }

  return candidates[Math.floor(Math.random() * candidates.length)];
};

/** Metric keys in eval results: object items expose their keys; scalar items -> "score". */
export const findMetrics = (responses: LLMResponse[]): string[] => {
  const keys = new Set<string>();
  for (const r of responses)
    for (const item of r.eval_res?.items ?? []) {
      if (typeof item === "object" && item !== null)
        Object.keys(item).forEach((k) => keys.add(k));
      else keys.add("score");
    }
  return Array.from(keys);
};
