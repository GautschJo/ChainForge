/**
 * Forest-plot spec builder for the Uncertainty Auditor node — pure (plain Plotly
 * objects, no React), so the layout can be unit-tested without React test infra.
 * Kept out of uncertainty.ts to keep that module purely statistical.
 */
import { GroupEstimate, Disparity } from "./uncertainty";

/** Plotly hex for each stopDecision badge color, so the gap marker and badge match. */
export const VERDICT_HEX: Record<string, string> = {
  red: "#c92a2a",
  green: "#2b8a3e",
  yellow: "#f08c00",
  gray: "#868e96",
};

export interface ForestPlot {
  data: Record<string, unknown>[];
  layout: Record<string, unknown>;
}

// Difference-scale (gap) panel occupies the bottom of the plot; group estimates the top.
const GAP_DOMAIN: [number, number] = [0, 0.16];
const GROUP_DOMAIN: [number, number] = [0.4, 1];

/**
 * Build the forest-plot traces + layout. With a gap, uses two stacked panels on
 * different x-scales: group estimates (absolute) on top, the disparity (a difference,
 * with the 0 line and ±δ band) on its own axis below — so 0/±δ never overlap an
 * absolute group row and the gap marker sits by its own references. Without a gap
 * (fewer than two measurable groups) it's a single estimate panel.
 */
export const buildForestPlot = (
  ready: GroupEstimate[],
  gap: Disparity | null,
  opts: { equivalenceDelta: number; verdictColor: string },
): ForestPlot => {
  const verdictHex = VERDICT_HEX[opts.verdictColor] ?? "#868e96";
  const groupLabels = ready.map((g) => `${g.name} (n=${g.n})`);
  const data: Record<string, unknown>[] = [];

  // Faint band behind the whiskers: worst-case remaining movement (human mode only).
  if (ready.some((g) => g.best !== undefined && g.best - (g.worst ?? 0) > 0))
    data.push({
      type: "scatter",
      mode: "markers",
      x: ready.map((g) => g.estimate),
      y: groupLabels,
      xaxis: "x",
      yaxis: "y",
      marker: { size: 0.1, color: "rgba(0,0,0,0)" },
      error_x: {
        type: "data",
        array: ready.map((g) => (g.best ?? g.estimate) - g.estimate),
        arrayminus: ready.map((g) => g.estimate - (g.worst ?? g.estimate)),
        visible: true,
        color: "rgba(134,142,150,0.35)",
        thickness: 6,
        width: 0,
      },
      hoverinfo: "skip",
      showlegend: false,
    });

  // Per-group whiskers — absolute estimate scale, neutral color (verdict is on the gap row).
  data.push({
    type: "scatter",
    mode: "markers",
    x: ready.map((g) => g.estimate),
    y: groupLabels,
    xaxis: "x",
    yaxis: "y",
    error_x: {
      type: "data",
      array: ready.map((g) => g.margin),
      visible: true,
      thickness: 1.5,
      color: "#868e96",
    },
    marker: { size: 8, color: "#4c6ef5" },
    hovertemplate:
      "%{y}<br>estimate %{x:.3f} ± %{error_x.array:.3f}<extra></extra>",
    showlegend: false,
  });

  if (!gap) {
    const isProportion = ready.every((g) => g.ciLow >= 0 && g.ciHigh <= 1);
    return {
      data,
      layout: {
        autosize: true,
        height: Math.max(120, 40 + ready.length * 34),
        margin: { l: 130, r: 20, t: 10, b: 30 },
        xaxis: {
          title: "estimate",
          range: isProportion ? [0, 1] : undefined,
          zeroline: false,
        },
        yaxis: { automargin: true },
        shapes: [],
      },
    };
  }

  const gapLabel = `Gap ${gap.high}−${gap.low}`;

  // Faint band behind the gap CI: the finite-batch envelope — how far the disparity
  // could still move once the unrated items resolve (human mode). Pushed first so the
  // sharp CI draws on top.
  if (gap.envLow !== undefined && gap.envHigh !== undefined)
    data.push({
      type: "scatter",
      mode: "markers",
      x: [gap.gap],
      y: [gapLabel],
      xaxis: "x2",
      yaxis: "y2",
      marker: { size: 0.1, color: "rgba(0,0,0,0)" },
      error_x: {
        type: "data",
        array: [gap.envHigh - gap.gap],
        arrayminus: [gap.gap - gap.envLow],
        visible: true,
        color: "rgba(134,142,150,0.30)",
        thickness: 8,
        width: 0,
      },
      hoverinfo: "skip",
      showlegend: false,
    });

  // Gap row — its own difference axis (x2/y2), colored to match the badge verdict.
  data.push({
    type: "scatter",
    mode: "markers",
    x: [gap.gap],
    y: [gapLabel],
    xaxis: "x2",
    yaxis: "y2",
    error_x: {
      type: "data",
      array: [gap.gapHigh - gap.gap],
      arrayminus: [gap.gap - gap.gapLow],
      visible: true,
      thickness: 2.5,
      color: verdictHex,
    },
    marker: { size: 11, color: verdictHex, symbol: "diamond" },
    hovertemplate: `gap %{x:.3f} [${gap.gapLow.toFixed(3)}, ${gap.gapHigh.toFixed(3)}]<extra></extra>`,
    showlegend: false,
  });

  const dLow = Math.min(
    0,
    gap.gapLow,
    gap.envLow ?? gap.gapLow,
    -opts.equivalenceDelta,
  );
  const dHigh = Math.max(
    gap.gapHigh,
    gap.envHigh ?? gap.gapHigh,
    opts.equivalenceDelta,
  );

  return {
    data,
    layout: {
      autosize: true,
      height: Math.max(170, 70 + ready.length * 34 + 50),
      margin: { l: 130, r: 20, t: 10, b: 34 },
      // Top panel: per-group absolute estimates.
      xaxis: {
        anchor: "y",
        domain: [0, 1],
        title: "group estimate",
        zeroline: false,
      },
      yaxis: { anchor: "x", domain: GROUP_DOMAIN, automargin: true },
      // Bottom panel: the disparity on a difference axis, with 0 and ±δ references.
      xaxis2: {
        anchor: "y2",
        domain: [0, 1],
        title: "disparity vs 0 / ±δ",
        range: [dLow - 0.03, dHigh + 0.03],
        zeroline: false,
      },
      yaxis2: { anchor: "x2", domain: GAP_DOMAIN, automargin: true },
      shapes: [
        {
          type: "rect",
          xref: "x2",
          yref: "paper",
          x0: -opts.equivalenceDelta,
          x1: opts.equivalenceDelta,
          y0: GAP_DOMAIN[0],
          y1: GAP_DOMAIN[1],
          fillcolor: "rgba(43,138,62,0.10)",
          line: { width: 0 },
          layer: "below",
        },
        {
          type: "line",
          xref: "x2",
          yref: "paper",
          x0: 0,
          x1: 0,
          y0: GAP_DOMAIN[0],
          y1: GAP_DOMAIN[1],
          line: { color: "#adb5bd", width: 1, dash: "dot" },
        },
      ],
    },
  };
};
