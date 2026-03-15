import type {
  AgentOutputChunk,
  RunId,
  RuntimeRunDetails,
  RuntimeRunSummary,
  RuntimeSnapshot,
} from "@iamrobot/protocol";
import { EventTimelineCard, LiveOutputCard, SessionListCard } from "@iamrobot/ui";

const RUN_STAGES = ["planning", "implementing", "reviewing", "verifying", "complete"] as const;

interface AutonomousActivityViewProps {
  readonly liveOutputEntries: readonly AgentOutputChunk[];
  readonly liveOutputError: string | null;
  readonly snapshot: RuntimeSnapshot;
  readonly runDetails: RuntimeRunDetails | null;
  readonly onSelectRun: (runId: RunId) => void;
  readonly selectedRunId: RunId | null;
}

export function AutonomousActivityView({
  liveOutputEntries,
  liveOutputError,
  snapshot,
  runDetails,
  onSelectRun,
  selectedRunId,
}: AutonomousActivityViewProps) {
  const activeRun = snapshot.runs.find((s) => s.run.runId === snapshot.activeRunId) ?? null;
  const otherRuns = snapshot.runs.filter((s) => s.run.runId !== snapshot.activeRunId);

  return (
    <div style={{ display: "grid", gap: "1rem" }}>
      {/* Header banner */}
      <div
        style={{
          alignItems: "center",
          background: "rgba(34, 197, 94, 0.06)",
          border: "1px solid rgba(34, 197, 94, 0.25)",
          borderRadius: "var(--radius-md)",
          display: "flex",
          gap: "0.75rem",
          padding: "0.75rem 1rem",
        }}
      >
        <span style={{ position: "relative", display: "inline-flex", flexShrink: 0 }}>
          <span
            style={{
              animation: "ping 1.2s cubic-bezier(0,0,0.2,1) infinite",
              background: "#4ade80",
              borderRadius: "50%",
              height: "10px",
              opacity: 0.5,
              position: "absolute",
              width: "10px",
            }}
          />
          <span
            style={{
              background: "#4ade80",
              borderRadius: "50%",
              display: "inline-block",
              height: "10px",
              position: "relative",
              width: "10px",
            }}
          />
        </span>
        <div>
          <span
            style={{
              color: "#4ade80",
              fontSize: "0.82rem",
              fontWeight: 700,
              letterSpacing: "0.06em",
            }}
          >
            Autonomous Mode Active
          </span>
          <span style={{ color: "#64748b", fontSize: "0.78rem", marginLeft: "0.75rem" }}>
            {activeRun ? "Agent is working…" : "Waiting for the next run…"}
          </span>
        </div>
      </div>

      {/* Active run */}
      {activeRun ? <ActiveRunCard run={activeRun} details={runDetails} /> : <WaitingCard />}

      {/* Sessions + Events side by side */}
      {runDetails ? (
        <LiveOutputCard
          entries={liveOutputEntries}
          error={liveOutputError}
          sessions={runDetails.sessions}
        />
      ) : null}

      {runDetails ? (
        <div
          style={{
            display: "grid",
            gap: "1rem",
            gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
          }}
        >
          <SessionListCard sessions={runDetails.sessions} />
          <EventTimelineCard events={[...runDetails.events].reverse().slice(0, 15)} />
        </div>
      ) : null}

      {/* Other runs */}
      {otherRuns.length > 0 ? (
        <OtherRunsList runs={otherRuns} onSelectRun={onSelectRun} selectedRunId={selectedRunId} />
      ) : null}
    </div>
  );
}

interface ActiveRunCardProps {
  readonly run: RuntimeRunSummary;
  readonly details: RuntimeRunDetails | null;
}

function ActiveRunCard({ run, details }: ActiveRunCardProps) {
  const currentStageIndex = RUN_STAGES.indexOf(run.run.stage as (typeof RUN_STAGES)[number]);

  const pendingSessionCount = details?.sessions.filter((s) => s.status === "running").length ?? 0;

  return (
    <section
      style={{
        background: "rgba(8, 15, 28, 0.75)",
        backdropFilter: "blur(8px)",
        border: "1px solid rgba(56, 189, 248, 0.28)",
        borderRadius: "20px",
        boxShadow: "0 16px 48px rgba(2, 6, 23, 0.32)",
        padding: "1.25rem",
      }}
    >
      <header
        style={{
          borderBottom: "1px solid rgba(148, 163, 184, 0.10)",
          marginBottom: "1rem",
          paddingBottom: "0.85rem",
        }}
      >
        <p
          style={{
            color: "#93c5fd",
            fontSize: "0.68rem",
            fontWeight: 700,
            letterSpacing: "0.12em",
            margin: 0,
            textTransform: "uppercase",
          }}
        >
          Active Run
        </p>
        <div
          style={{
            alignItems: "flex-start",
            display: "flex",
            gap: "0.75rem",
            justifyContent: "space-between",
            marginTop: "0.3rem",
          }}
        >
          <h2
            style={{
              color: "#e2e8f0",
              fontSize: "1.05rem",
              fontWeight: 600,
              margin: 0,
            }}
          >
            {run.task.goal}
          </h2>
          <StatusBadge status={run.run.status} />
        </div>
        {pendingSessionCount > 0 ? (
          <p style={{ color: "#64748b", fontSize: "0.78rem", margin: "0.4rem 0 0" }}>
            {pendingSessionCount} agent session{pendingSessionCount > 1 ? "s" : ""} running
          </p>
        ) : null}
      </header>

      {/* Stage progress */}
      <div>
        <p
          style={{
            color: "#64748b",
            fontSize: "0.68rem",
            fontWeight: 700,
            letterSpacing: "0.1em",
            margin: "0 0 0.75rem",
            textTransform: "uppercase",
          }}
        >
          Stage Progress
        </p>
        <div style={{ alignItems: "center", display: "flex", gap: 0 }}>
          {RUN_STAGES.map((stage, index) => {
            const isPast = index < currentStageIndex;
            const isCurrent = index === currentStageIndex;
            const isLast = index === RUN_STAGES.length - 1;

            return (
              <div
                key={stage}
                style={{ alignItems: "center", display: "flex", flex: isLast ? 0 : 1, minWidth: 0 }}
              >
                {/* Step node */}
                <div
                  style={{
                    alignItems: "center",
                    display: "flex",
                    flexDirection: "column",
                    flexShrink: 0,
                    gap: "0.35rem",
                  }}
                >
                  <div
                    style={{
                      alignItems: "center",
                      background: isCurrent
                        ? "rgba(56, 189, 248, 0.18)"
                        : isPast
                          ? "rgba(34, 197, 94, 0.15)"
                          : "rgba(15, 23, 42, 0.6)",
                      border: isCurrent
                        ? "2px solid #38bdf8"
                        : isPast
                          ? "2px solid #4ade80"
                          : "2px solid rgba(148, 163, 184, 0.2)",
                      borderRadius: "50%",
                      display: "flex",
                      height: "28px",
                      justifyContent: "center",
                      width: "28px",
                    }}
                  >
                    {isPast ? (
                      <span style={{ color: "#4ade80", fontSize: "0.7rem", fontWeight: 700 }}>
                        ✓
                      </span>
                    ) : isCurrent ? (
                      <span
                        style={{
                          animation: "ping 1.2s cubic-bezier(0,0,0.2,1) infinite",
                          background: "#38bdf8",
                          borderRadius: "50%",
                          display: "inline-block",
                          height: "8px",
                          opacity: 0.7,
                          width: "8px",
                        }}
                      />
                    ) : (
                      <span
                        style={{
                          background: "rgba(148, 163, 184, 0.25)",
                          borderRadius: "50%",
                          display: "inline-block",
                          height: "8px",
                          width: "8px",
                        }}
                      />
                    )}
                  </div>
                  <span
                    style={{
                      color: isCurrent ? "#38bdf8" : isPast ? "#4ade80" : "#475569",
                      fontSize: "0.64rem",
                      fontWeight: isCurrent ? 700 : 500,
                      letterSpacing: "0.04em",
                      textAlign: "center",
                      textTransform: "capitalize",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {stage}
                  </span>
                </div>

                {/* Connector line */}
                {!isLast ? (
                  <div
                    style={{
                      background: isPast
                        ? "rgba(34, 197, 94, 0.4)"
                        : isCurrent
                          ? "linear-gradient(90deg, rgba(56,189,248,0.5), rgba(148,163,184,0.1))"
                          : "rgba(148, 163, 184, 0.1)",
                      flex: 1,
                      height: "2px",
                      marginBottom: "1.1rem",
                    }}
                  />
                ) : null}
              </div>
            );
          })}
        </div>
      </div>

      {/* Attempt info */}
      <p
        style={{
          color: "#475569",
          fontSize: "0.75rem",
          margin: "0.85rem 0 0",
        }}
      >
        Attempt {run.run.currentAttempt} of {run.run.maxAttempts}
        {run.task.repoPath ? (
          <span style={{ marginLeft: "0.75rem", color: "#334155" }}>{run.task.repoPath}</span>
        ) : null}
      </p>
    </section>
  );
}

function WaitingCard() {
  return (
    <div
      style={{
        alignItems: "center",
        border: "1px dashed rgba(34, 197, 94, 0.2)",
        borderRadius: "var(--radius-lg)",
        color: "#475569",
        display: "flex",
        flexDirection: "column",
        gap: "0.5rem",
        justifyContent: "center",
        minHeight: "200px",
        padding: "3rem",
        textAlign: "center",
      }}
    >
      <p style={{ fontSize: "0.95rem", margin: 0 }}>Waiting for the next run…</p>
      <p style={{ color: "#334155", fontSize: "0.82rem", margin: 0, maxWidth: "40ch" }}>
        The agent will start automatically when a new task is queued.
      </p>
    </div>
  );
}

interface OtherRunsListProps {
  readonly runs: readonly RuntimeRunSummary[];
  readonly onSelectRun: (runId: RunId) => void;
  readonly selectedRunId: RunId | null;
}

function OtherRunsList({ runs, onSelectRun, selectedRunId }: OtherRunsListProps) {
  return (
    <section
      style={{
        background: "rgba(8, 15, 28, 0.75)",
        backdropFilter: "blur(8px)",
        border: "1px solid rgba(148, 163, 184, 0.18)",
        borderRadius: "20px",
        boxShadow: "0 16px 48px rgba(2, 6, 23, 0.32)",
        padding: "1.25rem",
      }}
    >
      <header
        style={{
          borderBottom: "1px solid rgba(148, 163, 184, 0.10)",
          marginBottom: "1rem",
          paddingBottom: "0.85rem",
        }}
      >
        <p
          style={{
            color: "#93c5fd",
            fontSize: "0.68rem",
            fontWeight: 700,
            letterSpacing: "0.12em",
            margin: 0,
            textTransform: "uppercase",
          }}
        >
          Run History
        </p>
        <h2 style={{ fontSize: "1.05rem", fontWeight: 600, margin: "0.3rem 0 0" }}>
          Previous runs
        </h2>
      </header>
      <div style={{ display: "grid", gap: "0.5rem" }}>
        {runs.map((summary) => (
          <CompactRunRow
            key={summary.run.runId}
            onSelectRun={onSelectRun}
            selected={selectedRunId === summary.run.runId}
            summary={summary}
          />
        ))}
      </div>
    </section>
  );
}

interface CompactRunRowProps {
  readonly summary: RuntimeRunSummary;
  readonly selected: boolean;
  readonly onSelectRun: (runId: RunId) => void;
}

function CompactRunRow({ summary, selected, onSelectRun }: CompactRunRowProps) {
  const statusColor = getStatusColor(summary.run.status);

  return (
    <button
      onClick={() => onSelectRun(summary.run.runId)}
      style={{
        alignItems: "center",
        background: selected ? "rgba(56, 189, 248, 0.08)" : "transparent",
        border: selected
          ? "1px solid rgba(56, 189, 248, 0.3)"
          : "1px solid rgba(148, 163, 184, 0.1)",
        borderRadius: "var(--radius-md)",
        color: "inherit",
        cursor: "pointer",
        display: "flex",
        gap: "0.75rem",
        justifyContent: "space-between",
        padding: "0.65rem 0.85rem",
        textAlign: "left",
        transition: "background 120ms ease, border-color 120ms ease",
        width: "100%",
      }}
      type="button"
    >
      <div style={{ alignItems: "center", display: "flex", gap: "0.5rem", minWidth: 0 }}>
        <span style={{ color: statusColor, flexShrink: 0, fontSize: "0.55rem" }}>●</span>
        <span
          style={{
            color: "#cbd5e1",
            fontSize: "0.84rem",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {summary.task.goal}
        </span>
      </div>
      <div style={{ alignItems: "center", display: "flex", flexShrink: 0, gap: "0.5rem" }}>
        <span
          style={{
            color: "#64748b",
            fontSize: "0.72rem",
            textTransform: "capitalize",
          }}
        >
          {summary.run.stage}
        </span>
        <StatusBadge status={summary.run.status} />
      </div>
    </button>
  );
}

function StatusBadge({ status }: { status: string }) {
  const color = getStatusColor(status);
  const label = status.replace("_", " ");

  return (
    <span
      style={{
        border: `1px solid ${color}`,
        borderRadius: "999px",
        color,
        fontSize: "0.68rem",
        fontWeight: 700,
        letterSpacing: "0.07em",
        padding: "0.2rem 0.55rem",
        textTransform: "uppercase",
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </span>
  );
}

function getStatusColor(status: string): string {
  if (status === "succeeded") return "#4ade80";
  if (status === "failed" || status === "blocked") return "#f87171";
  if (status === "in_progress") return "#38bdf8";
  return "#94a3b8";
}
