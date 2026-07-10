import { expect, test } from "@jest/globals";
import {
  confidenceInterval,
  estimateGroups,
  disparity,
  GROUP_BY_LLM,
} from "../uncertainty";
import { LLMResponse, EvaluationScore } from "../typing";

// Build a minimal LLMResponse with a `group` var and boolean/number eval scores.
const resp = (
  group: string,
  items: EvaluationScore[],
  llm = "modelA",
): LLMResponse =>
  ({
    uid: Math.random().toString(),
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
  expect(confidenceInterval([1]).margin).toBe(0);
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
  expect(tight.nNeeded).toBeGreaterThan(0);

  // Loose target -> stop.
  const loose = estimateGroups(responses, {
    groupBy: "group",
    metric: "score",
    targetMargin: 0.9,
  })[0];
  expect(loose.meetsTarget).toBe(true);
  expect(loose.nNeeded).toBe(0);
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
