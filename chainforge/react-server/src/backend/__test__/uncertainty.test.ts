import { expect, test } from "@jest/globals";
import {
  confidenceInterval,
  estimateGroups,
  disparity,
  gapSamplesNeeded,
  stopDecision,
  pickNextToRate,
  Disparity,
  GROUP_BY_LLM,
} from "../uncertainty";
import { buildForestPlot, VERDICT_HEX } from "../uncertaintyPlot";
import { LLMResponse, EvaluationScore, RatingDict } from "../typing";

// A synthetic disparity result: gap ± half on two equal-n extreme groups.
const mkGap = (gap: number, half: number, n: number): Disparity => ({
  gap,
  gapLow: gap - half,
  gapHigh: gap + half,
  conclusive: gap - half > 0,
  low: "A",
  high: "B",
  nLow: n,
  nHigh: n,
  anytimeValid: false,
  alpha: 0.05,
});

// Binary group whose mean is ~p over n items (deterministic pattern).
const binaryGroup = (name: string, p: number, n: number, uid?: string) =>
  resp(
    name,
    Array.from({ length: n }, (_, i) => (i / n < p ? 1 : 0)),
    "modelA",
    uid,
  );

// Build a minimal LLMResponse with a `group` var and boolean/number eval scores.
const resp = (
  group: string,
  items: EvaluationScore[],
  llm = "modelA",
  uid?: string,
): LLMResponse =>
  ({
    uid: uid ?? Math.random().toString(),
    prompt: "p",
    vars: { group },
    metavars: {},
    llm,
    responses: items.map(() => "r"),
    eval_res: { items, dtype: "Boolean" },
  }) as unknown as LLMResponse;

test("confidenceInterval brackets the mean and tightens with more data", () => {
  const small = confidenceInterval([1, 0, 1, 0, 1, 1]); // 6 samples, mean .666
  expect(small.mean).toBeCloseTo(4 / 6, 5);
  expect(small.low).toBeLessThan(small.mean);
  expect(small.high).toBeGreaterThan(small.mean);

  // Same proportion, many more samples -> much tighter margin.
  const bigItems = Array.from({ length: 600 }, (_, i) => (i % 3 === 2 ? 0 : 1));
  const big = confidenceInterval(bigItems);
  expect(big.mean).toBeCloseTo(2 / 3, 2);
  expect(big.margin).toBeLessThan(small.margin);
});

test("confidenceInterval degenerate cases", () => {
  expect(confidenceInterval([]).margin).toBe(0);
  // Non-binary single sample: nothing sensible to say -> degenerate.
  expect(confidenceInterval([0.5]).margin).toBe(0);
  // Binary single sample routes through Wilson: wide, never a fake point.
  const one = confidenceInterval([1]);
  expect(one.margin).toBeGreaterThan(0.2);
  expect(one.low).toBeGreaterThan(0);
  expect(one.high).toBeCloseTo(1, 5);
});

test("all-pass binary eval group gets a wide Wilson interval, not zero-width certainty", () => {
  // n=5, every item scored 1: honest proportion interval is ~[0.57, 1.0].
  const g = estimateGroups([resp("A", [1, 1, 1, 1, 1])], {
    groupBy: "group",
    metric: "score",
    targetMargin: 0.01,
  })[0];
  expect(g.margin).toBeGreaterThan(0);
  expect(g.ciLow).toBeCloseTo(0.566, 2);
  expect(g.ciHigh).toBeCloseTo(1, 5);
  expect(g.meetsTarget).toBe(false);
});

test("constant continuous scores at small n are not treated as precise", () => {
  // Zero variance from n=3 identical values is not evidence of precision.
  const g = estimateGroups([resp("A", [0.7, 0.7, 0.7])], {
    groupBy: "group",
    metric: "score",
    targetMargin: 0.9,
  })[0];
  expect(g.margin).toBeLessThan(1e-9); // fp dust, not a real interval
  expect(g.meetsTarget).toBe(false);
});

test("one alpha drives both the group CIs and the gap CI", () => {
  const responses = [
    resp(
      "A",
      Array.from({ length: 100 }, (_, i) => i % 2 === 0),
    ),
    resp(
      "B",
      Array.from({ length: 100 }, (_, i) => i % 4 !== 0),
    ),
  ];
  const opts = { groupBy: "group", metric: "score", targetMargin: 0.05 };
  const g90 = estimateGroups(responses, { ...opts, alpha: 0.1 });
  const g99 = estimateGroups(responses, { ...opts, alpha: 0.01 });
  expect(g99[0].margin).toBeGreaterThan(g90[0].margin);
  expect(g99[1].margin).toBeGreaterThan(g90[1].margin);

  const d90 = disparity(g90, 0.1)!;
  const d99 = disparity(g99, 0.01)!;
  expect(d99.gapHigh - d99.gapLow).toBeGreaterThan(d90.gapHigh - d90.gapLow);
});

test("gap CI on binary data is a proportion interval (Newcombe), not normal-theory", () => {
  // All-1 vs all-0: Welch on zero variance would collapse to [1, 1].
  const many = (v: number) => Array.from({ length: 200 }, () => v);
  const d = disparity(
    estimateGroups([resp("A", many(1)), resp("B", many(0))], {
      groupBy: "group",
      metric: "score",
      targetMargin: 0.05,
    }),
  )!;
  expect(d.gap).toBeCloseTo(1, 5);
  expect(d.gapLow).toBeLessThan(1); // Newcombe keeps honest width at p=0/1
  expect(d.gapLow).toBeGreaterThan(0.9);
  expect(d.gapHigh).toBeCloseTo(1, 3);
});

test("gap CI is Bonferroni-adjusted when more than two groups compete", () => {
  const a = resp(
    "A",
    Array.from({ length: 100 }, (_, i) => i % 2 === 0),
  ); // .5
  const b = resp(
    "B",
    Array.from({ length: 100 }, (_, i) => i % 4 !== 0),
  ); // .75
  const c = resp(
    "C",
    Array.from({ length: 100 }, (_, i) => i % 8 !== 0),
  ); // .875
  const opts = { groupBy: "group", metric: "score", targetMargin: 0.05 };
  const two = disparity(estimateGroups([a, c], opts))!;
  const three = disparity(estimateGroups([a, b, c], opts))!;
  // Same extreme pair (A vs C), but three groups -> adjusted, wider interval.
  expect(three.low).toBe(two.low);
  expect(three.high).toBe(two.high);
  expect(three.gapHigh - three.gapLow).toBeGreaterThan(
    two.gapHigh - two.gapLow,
  );
});

test("estimateGroups meetsTarget flips as target loosens", () => {
  const items = Array.from({ length: 40 }, (_, i) => i % 2 === 0); // 20/40 true
  const responses = [resp("A", items)];

  // Tiny target -> not enough evidence yet.
  const tight = estimateGroups(responses, {
    groupBy: "group",
    metric: "score",
    targetMargin: 0.01,
  })[0];
  expect(tight.estimate).toBeCloseTo(0.5, 5);
  expect(tight.n).toBe(40);
  expect(tight.meetsTarget).toBe(false);

  // Loose target -> stop.
  const loose = estimateGroups(responses, {
    groupBy: "group",
    metric: "score",
    targetMargin: 0.9,
  })[0];
  expect(loose.meetsTarget).toBe(true);
});

test("estimateGroups splits by the chosen variable", () => {
  const responses = [resp("A", [1, 1, 1, 1]), resp("B", [0, 0, 0, 0])];
  const groups = estimateGroups(responses, {
    groupBy: "group",
    metric: "score",
    targetMargin: 0.05,
  });
  expect(groups.map((g) => g.name)).toEqual(["A", "B"]); // sorted
  expect(groups[0].estimate).toBe(1);
  expect(groups[1].estimate).toBe(0);
});

test("disparity is conclusive only when CIs don't overlap", () => {
  const many = (v: number) => Array.from({ length: 200 }, () => v);
  const separated = estimateGroups([resp("A", many(1)), resp("B", many(0))], {
    groupBy: "group",
    metric: "score",
    targetMargin: 0.05,
  });
  const dSep = disparity(separated)!;
  expect(dSep.gap).toBeCloseTo(1, 5);
  expect(dSep.conclusive).toBe(true);

  // Two groups with identical, overlapping distributions -> inconclusive.
  const overlapItems = Array.from({ length: 30 }, (_, i) => i % 2 === 0);
  const overlapping = estimateGroups(
    [resp("A", overlapItems), resp("B", overlapItems)],
    { groupBy: "group", metric: "score", targetMargin: 0.05 },
  );
  expect(disparity(overlapping)!.conclusive).toBe(false);
});

test("disparity null with fewer than two populated groups", () => {
  const one = estimateGroups([resp("A", [1, 0, 1])], {
    groupBy: "group",
    metric: "score",
    targetMargin: 0.05,
  });
  expect(disparity(one)).toBeNull();
});

test("groupBy LLM buckets by model name", () => {
  const responses = [resp("x", [1, 1], "modelA"), resp("x", [0, 0], "modelB")];
  const groups = estimateGroups(responses, {
    groupBy: GROUP_BY_LLM,
    metric: "score",
    targetMargin: 0.05,
  });
  expect(groups.map((g) => g.name).sort()).toEqual(["modelA", "modelB"]);
});

test("wilson interval matches hand-computed values on binary data", () => {
  // p = 0.8, n = 10, z = 1.959964 -> Wilson bounds [0.4902, 0.9433]
  const samples = [1, 1, 1, 1, 1, 1, 1, 1, 0, 0];
  const ci = confidenceInterval(samples, 0.05, "wilson");
  expect(ci.mean).toBeCloseTo(0.8, 5); // plot dot stays at the sample mean
  expect(ci.low).toBeCloseTo(0.4902, 3);
  expect(ci.high).toBeCloseTo(0.9433, 3);
});

test("wilson on non-binary data falls back to the auto method", () => {
  const samples = [0.5, 0.7, 0.3]; // n=3 -> deterministic t path
  expect(confidenceInterval(samples, 0.05, "wilson")).toEqual(
    confidenceInterval(samples, 0.05, "auto"),
  );
});

test("bayes interval matches Beta posterior quantiles", () => {
  // 0 of 3 successes -> posterior Beta(1,4), inv CDF = 1-(1-q)^(1/4)
  const ci = confidenceInterval([0, 0, 0], 0.05, "bayes");
  expect(ci.low).toBeCloseTo(0.00631, 4);
  expect(ci.high).toBeCloseTo(0.60236, 4);

  // All successes: a real, in-[0,1] interval where t would be degenerate.
  const allPass = confidenceInterval([1, 1, 1, 1, 1], 0.05, "bayes");
  expect(allPass.low).toBeGreaterThan(0);
  expect(allPass.high).toBeLessThanOrEqual(1);
  expect(allPass.margin).toBeGreaterThan(0);
});

test("human score source uses grades and excludes unrated items", () => {
  const responses = [
    resp("A", [1, 1, 1], "modelA", "u1"), // 3 inner responses
    resp("A", [1, 1], "modelA", "u2"), // 2 inner responses, ungraded
  ];
  const grades: Record<string, RatingDict> = { u1: { 0: true, 1: false } };
  const groups = estimateGroups(responses, {
    groupBy: "group",
    metric: "score",
    targetMargin: 0.05,
    scoreSource: "human",
    grades,
  });
  expect(groups).toHaveLength(1);
  expect(groups[0].n).toBe(2); // unrated items excluded, not zeroed
  expect(groups[0].estimate).toBeCloseTo(0.5, 5);
});

const gradeAlternating = (uid: string, n: number): RatingDict => {
  const d: RatingDict = {};
  for (let i = 0; i < n; i++) d[i] = i % 2 === 0;
  return d;
};

test("pickNextToRate active targets the widest unmet group", () => {
  const responses = [
    resp("A", Array(40).fill(1), "modelA", "uA"), // fully graded, tight CI
    resp("B", Array(10).fill(1), "modelA", "uB"), // 3 of 10 graded, wide CI
  ];
  const grades: Record<string, RatingDict> = {
    uA: gradeAlternating("uA", 40),
    uB: { 0: true, 1: false, 2: true },
  };
  const groups = estimateGroups(responses, {
    groupBy: "group",
    metric: "score",
    targetMargin: 0.2,
    scoreSource: "human",
    grades,
  });
  expect(groups.find((g) => g.name === "A")!.meetsTarget).toBe(true);
  expect(groups.find((g) => g.name === "B")!.meetsTarget).toBe(false);

  const pick = pickNextToRate(responses, groups, grades, {
    policy: "active",
    groupBy: "group",
  })!;
  expect(pick.uid).toBe("uB");
  expect(pick.innerIdx).toBeGreaterThanOrEqual(3); // an ungraded index
  expect(typeof grades[pick.uid]?.[pick.innerIdx]).not.toBe("boolean");
});

test("pickNextToRate active falls back when widest group is fully rated", () => {
  const responses = [
    resp("A", Array(40).fill(1), "modelA", "uA"), // 39 of 40 graded
    resp("B", Array(3).fill(1), "modelA", "uB"), // wide CI but fully graded
  ];
  const grades: Record<string, RatingDict> = {
    uA: gradeAlternating("uA", 39),
    uB: { 0: true, 1: false, 2: true },
  };
  const groups = estimateGroups(responses, {
    groupBy: "group",
    metric: "score",
    targetMargin: 0.2,
    scoreSource: "human",
    grades,
  });
  const pick = pickNextToRate(responses, groups, grades, {
    policy: "active",
    groupBy: "group",
  })!;
  expect(pick).toEqual({ uid: "uA", innerIdx: 39, group: "A" });
});

test("disparity puts a Welch interval on the gap", () => {
  // Two groups with real variance: A mean .75, B mean .25, n=4 each.
  const groups = estimateGroups(
    [resp("A", [1, 1, 1, 0]), resp("B", [0, 0, 0, 1])],
    { groupBy: "group", metric: "score", targetMargin: 0.05 },
  );
  const d = disparity(groups)!;
  expect(d.gap).toBeCloseTo(0.5, 5);
  expect(d.gapLow).toBeLessThan(d.gap);
  expect(d.gapHigh).toBeGreaterThan(d.gap - 1e-9);
  // Small n, big variance -> interval crosses 0 -> inconclusive.
  expect(d.conclusive).toBe(d.gapLow > 0);
  expect(d.conclusive).toBe(false);

  // Perfectly separated groups (zero variance) -> conclusive.
  const many = (v: number) => Array.from({ length: 200 }, () => v);
  const sep = disparity(
    estimateGroups([resp("A", many(1)), resp("B", many(0))], {
      groupBy: "group",
      metric: "score",
      targetMargin: 0.05,
    }),
  )!;
  expect(sep.gapLow).toBeGreaterThan(0);
  expect(sep.conclusive).toBe(true);
});

test("disparity gap CI sits inside the equivalence band for near-identical groups", () => {
  // Two identical alternating groups, n=1000 each: gap 0, tight Welch CI.
  const items = Array.from({ length: 1000 }, (_, i) => i % 2 === 0);
  const d = disparity(
    estimateGroups([resp("A", items), resp("B", items)], {
      groupBy: "group",
      metric: "score",
      targetMargin: 0.05,
    }),
  )!;
  expect(d.gap).toBeCloseTo(0, 5);
  expect(d.gapLow).toBeGreaterThan(-0.05);
  expect(d.gapHigh).toBeLessThan(0.05);
  expect(d.conclusive).toBe(false);
});

test("groups with n<2 are flagged insufficient, not certain", () => {
  const groups = estimateGroups(
    [
      resp("A", [1], "modelA", "uA"), // n=1
      resp("B", Array(3).fill(1), "modelA", "uB"), // n=0 in human mode
    ],
    {
      groupBy: "group",
      metric: "score",
      targetMargin: 0.05,
      scoreSource: "human",
      grades: { uA: { 0: true } },
    },
  );
  const a = groups.find((g) => g.name === "A")!;
  const b = groups.find((g) => g.name === "B")!;
  expect(a.n).toBe(1);
  expect(a.sufficient).toBe(false);
  expect(a.meetsTarget).toBe(false);
  expect(b.n).toBe(0);
  expect(b.sufficient).toBe(false);

  // Groups with n>=2 are sufficient.
  const ok = estimateGroups([resp("A", [1, 0, 1, 0])], {
    groupBy: "group",
    metric: "score",
    targetMargin: 0.9,
  })[0];
  expect(ok.sufficient).toBe(true);
});

test("human mode exposes worst-case remaining movement bounds", () => {
  // 4 items, 2 graded (1 up, 1 down): estimate .5, could end anywhere in [.25, .75].
  const responses = [resp("A", Array(4).fill(1), "modelA", "u1")];
  const partial = estimateGroups(responses, {
    groupBy: "group",
    metric: "score",
    targetMargin: 0.05,
    scoreSource: "human",
    grades: { u1: { 0: true, 1: false } },
  })[0];
  expect(partial.worst).toBeCloseTo(0.25, 5);
  expect(partial.best).toBeCloseTo(0.75, 5);
  expect(partial.worst!).toBeLessThanOrEqual(partial.estimate);
  expect(partial.best!).toBeGreaterThanOrEqual(partial.estimate);

  // Fully graded: no remaining movement.
  const done = estimateGroups(responses, {
    groupBy: "group",
    metric: "score",
    targetMargin: 0.05,
    scoreSource: "human",
    grades: { u1: { 0: true, 1: false, 2: true, 3: false } },
  })[0];
  expect(done.worst).toBeCloseTo(done.estimate, 9);
  expect(done.best).toBeCloseTo(done.estimate, 9);

  // Eval mode: bounds are not applicable.
  const evalMode = estimateGroups([resp("A", [1, 0])], {
    groupBy: "group",
    metric: "score",
    targetMargin: 0.05,
  })[0];
  expect(evalMode.worst).toBeUndefined();
  expect(evalMode.best).toBeUndefined();
});

test("stopDecision never says 'safe to stop' while a subgroup is unmeasured", () => {
  const conclusive = mkGap(0.3, 0.1, 60); // gapLow 0.2 > 0 — a real disparity
  // No awaiting groups -> confirmed, safe to stop.
  expect(stopDecision(conclusive, 0, 0.05).state).toBe("confirmed");
  // One group still n<2 -> must NOT be a safe-to-stop state.
  const withAwaiting = stopDecision(conclusive, 1, 0.05);
  expect(withAwaiting.state).not.toBe("confirmed");
  expect(withAwaiting.state).not.toBe("equivalent");
  expect(withAwaiting.label.toLowerCase()).not.toContain("safe to stop");
});

test("stopDecision uses a separate equivalence delta, not the precision target", () => {
  const tinyGap = mkGap(0, 0.03, 200); // CI [-0.03, 0.03], straddles 0
  // Negligible band 0.05 contains the CI -> equivalent.
  expect(stopDecision(tinyGap, 0, 0.05).state).toBe("equivalent");
  // Stricter band 0.02 does not -> keep sampling.
  expect(stopDecision(tinyGap, 0, 0.02).state).toBe("sampling");
});

test("gapSamplesNeeded tracks the gap CI width, shrinking as it narrows", () => {
  const wide = gapSamplesNeeded(mkGap(0.1, 0.2, 100), 0.05);
  const narrow = gapSamplesNeeded(mkGap(0.1, 0.15, 100), 0.05);
  expect(wide).toBeGreaterThan(narrow);
  expect(narrow).toBeGreaterThan(0);
  // Already conclusive (gapLow > 0) -> nothing more needed.
  expect(gapSamplesNeeded(mkGap(0.3, 0.1, 100), 0.05)).toBe(0);
});

test("gapSamplesNeeded clamps an effectively-unreachable target to Infinity", () => {
  // Tiny target vs a wide current interval -> astronomically many samples.
  expect(gapSamplesNeeded(mkGap(0.0001, 0.3, 30), 0.0002)).toBe(Infinity);
  // A normal, reachable target still returns a finite count.
  expect(gapSamplesNeeded(mkGap(0.1, 0.2, 100), 0.05)).toBeLessThan(Infinity);
});

test("stopDecision renders an unreachable sample hint as 'many'", () => {
  const d = stopDecision(mkGap(0.0001, 0.3, 30), 0, 0.0002);
  expect(d.state).toBe("sampling");
  expect(d.label.toLowerCase()).toContain("many");
});

test("gap row is drawn on its own difference axis, shapes confined to the gap panel", () => {
  // Both groups high (0.85 / 0.95): the gap is 0.10 and must sit near its own 0/±δ
  // references on a difference axis, not stranded far left of the group markers.
  const groups = estimateGroups(
    [binaryGroup("A", 0.85, 200), binaryGroup("B", 0.95, 200)],
    { groupBy: "group", metric: "score", targetMargin: 0.05 },
  );
  const gap = disparity(groups, 0.05)!;
  const { data, layout } = buildForestPlot(groups, gap, {
    equivalenceDelta: 0.05,
    verdictColor: stopDecision(gap, 0, 0.05).color,
  });

  const gapTrace = data.find((t) => t.xaxis === "x2") as Record<string, any>;
  expect(gapTrace).toBeDefined();
  expect(gapTrace.x[0]).toBeCloseTo(gap.gap, 9); // gap on the difference axis
  expect(data.some((t) => t.xaxis === "x")).toBe(true); // group rows on the estimate axis

  // The 0 line and ±δ band belong to the gap panel only — never over a group row.
  const groupDomainLow = (layout.yaxis as any).domain[0];
  const shapes = layout.shapes as any[];
  expect(shapes.length).toBeGreaterThan(0);
  for (const s of shapes) {
    expect(s.xref).toBe("x2");
    expect(Math.max(s.y0, s.y1)).toBeLessThanOrEqual(groupDomainLow + 1e-9);
  }
});

test("gap marker color matches the badge verdict color", () => {
  const cases = [
    [Array(200).fill(1), Array(200).fill(0)], // separated -> confirmed (red)
    [
      Array.from({ length: 30 }, (_, i) => i % 2),
      Array.from({ length: 30 }, (_, i) => i % 2),
    ], // overlapping -> sampling (yellow)
  ];
  for (const [aItems, bItems] of cases) {
    const groups = estimateGroups(
      [
        resp("A", aItems as EvaluationScore[]),
        resp("B", bItems as EvaluationScore[]),
      ],
      { groupBy: "group", metric: "score", targetMargin: 0.05 },
    );
    const gap = disparity(groups, 0.05)!;
    const verdict = stopDecision(gap, 0, 0.05);
    const { data } = buildForestPlot(groups, gap, {
      equivalenceDelta: 0.05,
      verdictColor: verdict.color,
    });
    const gapTrace = data.find((t) => t.xaxis === "x2") as Record<string, any>;
    expect(gapTrace.marker.color).toBe(VERDICT_HEX[verdict.color]);
  }
});

// Two human-mode groups: A all-👎, B all-👍, `rated` of `total` items graded each.
const humanBatch = (rated: number, total: number) => {
  const items = Array(total).fill(1);
  const grade = (v: boolean) =>
    Object.fromEntries(Array.from({ length: rated }, (_, i) => [i, v]));
  const responses = [
    resp("A", items, "modelA", "uA"),
    resp("B", items, "modelA", "uB"),
  ];
  const grades = { uA: grade(false), uB: grade(true) };
  return estimateGroups(responses, {
    groupBy: "group",
    metric: "score",
    targetMargin: 0.05,
    scoreSource: "human",
    grades,
  });
};

test("Scope decouples the envelope gate from the super-population CI", () => {
  // 40 rated + 65 unrated per group, opposite outcomes: the rated-only CI confirms,
  // but the finite-batch envelope could still reverse the sign.
  const partial = disparity(humanBatch(40, 105), 0.05)!;
  expect(partial.gapLow).toBeGreaterThan(0); // CI alone would confirm

  // "The model" (default): the CI gates -> stop early; the envelope is only context.
  expect(stopDecision(partial, 0, 0.05, "model").state).toBe("confirmed");
  expect(stopDecision(partial, 0, 0.05).state).toBe("confirmed"); // default = model

  // "This batch": the envelope gates -> keep rating while the unrated could reverse it.
  expect(stopDecision(partial, 0, 0.05, "batch").state).toBe("sampling");

  // Fully rated: the batch envelope collapses to the point gap -> batch scope confirms.
  const full = disparity(humanBatch(105, 105), 0.05)!;
  expect(stopDecision(full, 0, 0.05, "batch").state).toBe("confirmed");
});

test("envelope covers all groups, not just the current extreme pair", () => {
  const items = (n: number) => Array(n).fill(1);
  const grade = (n: number, trues: number) =>
    Object.fromEntries(Array.from({ length: n }, (_, i) => [i, i < trues]));
  // A is middle by rated estimate (0.5) but mostly unrated, so its best/worst (0.95/0.05)
  // swing far past the fully-rated extreme pair B(0.7) and C(0.3).
  const groups = estimateGroups(
    [
      resp("A", items(100), "modelA", "uA"),
      resp("B", items(50), "modelA", "uB"),
      resp("C", items(50), "modelA", "uC"),
    ],
    {
      groupBy: "group",
      metric: "score",
      targetMargin: 0.05,
      scoreSource: "human",
      grades: { uA: grade(10, 5), uB: grade(50, 35), uC: grade(50, 15) },
    },
  );
  const gap = disparity(groups, 0.05)!;
  // The fully-rated extreme pair B(0.7)/C(0.3) alone gives envHigh 0.40; the all-groups
  // envelope must widen to reflect middle group A's unrated swing (best 0.95, worst 0.05).
  expect(gap.envHigh!).toBeGreaterThan(0.8);
});

test("gap panel draws the unrated worst/best envelope behind the gap CI", () => {
  const groups = humanBatch(40, 105);
  const gap = disparity(groups, 0.05)!;
  // Envelope is wider than the CI (unrated items could move the gap further) and
  // reaches below 0 — the disparity could still reverse.
  expect(gap.envLow).toBeLessThan(gap.gapLow);
  expect(gap.envLow).toBeLessThan(0);
  expect(gap.envHigh! - gap.envLow!).toBeGreaterThan(gap.gapHigh - gap.gapLow);

  const { data } = buildForestPlot(groups, gap, {
    equivalenceDelta: 0.05,
    verdictColor: "yellow",
  });
  const envBand = data.find(
    (t) =>
      t.xaxis === "x2" && (t as Record<string, unknown>).hoverinfo === "skip",
  );
  expect(envBand).toBeDefined();
});

test("the plotted gap interval and the badge verdict never disagree", () => {
  const opts = { groupBy: "group", metric: "score", targetMargin: 0.05 };
  const many = (v: number) => Array.from({ length: 200 }, () => v);

  // Clearly separated -> gap interval excludes 0 AND badge is confirmed.
  const sep = disparity(
    estimateGroups([resp("A", many(1)), resp("B", many(0))], opts),
  )!;
  expect(sep.gapLow).toBeGreaterThan(0);
  expect(stopDecision(sep, 0, 0.05).state).toBe("confirmed");

  // Overlapping -> gap interval includes 0 AND badge is NOT a safe-to-stop disparity.
  const overlapItems = Array.from({ length: 30 }, (_, i) => i % 2 === 0);
  const over = disparity(
    estimateGroups([resp("A", overlapItems), resp("B", overlapItems)], opts),
  )!;
  expect(over.gapLow).toBeLessThanOrEqual(0);
  expect(stopDecision(over, 0, 0.05).state).not.toBe("confirmed");
});

test("confidence sequence is wider than the fixed-sample interval and stays in [0,1]", () => {
  const data = Array.from({ length: 60 }, (_, i) => (i % 3 === 0 ? 0 : 1)); // p=2/3
  const seq = confidenceInterval(data, 0.05, "sequence");
  const fixed = confidenceInterval(data, 0.05, "auto");
  expect(seq.margin).toBeGreaterThan(fixed.margin);
  expect(seq.low).toBeGreaterThanOrEqual(0);
  expect(seq.high).toBeLessThanOrEqual(1);
});

test("bootstrap CI is deterministic for identical continuous data", () => {
  // n>=50 non-binary -> bootstrap path; must not jiggle between renders.
  const data = Array.from({ length: 60 }, (_, i) => 0.3 + (i % 7) * 0.05);
  const a = confidenceInterval(data);
  const b = confidenceInterval(data);
  expect(a.low).toBe(b.low);
  expect(a.high).toBe(b.high);
});

test("gap CI is anytime-valid and wider than Newcombe in sequence mode", () => {
  const groups = estimateGroups(
    [binaryGroup("A", 0.75, 40), binaryGroup("B", 0.25, 40)],
    {
      groupBy: "group",
      metric: "score",
      targetMargin: 0.05,
      method: "sequence",
    },
  );
  const seq = disparity(groups, 0.05, "sequence")!;
  const fixed = disparity(groups, 0.05, "auto")!;
  const half = (d: Disparity) => (d.gapHigh - d.gapLow) / 2;
  expect(seq.anytimeValid).toBe(true);
  expect(fixed.anytimeValid).toBe(false);
  expect(half(seq)).toBeGreaterThan(half(fixed)); // anytime width > fixed-sample
});

test("sequence-mode gap CI is the interval-arithmetic difference of two a/2 sequences", () => {
  const opts = {
    groupBy: "group",
    metric: "score",
    targetMargin: 0.05,
    method: "sequence" as const,
    alpha: 0.05,
  };
  const groups = estimateGroups(
    [binaryGroup("A", 0.6, 200), binaryGroup("B", 0.4, 200)],
    opts,
  );
  const seq = disparity(groups, 0.05, "sequence")!;
  expect(seq.anytimeValid).toBe(true);
  // Genuinely anytime-valid: each marginal sequence is used at a/2 and differenced by
  // interval arithmetic, so the half-width is R_hi(a/2)+R_lo(a/2) (equal n -> 2·R(a/2)),
  // NOT the tighter Newcombe sqrt-combination. Radius is p-independent.
  const R = confidenceInterval(
    new Array(200).fill(1),
    0.05 / 2,
    "sequence",
  ).margin;
  const half = (seq.gapHigh - seq.gapLow) / 2;
  expect(half).toBeCloseTo(2 * R, 6);
});

test("sequence sample hint needs more than the 1/√n law and reaches the target", () => {
  const n = 30;
  // Sequence radius at a/2 for a given n (p-independent).
  const R = (nn: number) =>
    confidenceInterval(new Array(Math.round(nn)).fill(1), 0.05 / 2, "sequence")
      .margin;
  const half = 2 * R(n); // interval-arithmetic sequence gap half-width, equal n
  const gap: Disparity = {
    gap: 0.2,
    gapLow: 0.2 - half,
    gapHigh: 0.2 + half,
    conclusive: 0.2 - half > 0,
    low: "B",
    high: "A",
    nLow: n,
    nHigh: n,
    anytimeValid: true,
    alpha: 0.05,
  };
  const target = 0.2; // confirm-disparity target (δ 0.05 < gap 0.2)
  const m = gapSamplesNeeded(gap, 0.05);
  // A confidence sequence shrinks like √(log n/n), so it needs strictly MORE
  // samples than the 1/√n law would project — otherwise the hint undershoots.
  const naive = Math.ceil(2 * n * ((half / target) ** 2 - 1));
  expect(m).toBeGreaterThan(naive);
  // And the projected total actually brings the sequence width to the target.
  expect(2 * R(n + m / 2)).toBeLessThanOrEqual(target + 0.01);
});

test("gap CI is not anytime-valid for continuous groups even in sequence mode", () => {
  const groups = estimateGroups(
    [
      resp("A", [0.1, 0.2, 0.3, 0.9, 0.8]),
      resp("B", [0.7, 0.6, 0.8, 0.9, 0.5]),
    ],
    {
      groupBy: "group",
      metric: "score",
      targetMargin: 0.05,
      method: "sequence",
    },
  );
  // No anytime-valid continuous difference bound -> gap stays fixed-sample Welch.
  expect(disparity(groups, 0.05, "sequence")!.anytimeValid).toBe(false);
});

test("a method that can't apply to the data is flagged as fallen back", () => {
  // 1-5 ratings are outside [0,1] -> sequence can't apply.
  const seq = estimateGroups([resp("A", [1, 2, 3, 4, 5])], {
    groupBy: "group",
    metric: "score",
    targetMargin: 0.05,
    method: "sequence",
  })[0];
  expect(seq.methodFellBack).toBe(true);

  // Wilson on genuine 0/1 data applies cleanly.
  const wil = estimateGroups([resp("A", [0, 1, 1, 0])], {
    groupBy: "group",
    metric: "score",
    targetMargin: 0.05,
    method: "wilson",
  })[0];
  expect(wil.methodFellBack).toBe(false);

  // Auto always applies -> never a fallback.
  const auto = estimateGroups([resp("A", [1, 2, 3])], {
    groupBy: "group",
    metric: "score",
    targetMargin: 0.05,
  })[0];
  expect(auto.methodFellBack).toBe(false);
});

test("pickNextToRate random picks an unrated item and returns null when done", () => {
  const responses = [resp("A", Array(5).fill(1), "modelA", "uA")];
  const grades: Record<string, RatingDict> = { uA: { 0: true, 2: false } };
  const groups = estimateGroups(responses, {
    groupBy: "group",
    metric: "score",
    targetMargin: 0.05,
    scoreSource: "human",
    grades,
  });
  const pick = pickNextToRate(responses, groups, grades, {
    policy: "random",
    groupBy: "group",
  })!;
  expect(pick.uid).toBe("uA");
  expect([1, 3, 4]).toContain(pick.innerIdx);

  const allRated: Record<string, RatingDict> = {
    uA: gradeAlternating("uA", 5),
  };
  expect(
    pickNextToRate(responses, groups, allRated, {
      policy: "random",
      groupBy: "group",
    }),
  ).toBeNull();
});
