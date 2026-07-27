import React, {
  useState,
  useEffect,
  useMemo,
  useRef,
  useCallback,
} from "react";
import { Handle, Position } from "reactflow";
import { Badge, Button, Group, NumberInput, Select, Text } from "@mantine/core";
import { IconThumbDown, IconThumbUp } from "@tabler/icons-react";
import Plot from "react-plotly.js";
import useStore from "./store";
import BaseNode from "./BaseNode";
import NodeLabel from "./NodeLabelComponent";
import ResizeHandle from "./ResizeHandle";
import { grabResponses } from "./backend/backend";
import StorageCache from "./backend/cache";
import { getRatingKeyForResponse } from "./ResponseRatingToolbar";
import { llmResponseDataToString } from "./backend/utils";
import { Dict, LLMResponse, RatingDict } from "./backend/typing";
import {
  estimateGroups,
  disparity,
  stopDecision,
  findGroupVars,
  findMetrics,
  pickNextToRate,
  GROUP_BY_LLM,
  StatMethod,
} from "./backend/uncertainty";
import { buildForestPlot } from "./backend/uncertaintyPlot";

export interface UncertaintyAuditNodeProps {
  data: {
    title?: string;
    input?: string;
    refresh?: boolean;
    groupBy?: string;
    metric?: string;
    targetMargin?: number;
    equivalenceDelta?: number;
    alpha?: number;
    scoreSource?: "eval" | "human";
    statMethod?: StatMethod;
    orderPolicy?: "random" | "active";
    scope?: "batch" | "model";
  };
  id: string;
}

const prettyGroupLabel = (v: string) =>
  v === GROUP_BY_LLM
    ? "LLM"
    : v.startsWith("__meta_")
      ? `${v.slice("__meta_".length)} (meta)`
      : v;

const UncertaintyAuditNode: React.FC<UncertaintyAuditNodeProps> = ({
  data,
  id,
}) => {
  const [jsonResponses, setJSONResponses] = useState<LLMResponse[] | null>(
    null,
  );
  const [pastInputs, setPastInputs] = useState<string>("");
  const inputEdgesForNode = useStore((state) => state.inputEdgesForNode);
  const setDataPropsForNode = useStore((state) => state.setDataPropsForNode);
  // ponytail: whole-state subscription re-renders on any rating change anywhere;
  //           fine at this scale, switch to per-key selectors if it ever lags.
  const ratingState = useStore((state) => state.state);
  const setState = useStore((state) => state.setState);
  const containerRef = useRef<HTMLDivElement>(null);

  const targetMargin = data.targetMargin ?? 0.05;
  const scoreSource = data.scoreSource ?? "eval";
  // Negligible-disparity band for the equivalence verdict — separate from the per-group
  // precision target, defaulting to it so existing flows are unchanged.
  const equivalenceDelta = data.equivalenceDelta ?? targetMargin;
  const alpha = data.alpha ?? 0.05;
  // Live human rating is the peeking case, so default to the anytime-valid sequence.
  const statMethod =
    data.statMethod ?? (scoreSource === "human" ? "sequence" : "auto");
  const orderPolicy = data.orderPolicy ?? "random";
  // Inferential target: "model" (the super-population — unrated items are unsampled
  // draws the CI covers, so you can stop early) vs "batch" (these exact items — the
  // finite-batch envelope gates). Default "model" so the sequence's early stop works.
  const scope = data.scope ?? "model";

  const handleOnConnect = useCallback(() => {
    const input_node_ids = inputEdgesForNode(id).map((e) => e.source);
    grabResponses(input_node_ids)
      .then((resps) => {
        if (resps && resps.length > 0) setJSONResponses(resps);
        else setJSONResponses(null);
      })
      .catch(() => setJSONResponses(null));
  }, [id, inputEdgesForNode]);

  if (data.input && data.input !== pastInputs) {
    setPastInputs(data.input);
    handleOnConnect();
  }

  useEffect(() => {
    if (data.refresh === true) {
      setDataPropsForNode(id, { refresh: false });
      handleOnConnect();
    }
  }, [data.refresh, id, setDataPropsForNode, handleOnConnect]);

  const responses = jsonResponses ?? [];

  // Thumbs grades (from this node or the response inspector), keyed by uid.
  const grades = useMemo(() => {
    const out: Record<string, RatingDict> = {};
    for (const r of responses) {
      const g = ratingState[getRatingKeyForResponse(r.uid, "grade")];
      if (g) out[r.uid] = g;
    }
    return out;
  }, [ratingState, responses]);

  // Dual write, mirroring ResponseRatingToolbar: zustand state re-renders this
  // node + inspector toolbars; StorageCache persists with the flow.
  const rate = useCallback(
    (uid: string, innerIdx: number, grade: boolean) => {
      const key = getRatingKeyForResponse(uid, "grade");
      const dict = { ...(ratingState[key] ?? {}), [innerIdx]: grade };
      setState(key, dict);
      StorageCache.store(key, dict);
    },
    [ratingState, setState],
  );

  // Options for the "group by" and "metric" dropdowns, derived from the data.
  const groupOptions = useMemo(() => {
    const vars = findGroupVars(responses).map((v) => ({
      value: v,
      label: prettyGroupLabel(v),
    }));
    return [...vars, { value: GROUP_BY_LLM, label: "LLM" }];
  }, [responses]);

  const metricOptions = useMemo(
    () => findMetrics(responses).map((m) => ({ value: m, label: m })),
    [responses],
  );

  // Effective selections: fall back to the first available option so the node shows
  // something useful before the user picks. User choices persist in data via onChange.
  const groupBy =
    data.groupBy && groupOptions.some((o) => o.value === data.groupBy)
      ? data.groupBy
      : groupOptions[0]?.value ?? GROUP_BY_LLM;
  const metric = metricOptions.some((o) => o.value === data.metric)
    ? (data.metric as string)
    : metricOptions[0]?.value ?? "score";

  const groups = useMemo(
    () =>
      responses.length > 0
        ? estimateGroups(responses, {
            groupBy,
            metric,
            targetMargin,
            resolveLabel: llmResponseDataToString,
            method: statMethod,
            alpha,
            scoreSource,
            grades,
          })
        : [],
    [
      responses,
      groupBy,
      metric,
      targetMargin,
      statMethod,
      alpha,
      scoreSource,
      grades,
    ],
  );

  // Same alpha AND method as the group CIs, so the gap CI that drives the stop
  // decision carries the same (anytime-valid, in sequence mode) guarantee.
  const gap = useMemo(
    () => disparity(groups, alpha, statMethod),
    [groups, alpha, statMethod],
  );
  const methodFellBack = groups.some((g) => g.methodFellBack);

  // Rating queue (human source only): which response to hand-rate next.
  const nextToRate = useMemo(
    () =>
      scoreSource === "human"
        ? pickNextToRate(responses, groups, grades, {
            policy: orderPolicy,
            groupBy,
            resolveLabel: llmResponseDataToString,
          })
        : null,
    [scoreSource, responses, groups, grades, orderPolicy, groupBy],
  );
  const nextResp = nextToRate
    ? responses.find((r) => r.uid === nextToRate.uid)
    : undefined;
  const totalItems = responses.reduce(
    (acc, r) => acc + (r.responses?.length ?? 0),
    0,
  );
  const ratedCount = responses.reduce((acc, r) => {
    const g = grades[r.uid];
    if (!g) return acc;
    let c = 0;
    for (let i = 0; i < (r.responses?.length ?? 0); i++)
      if (typeof g[i] === "boolean") c++;
    return acc + c;
  }, 0);

  // n<2 groups have degenerate zero-width CIs — never plot those as certainty.
  const ready = useMemo(() => groups.filter((g) => g.sufficient), [groups]);
  const awaiting = useMemo(() => groups.filter((g) => !g.sufficient), [groups]);

  // Gap-driven stop/continue verdict: never "safe to stop" while a group is still
  // unmeasured, and the "~N more" hint tracks the gap CI, not per-group precision.
  const badge = stopDecision(gap, awaiting.length, equivalenceDelta, scope);

  // Forest plot: group estimates on top, the disparity (the interval the badge acts
  // on) on its own difference axis below with the 0 line and ±δ band. Built by a pure
  // spec builder so the layout is unit-tested (buildForestPlot).
  const { plotData, plotLayout } = useMemo(() => {
    if (ready.length === 0)
      return { plotData: [] as Dict[], plotLayout: {} as Dict };
    const { data, layout } = buildForestPlot(ready, gap, {
      equivalenceDelta,
      verdictColor: badge.color,
    });
    return { plotData: data as Dict[], plotLayout: layout as Dict };
  }, [ready, gap, equivalenceDelta, badge.color]);

  return (
    <BaseNode classNames="uncertainty-audit-node" nodeId={id}>
      <NodeLabel
        title={data.title || "Uncertainty Auditor"}
        nodeId={id}
        icon={"⚖️"}
      />

      <div className="nodrag" style={{ padding: "4px 2px" }}>
        <Group spacing="xs" grow noWrap mb="4px">
          <Select
            label="Group by"
            size="xs"
            data={groupOptions}
            value={groupBy}
            onChange={(v) => v && setDataPropsForNode(id, { groupBy: v })}
          />
          {scoreSource === "eval" && metricOptions.length > 1 && (
            <Select
              label="Metric"
              size="xs"
              data={metricOptions}
              value={metric}
              onChange={(v) => v && setDataPropsForNode(id, { metric: v })}
            />
          )}
          <NumberInput
            label="Target ±"
            size="xs"
            value={targetMargin}
            precision={3}
            step={0.01}
            min={0.001}
            max={1}
            onChange={(v) =>
              typeof v === "number" &&
              setDataPropsForNode(id, { targetMargin: v })
            }
          />
          <NumberInput
            label="Negligible δ"
            size="xs"
            value={equivalenceDelta}
            precision={3}
            step={0.01}
            min={0.001}
            max={1}
            onChange={(v) =>
              typeof v === "number" &&
              setDataPropsForNode(id, { equivalenceDelta: v })
            }
          />
        </Group>

        <Group spacing="xs" grow noWrap mb="4px">
          <Select
            label="Source"
            size="xs"
            data={[
              { value: "eval", label: "Evaluator score" },
              { value: "human", label: "Human grades" },
            ]}
            value={scoreSource}
            onChange={(v) => v && setDataPropsForNode(id, { scoreSource: v })}
          />
          <Select
            label="Method"
            size="xs"
            data={[
              { value: "auto", label: "Auto" },
              { value: "wilson", label: "Wilson" },
              { value: "bayes", label: "Bayesian" },
              { value: "sequence", label: "Confidence sequence" },
            ]}
            value={statMethod}
            onChange={(v) => v && setDataPropsForNode(id, { statMethod: v })}
          />
          <Select
            label="Confidence"
            size="xs"
            data={[
              { value: "0.1", label: "90%" },
              { value: "0.05", label: "95%" },
              { value: "0.01", label: "99%" },
            ]}
            value={String(alpha)}
            onChange={(v) =>
              v && setDataPropsForNode(id, { alpha: parseFloat(v) })
            }
          />
          {scoreSource === "human" && (
            <Select
              label="Order"
              size="xs"
              data={[
                { value: "random", label: "Random" },
                { value: "active", label: "Active (widest CI)" },
              ]}
              value={orderPolicy}
              onChange={(v) => v && setDataPropsForNode(id, { orderPolicy: v })}
            />
          )}
          {scoreSource === "human" && (
            <Select
              label="Scope"
              size="xs"
              data={[
                { value: "model", label: "The model" },
                { value: "batch", label: "This batch" },
              ]}
              value={scope}
              onChange={(v) => v && setDataPropsForNode(id, { scope: v })}
            />
          )}
        </Group>

        {methodFellBack && (
          <Text size="xs" color="dimmed" mb="2px">
            Selected method needs 0/1 (Wilson/Bayes) or [0,1] (sequence) scores;
            using t/bootstrap.
          </Text>
        )}

        {groups.length === 0 ? (
          <Text size="xs" color="dimmed" align="center" mt="sm" mb="sm">
            Connect a response set (evaluated, or rated by hand) to estimate
            fairness with uncertainty.
          </Text>
        ) : (
          <>
            <Group spacing="xs" mb="2px">
              <Badge color={badge.color} variant="filled" size="sm">
                {badge.label}
              </Badge>
            </Group>

            {scoreSource === "human" &&
              (nextToRate && nextResp ? (
                <div
                  style={{
                    border: "1px solid #ced4da",
                    borderRadius: 4,
                    padding: "4px 6px",
                    marginBottom: 4,
                  }}
                >
                  <Text size="xs" color="dimmed">
                    Rate ({nextToRate.group} · {ratedCount}/{totalItems} rated):
                  </Text>
                  <Text size="xs" lineClamp={4}>
                    {llmResponseDataToString(
                      nextResp.responses[nextToRate.innerIdx],
                    )}
                  </Text>
                  <Group spacing="xs" mt="2px">
                    <Button
                      size="xs"
                      variant="light"
                      color="green"
                      onClick={() =>
                        rate(nextToRate.uid, nextToRate.innerIdx, true)
                      }
                    >
                      <IconThumbUp size="14px" />
                    </Button>
                    <Button
                      size="xs"
                      variant="light"
                      color="red"
                      onClick={() =>
                        rate(nextToRate.uid, nextToRate.innerIdx, false)
                      }
                    >
                      <IconThumbDown size="14px" />
                    </Button>
                  </Group>
                </div>
              ) : (
                <Text size="xs" color="dimmed" mb="2px">
                  All responses rated.
                </Text>
              ))}

            {gap && (
              <Text size="xs" mb="2px">
                Disparity {gap.high} − {gap.low}: <b>{gap.gap.toFixed(3)}</b> [
                {gap.gapLow.toFixed(3)}, {gap.gapHigh.toFixed(3)}]{" "}
                <Text span color={gap.conclusive ? "green" : "dimmed"}>
                  {gap.conclusive
                    ? "(interval excludes 0 — conclusive)"
                    : "(interval includes 0 — inconclusive)"}
                </Text>
                {groups.length > 2 && (
                  <Text span color="dimmed">
                    {" "}
                    · extreme-pair, Bonferroni-adjusted (conservative approx.)
                  </Text>
                )}
              </Text>
            )}

            {scope === "batch" ? (
              <Text size="xs" color="dimmed" mb="2px">
                Scope: this batch — the interval is the finite-batch envelope
                over all items, exact once every item is rated.
              </Text>
            ) : gap?.anytimeValid ? (
              <Text size="xs" color="dimmed" mb="2px">
                Scope: the model — anytime-valid gap interval, safe to stop as
                soon as the badge turns green.
              </Text>
            ) : (
              scoreSource === "human" && (
                <Text size="xs" color="dimmed" mb="2px">
                  Scope: the model — gap interval not adjusted for continuous
                  monitoring.
                </Text>
              )
            )}

            {awaiting.length > 0 && (
              <Text size="xs" color="dimmed" mb="2px">
                Awaiting data (n&lt;2):{" "}
                {awaiting.map((g) => `${g.name} (n=${g.n})`).join(", ")}
              </Text>
            )}

            {ready.length > 0 && (
              <div ref={containerRef} style={{ position: "relative" }}>
                <Plot
                  data={plotData}
                  layout={plotLayout}
                  useResizeHandler={true}
                  config={{ displayModeBar: false } as Dict}
                  style={{ width: "100%" }}
                />
                <ResizeHandle
                  targetRef={containerRef}
                  minWidth={230}
                  minHeight={140}
                />
              </div>
            )}
          </>
        )}
      </div>

      <Handle
        type="target"
        position={Position.Left}
        id="input"
        className="grouped-handle"
        style={{ top: "50%" }}
        onConnect={handleOnConnect}
      />
    </BaseNode>
  );
};

export default UncertaintyAuditNode;
