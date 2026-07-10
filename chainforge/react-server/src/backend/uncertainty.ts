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
  standardDeviation,
} from "simple-statistics";
import jStat from "jstat";
import { LLMResponse, EvaluationScore, LLMResponseData } from "./typing";

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

/** Bootstrap percentile CI. LLM outputs need not be normal, so for larger n we resample. */
export const bootstrapCI = (
  values: number[],
  numSamples = 1000,
  alpha = 0.05,
): { low: number; high: number } => {
  const means: number[] = [];
  for (let i = 0; i < numSamples; i++)
    means.push(mean(sampleWithReplacement(values, values.length, Math.random)));
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

/** 95%-by-default CI for the mean of `samples`, returned as absolute bounds. */
export const confidenceInterval = (samples: number[], alpha = 0.05): CI => {
  const m = samples.length > 0 ? mean(samples) : 0;
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

export interface GroupEstimate {
  name: string;
  n: number;
  estimate: number;
  ciLow: number;
  ciHigh: number;
  margin: number;
  meetsTarget: boolean;
  nNeeded: number; // additional samples est. to reach targetMargin
}

/** Per-group running estimate + CI + stopping decision. */
export const estimateGroups = (
  responses: LLMResponse[],
  opts: {
    groupBy: GroupBy;
    metric: string;
    targetMargin: number;
    resolveLabel?: (d: LLMResponseData) => string;
  },
): GroupEstimate[] => {
  const { groupBy, metric, targetMargin } = opts;
  const resolve = opts.resolveLabel ?? defaultResolve;

  const byGroup = new Map<string, number[]>();
  for (const r of responses) {
    const g = groupValue(r, groupBy, resolve);
    const arr = byGroup.get(g) ?? [];
    for (const s of scoresForResponse(r, metric)) arr.push(s);
    byGroup.set(g, arr);
  }

  const out: GroupEstimate[] = [];
  for (const [name, scores] of byGroup.entries()) {
    const ci = confidenceInterval(scores);
    const meetsTarget = scores.length >= 2 && ci.margin <= targetMargin;
    // ponytail: normal-approx (margin ∝ 1/√n) → n_target = n·(margin/target)². A hint,
    //           not a power calc; swap for a real sample-size calc if auditors need exactness.
    const nNeeded =
      meetsTarget || scores.length < 2 || targetMargin <= 0
        ? 0
        : Math.max(
            0,
            Math.ceil(scores.length * (ci.margin / targetMargin) ** 2) -
              scores.length,
          );
    out.push({
      name,
      n: scores.length,
      estimate: ci.mean,
      ciLow: ci.low,
      ciHigh: ci.high,
      margin: ci.margin,
      meetsTarget,
      nNeeded,
    });
  }
  out.sort((a, b) => a.name.localeCompare(b.name));
  return out;
};

export interface Disparity {
  gap: number; // highest group estimate − lowest
  conclusive: boolean; // true when the two extreme groups' CIs don't overlap
  low: string; // name of lowest-estimate group
  high: string; // name of highest-estimate group
}

/** Between-group disparity of the extreme groups. Null if <2 groups have enough data. */
export const disparity = (groups: GroupEstimate[]): Disparity | null => {
  const valid = groups.filter((g) => g.n >= 2);
  if (valid.length < 2) return null;
  let lo = valid[0];
  let hi = valid[0];
  for (const g of valid) {
    if (g.estimate < lo.estimate) lo = g;
    if (g.estimate > hi.estimate) hi = g;
  }
  // ponytail: CI-overlap is a cheap "is the gap distinguishable" proxy; upgrade to a
  //           two-proportion / Welch test if the false-positive rate matters.
  return {
    gap: hi.estimate - lo.estimate,
    conclusive: hi.ciLow > lo.ciHigh,
    low: lo.name,
    high: hi.name,
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
