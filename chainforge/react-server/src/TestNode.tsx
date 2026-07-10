import React, { useCallback, useEffect, useRef, useState } from "react";
import { NumberInput } from "@mantine/core";
import useStore from "./store";
import BaseNode from "./BaseNode";
import NodeLabel from "./NodeLabelComponent";
import { costPerRequest, LLM } from "./backend/models";
import { APP_IS_RUNNING_LOCALLY } from "./backend/utils";

const IS_RUNNING_LOCALLY = APP_IS_RUNNING_LOCALLY();
// Remaining budget (USD), persisted in localStorage — the same place the
// flow itself autosaves — so it survives sessions without a Flask server.
// ponytail: per browser+origin; use the Flask global-config store if the
// budget must be shared between dev (:3000) and packaged (:8000) installs.
const BUDGET_KEY = "chainforge-budget-remaining";

export interface TestNodeProps {
  data: {
    title: string;
    input: string;
    refresh: boolean;
  };
  id: string;
}

const TestNode: React.FC<TestNodeProps> = ({ data, id }) => {
  // Pending (not-yet-run) requests summed across all nodes.
  const totalPending = useStore((state) =>
    state.nodes.reduce(
      (sum, node) => sum + (node.data?.totalMissingQueries ?? 0),
      0,
    ),
  );

  // Estimated budget: pending requests × flat per-model price, across all nodes.
  // (Separate number-returning selectors avoid churning Zustand's Object.is equality.)
  const estimatedCost = useStore((state) =>
    state.nodes.reduce((sum, node) => {
      const qpm = (node.data?.queriesPerModel ?? {}) as Record<string, number>;
      return (
        sum +
        Object.keys(qpm).reduce(
          (a, m) => a + qpm[m] * costPerRequest(m as LLM),
          0,
        )
      );
    }, 0),
  );

  // Actual spend: flat price for every completed response held on node data.
  // ponytail: counts all held responses, so cache reloads (no new request) are
  // included — a small over-count acceptable for a flat estimate.
  const actualCost = useStore((state) =>
    state.nodes.reduce((sum, node) => {
      // Only prompt/chat nodes store fields as a flat array of responses; other
      // nodes (e.g. tabular data) use an object under `fields`, so guard the type.
      const raw = node.data?.fields;
      const fields = (Array.isArray(raw) ? raw : []) as { llm?: unknown }[];
      return (
        sum +
        fields.reduce((a, f) => {
          const model =
            typeof f?.llm === "object" && f.llm !== null
              ? (f.llm as { model?: LLM }).model
              : undefined;
          return a + costPerRequest(model);
        }, 0)
      );
    }, 0),
  );

  // Remaining budget in USD; null = not set yet (or not running locally).
  const [remaining, setRemaining] = useState<number | null>(() => {
    if (!IS_RUNNING_LOCALLY) return null;
    const stored = localStorage.getItem(BUDGET_KEY);
    return stored !== null && Number.isFinite(+stored) ? +stored : null;
  });
  const prevActual = useRef<number | null>(null);

  const updateRemaining = useCallback((val: number) => {
    setRemaining(val);
    localStorage.setItem(BUDGET_KEY, String(val));
  }, []);

  // Deduct new spend from the budget. The first observed actualCost is the
  // baseline: responses restored with the flow were already deducted in the
  // session that ran them. Decreases (deleted responses) are not refunded.
  // ponytail: loading a different flow without remounting this node re-counts
  // its held responses as new spend; track spend at the query site if that bites.
  useEffect(() => {
    const prev = prevActual.current;
    prevActual.current = actualCost;
    if (prev === null || actualCost <= prev || remaining === null) return;
    updateRemaining(remaining - (actualCost - prev));
  }, [actualCost, remaining, updateRemaining]);

  const stat = (
    label: string,
    value: string,
    color = "#fff",
  ): React.ReactElement => (
    <div style={{ marginTop: "8px" }}>
      <div style={{ fontSize: "12px", opacity: 0.8 }}>{label}</div>
      <div
        style={{
          fontSize: "22px",
          fontWeight: "bold",
          color,
          marginTop: "2px",
        }}
      >
        {value}
      </div>
    </div>
  );

  return (
    <BaseNode classNames="test-node" nodeId={id}>
      <NodeLabel title={data.title || "Budget"} nodeId={id} icon="🧪" />
      <div style={{ padding: "12px", color: "#fff", minWidth: "180px" }}>
        {stat(
          "pending requests",
          String(totalPending),
          totalPending > 0 ? "#faad14" : "#52c41a",
        )}
        {stat(
          "estimated (pending) cost",
          `$${estimatedCost.toFixed(4)}`,
          "#faad14",
        )}
        {stat("actual (spent) cost", `$${actualCost.toFixed(4)}`, "#52c41a")}
        {IS_RUNNING_LOCALLY && (
          <>
            {stat(
              "remaining budget",
              remaining === null ? "not set" : `$${remaining.toFixed(4)}`,
              remaining !== null && remaining < estimatedCost
                ? "#f5222d"
                : "#52c41a",
            )}
            <NumberInput
              label="Set / adjust budget (USD)"
              size="xs"
              mt="8px"
              min={0}
              precision={4}
              step={1}
              value={remaining ?? ""}
              onChange={(v) => {
                if (typeof v === "number") updateRemaining(v);
              }}
              className="nodrag"
            />
          </>
        )}
      </div>
    </BaseNode>
  );
};

export default TestNode;
