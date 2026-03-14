import { useState } from "react";

import type { RunId, RuntimeRunSummary } from "@iamrobot/protocol";

import { formatRunStageLabel, formatTimestamp } from "./runtime-formatting";
import { SectionCard } from "./section-card";
import { StatusBadge } from "./status-badge";

export interface RunListCardProps {
  readonly onSelectRun: (runId: RunId) => void;
  readonly runs: readonly RuntimeRunSummary[];
  readonly selectedRunId: RunId | null;
}

export function RunListCard({ onSelectRun, runs, selectedRunId }: RunListCardProps) {
  return (
    <SectionCard eyebrow="Run History" title="Local runs">
      {runs.length === 0 ? (
        <p style={{ color: "#94a3b8", margin: 0 }}>
          No runs yet. Create a task to start the planner, implementer, reviewer, and verification
          loop.
        </p>
      ) : (
        <div style={{ display: "grid", gap: "0.85rem" }}>
          {runs.map((summary) => (
            <RunButton
              key={summary.run.runId}
              onSelectRun={onSelectRun}
              selected={selectedRunId === summary.run.runId}
              summary={summary}
            />
          ))}
        </div>
      )}
    </SectionCard>
  );
}

interface RunButtonProps {
  summary: RuntimeRunSummary;
  selected: boolean;
  onSelectRun: (runId: RunId) => void;
}

function RunButton({ summary, selected, onSelectRun }: RunButtonProps) {
  const [hovered, setHovered] = useState(false);

  const statusColor = getStatusColor(summary.run.status);

  return (
    <button
      onClick={() => onSelectRun(summary.run.runId)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: selected
          ? "rgba(56, 189, 248, 0.12)"
          : hovered
          ? "rgba(56, 189, 248, 0.06)"
          : "rgba(15, 23, 42, 0.55)",
        border: selected
          ? "1px solid rgba(56, 189, 248, 0.55)"
          : hovered
          ? "1px solid rgba(148, 163, 184, 0.35)"
          : "1px solid rgba(148, 163, 184, 0.18)",
        borderRadius: "var(--radius-md)",
        color: "inherit",
        cursor: "pointer",
        padding: "0.9rem",
        textAlign: "left",
        transition: "background 120ms ease, border-color 120ms ease",
        width: "100%",
      }}
      type="button"
    >
      <div style={{ alignItems: "flex-start", display: "flex", gap: "0.75rem", justifyContent: "space-between" }}>
        <div style={{ minWidth: 0 }}>
          <p style={{ alignItems: "center", color: "#e2e8f0", display: "flex", fontSize: "0.88rem", fontWeight: 700, gap: "0.45rem", margin: 0 }}>
            <span style={{ color: statusColor, flexShrink: 0, fontSize: "0.6rem" }}>●</span>
            {summary.task.goal}
          </p>
          <p style={{ color: "#94a3b8", fontSize: "0.75rem", margin: "0.3rem 0 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {summary.task.repoPath}
          </p>
        </div>
        <StatusBadge status={summary.run.status} />
      </div>
      <dl style={{ display: "grid", gap: "0.4rem", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", margin: "0.75rem 0 0" }}>
        <div>
          <dt style={{ color: "#64748b", fontSize: "0.68rem", letterSpacing: "0.06em", textTransform: "uppercase" }}>Stage</dt>
          <dd style={{ fontSize: "0.82rem", margin: "0.15rem 0 0" }}>{formatRunStageLabel(summary.run.stage)}</dd>
        </div>
        <div>
          <dt style={{ color: "#64748b", fontSize: "0.68rem", letterSpacing: "0.06em", textTransform: "uppercase" }}>Started</dt>
          <dd style={{ fontSize: "0.82rem", margin: "0.15rem 0 0" }}>{formatTimestamp(summary.run.startedAt)}</dd>
        </div>
      </dl>
      {summary.latestVerdict ? (
        <p style={{ color: "#94a3b8", fontSize: "0.8rem", lineHeight: 1.5, margin: "0.75rem 0 0" }}>
          {summary.latestVerdict.summary}
        </p>
      ) : null}
    </button>
  );
}

function getStatusColor(status: string): string {
  if (status === "completed") return "#4ade80";
  if (status === "failed" || status === "blocked") return "#f87171";
  if (status === "in_progress") return "#38bdf8";
  return "#94a3b8";
}
