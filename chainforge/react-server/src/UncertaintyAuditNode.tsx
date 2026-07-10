import React, {
  useState,
  useEffect,
  useMemo,
  useRef,
  useCallback,
} from "react";
import { Handle, Position } from "reactflow";
import { Badge, Group, NumberInput, Select, Text } from "@mantine/core";
import Plot from "react-plotly.js";
import useStore from "./store";
import BaseNode from "./BaseNode";
import NodeLabel from "./NodeLabelComponent";
import ResizeHandle from "./ResizeHandle";
import { grabResponses } from "./backend/backend";
import { llmResponseDataToString } from "./backend/utils";
import { Dict, LLMResponse } from "./backend/typing";
import {
  estimateGroups,
  disparity,
  findGroupVars,
  findMetrics,
  GROUP_BY_LLM,
} from "./backend/uncertainty";

export interface UncertaintyAuditNodeProps {
  data: {
    title?: string;
    input?: string;
    refresh?: boolean;
    groupBy?: string;
    metric?: string;
    targetMargin?: number;
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
  const containerRef = useRef<HTMLDivElement>(null);

  const targetMargin = data.targetMargin ?? 0.05;

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
          })
        : [],
    [responses, groupBy, metric, targetMargin],
  );

  const gap = useMemo(() => disparity(groups), [groups]);

  const allMeet = groups.length > 0 && groups.every((g) => g.meetsTarget);
  const totalNeeded = groups.reduce((acc, g) => acc + g.nNeeded, 0);

  // Forest plot: point estimate + horizontal CI whiskers, one row per group.
  const plotData = useMemo(() => {
    if (groups.length === 0) return [];
    return [
      {
        type: "scatter",
        mode: "markers",
        x: groups.map((g) => g.estimate),
        y: groups.map((g) => `${g.name} (n=${g.n})`),
        error_x: {
          type: "data",
          array: groups.map((g) => g.margin),
          visible: true,
          thickness: 1.5,
        },
        marker: {
          size: 9,
          color: groups.map((g) => (g.meetsTarget ? "#2b8a3e" : "#e8590c")),
        },
        hovertemplate:
          "%{y}<br>estimate %{x:.3f} ± %{error_x.array:.3f}<extra></extra>",
      },
    ] as Dict[];
  }, [groups]);

  // Proportions live in [0,1]; keep the axis fixed there for readability, else autorange.
  const isProportion = groups.every((g) => g.ciLow >= 0 && g.ciHigh <= 1);
  const plotLayout = useMemo(
    () => ({
      autosize: true,
      height: Math.max(120, 40 + groups.length * 34),
      margin: { l: 110, r: 20, t: 10, b: 30 },
      xaxis: {
        title: isProportion ? "estimate (proportion)" : "estimate",
        range: isProportion ? [0, 1] : undefined,
        zeroline: false,
      },
      yaxis: { automargin: true },
    }),
    [groups, isProportion],
  );

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
          {metricOptions.length > 1 && (
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
        </Group>

        {groups.length === 0 ? (
          <Text size="xs" color="dimmed" align="center" mt="sm" mb="sm">
            Connect an evaluated response set to estimate fairness with
            uncertainty.
          </Text>
        ) : (
          <>
            <Group spacing="xs" mb="2px">
              <Badge
                color={allMeet ? "green" : "yellow"}
                variant="filled"
                size="sm"
              >
                {allMeet
                  ? "Sufficient evidence — safe to stop"
                  : `Keep sampling (~${totalNeeded} more)`}
              </Badge>
            </Group>

            {gap && (
              <Text size="xs" mb="2px">
                Disparity {gap.high} − {gap.low}: <b>{gap.gap.toFixed(3)}</b>{" "}
                <Text span color={gap.conclusive ? "green" : "dimmed"}>
                  {gap.conclusive
                    ? "(intervals separate — conclusive)"
                    : "(intervals overlap — inconclusive)"}
                </Text>
              </Text>
            )}

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
