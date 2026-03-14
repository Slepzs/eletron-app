import type { RunId, RuntimeRunSummary } from "@iamrobot/protocol";
import { RunListCard } from "@iamrobot/ui";
import { useState } from "react";

interface SidebarProps {
  readonly isComposing: boolean;
  readonly isHeartbeatActive: boolean;
  readonly onNewRun: () => void;
  readonly onSelectRun: (runId: RunId) => void;
  readonly onToggleHeartbeat: () => void;
  readonly runs: readonly RuntimeRunSummary[];
  readonly selectedRunId: RunId | null;
}

export function Sidebar({
  isComposing,
  isHeartbeatActive,
  onNewRun,
  onSelectRun,
  onToggleHeartbeat,
  runs,
  selectedRunId,
}: SidebarProps) {
  const [newRunHovered, setNewRunHovered] = useState(false);
  const [heartbeatHovered, setHeartbeatHovered] = useState(false);

  return (
    <div
      style={{
        background: "rgba(6, 11, 22, 0.96)",
        borderRight: "1px solid rgba(148, 163, 184, 0.10)",
        display: "flex",
        flexDirection: "column",
        flexShrink: 0,
        height: "100%",
        width: "260px",
      }}
    >
      {/* Header — fixed, aligns with AppBar height */}
      <div
        style={{
          borderBottom: "1px solid rgba(148, 163, 184, 0.10)",
          display: "flex",
          flexDirection: "column",
          gap: "0.6rem",
          padding: "0.85rem 0.9rem 0.75rem",
        }}
      >
        <div style={{ alignItems: "center", display: "flex", gap: "0.45rem" }}>
          <span
            style={{
              color: "#38bdf8",
              flexShrink: 0,
              fontSize: "0.9rem",
              lineHeight: 1,
            }}
          >
            ◈
          </span>
          <span
            style={{
              color: "#e2e8f0",
              fontFamily: "ui-monospace, monospace",
              fontSize: "0.82rem",
              fontWeight: 700,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
            }}
          >
            IAM ROBOT
          </span>
        </div>

        <button
          onClick={onNewRun}
          onMouseEnter={() => setNewRunHovered(true)}
          onMouseLeave={() => setNewRunHovered(false)}
          style={{
            alignItems: "center",
            background: isComposing
              ? "rgba(56, 189, 248, 0.18)"
              : newRunHovered
                ? "rgba(56, 189, 248, 0.14)"
                : "rgba(56, 189, 248, 0.08)",
            border: isComposing
              ? "1px solid rgba(56, 189, 248, 0.55)"
              : newRunHovered
                ? "1px solid rgba(56, 189, 248, 0.4)"
                : "1px solid rgba(56, 189, 248, 0.25)",
            borderRadius: "var(--radius-sm)",
            color: "#7dd3fc",
            cursor: "pointer",
            display: "flex",
            fontSize: "0.76rem",
            fontWeight: 600,
            gap: "0.35rem",
            justifyContent: "center",
            letterSpacing: "0.03em",
            padding: "0.45rem 0.75rem",
            textAlign: "center",
            transition: "background 120ms ease, border-color 120ms ease",
            width: "100%",
          }}
          type="button"
        >
          {isComposing ? "✕  Cancel" : "+ New Run"}
        </button>
      </div>

      {/* Run list — scrollable */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "0.5rem 0.65rem 0.65rem",
        }}
      >
        <p
          style={{
            color: "#475569",
            fontSize: "0.66rem",
            fontWeight: 700,
            letterSpacing: "0.1em",
            margin: "0 0 0.4rem",
            padding: "0 0.25rem",
            textTransform: "uppercase",
          }}
        >
          Runs
        </p>
        {runs.length === 0 ? (
          <p
            style={{
              color: "#475569",
              fontSize: "0.75rem",
              margin: 0,
              padding: "0.5rem 0.25rem",
            }}
          >
            No runs yet.
          </p>
        ) : (
          <RunListCard
            onSelectRun={onSelectRun}
            runs={runs}
            selectedRunId={selectedRunId}
            variant="sidebar"
          />
        )}
      </div>

      {/* Heartbeat toggle — pinned to bottom */}
      <div
        style={{
          borderTop: "1px solid rgba(148, 163, 184, 0.10)",
          padding: "0.65rem 0.9rem",
        }}
      >
        <button
          onClick={onToggleHeartbeat}
          onMouseEnter={() => setHeartbeatHovered(true)}
          onMouseLeave={() => setHeartbeatHovered(false)}
          style={{
            alignItems: "center",
            background: isHeartbeatActive
              ? "rgba(34, 197, 94, 0.12)"
              : heartbeatHovered
                ? "rgba(148, 163, 184, 0.08)"
                : "transparent",
            border: isHeartbeatActive
              ? "1px solid rgba(34, 197, 94, 0.35)"
              : heartbeatHovered
                ? "1px solid rgba(148, 163, 184, 0.22)"
                : "1px solid rgba(148, 163, 184, 0.12)",
            borderRadius: "var(--radius-sm)",
            color: isHeartbeatActive ? "#4ade80" : "#64748b",
            cursor: "pointer",
            display: "flex",
            fontSize: "0.74rem",
            fontWeight: 600,
            gap: "0.5rem",
            letterSpacing: "0.03em",
            padding: "0.45rem 0.7rem",
            transition: "background 120ms ease, border-color 120ms ease, color 120ms ease",
            width: "100%",
          }}
          type="button"
        >
          <span style={{ alignItems: "center", display: "flex", gap: "0.4rem", flex: 1 }}>
            {isHeartbeatActive ? (
              <span style={{ position: "relative", display: "inline-flex" }}>
                <span
                  style={{
                    animation: "ping 1.2s cubic-bezier(0,0,0.2,1) infinite",
                    background: "#4ade80",
                    borderRadius: "50%",
                    height: "8px",
                    opacity: 0.6,
                    position: "absolute",
                    width: "8px",
                  }}
                />
                <span
                  style={{
                    background: "#4ade80",
                    borderRadius: "50%",
                    display: "inline-block",
                    height: "8px",
                    position: "relative",
                    width: "8px",
                  }}
                />
              </span>
            ) : (
              <span
                style={{
                  background: "#334155",
                  borderRadius: "50%",
                  display: "inline-block",
                  height: "8px",
                  width: "8px",
                }}
              />
            )}
            {isHeartbeatActive ? "Autonomous · Active" : "Autonomous Mode"}
          </span>
          <span style={{ fontSize: "0.68rem", opacity: 0.6 }}>
            {isHeartbeatActive ? "ON" : "OFF"}
          </span>
        </button>
      </div>
    </div>
  );
}
