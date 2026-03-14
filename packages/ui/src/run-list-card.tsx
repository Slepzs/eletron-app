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
          {runs.map((summary) => {
            const selected = selectedRunId === summary.run.runId;

            return (
              <button
                key={summary.run.runId}
                onClick={() => onSelectRun(summary.run.runId)}
                style={{
                  background: selected ? "rgba(56, 189, 248, 0.12)" : "rgba(15, 23, 42, 0.55)",
                  border: selected
                    ? "1px solid rgba(56, 189, 248, 0.65)"
                    : "1px solid rgba(148, 163, 184, 0.2)",
                  borderRadius: "16px",
                  color: "inherit",
                  cursor: "pointer",
                  padding: "1rem",
                  textAlign: "left",
                }}
                type="button"
              >
                <div
                  style={{
                    alignItems: "flex-start",
                    display: "flex",
                    gap: "0.75rem",
                    justifyContent: "space-between",
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <p
                      style={{
                        color: "#e2e8f0",
                        fontSize: "0.95rem",
                        fontWeight: 700,
                        margin: 0,
                      }}
                    >
                      {summary.task.goal}
                    </p>
                    <p
                      style={{
                        color: "#94a3b8",
                        fontSize: "0.8rem",
                        margin: "0.35rem 0 0",
                      }}
                    >
                      {summary.task.repoPath}
                    </p>
                  </div>
                  <StatusBadge status={summary.run.status} />
                </div>
                <dl
                  style={{
                    display: "grid",
                    gap: "0.5rem",
                    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                    margin: "0.9rem 0 0",
                  }}
                >
                  <div>
                    <dt style={{ color: "#64748b", fontSize: "0.72rem" }}>Stage</dt>
                    <dd style={{ margin: "0.2rem 0 0" }}>
                      {formatRunStageLabel(summary.run.stage)}
                    </dd>
                  </div>
                  <div>
                    <dt style={{ color: "#64748b", fontSize: "0.72rem" }}>Started</dt>
                    <dd style={{ margin: "0.2rem 0 0" }}>
                      {formatTimestamp(summary.run.startedAt)}
                    </dd>
                  </div>
                </dl>
                {summary.latestVerdict ? (
                  <p
                    style={{
                      color: "#cbd5e1",
                      fontSize: "0.82rem",
                      lineHeight: 1.5,
                      margin: "0.9rem 0 0",
                    }}
                  >
                    {summary.latestVerdict.summary}
                  </p>
                ) : null}
              </button>
            );
          })}
        </div>
      )}
    </SectionCard>
  );
}
