import type { CreateTaskInput } from "@iamrobot/orchestration";
import type { ApprovalRequest } from "@iamrobot/protocol";
import { RunListCard } from "@iamrobot/ui";
import { useState } from "react";

import { RunWorkspace } from "./components/run-workspace";
import { TaskComposer } from "./components/task-composer";
import { useRuntimeSnapshot } from "./hooks/use-runtime-snapshot";
import { useSelectedRunDetails } from "./hooks/use-selected-run-details";

function MetricPill({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        alignItems: "center",
        background: "rgba(15, 23, 42, 0.6)",
        border: "1px solid rgba(148, 163, 184, 0.18)",
        borderRadius: "var(--radius-md)",
        display: "flex",
        gap: "0.4rem",
        padding: "0.3rem 0.65rem",
      }}
    >
      <span style={{ color: "#64748b", fontSize: "0.72rem" }}>{label}</span>
      <span style={{ color: "#e2e8f0", fontSize: "0.78rem", fontWeight: 700 }}>{value}</span>
    </div>
  );
}

interface AppBarProps {
  readonly snapshot: ReturnType<typeof useRuntimeSnapshot>["snapshot"];
  readonly runDetails: ReturnType<typeof useSelectedRunDetails>;
}

function AppBar({ snapshot, runDetails }: AppBarProps) {
  const activeGoal =
    snapshot.runs.find((s) => s.run.runId === snapshot.activeRunId)?.task.goal ?? "Idle";

  const blockedCount = String(
    runDetails.details?.approvalRequests.filter((r) => r.decision === "pending").length ?? 0,
  );

  return (
    <div
      style={{
        alignItems: "center",
        borderBottom: "1px solid rgba(148, 163, 184, 0.12)",
        display: "flex",
        gap: "1.5rem",
        height: "64px",
        justifyContent: "space-between",
        padding: "0 2.5rem",
      }}
    >
      <div style={{ alignItems: "center", display: "flex", flexShrink: 0, gap: "0.75rem" }}>
        <span
          style={{
            color: "#7dd3fc",
            fontFamily: "ui-monospace, monospace",
            fontSize: "0.72rem",
            fontWeight: 700,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
          }}
        >
          IAM ROBOT
        </span>
        <div
          style={{
            background: "rgba(148, 163, 184, 0.25)",
            height: "16px",
            width: "1px",
          }}
        />
        <span style={{ color: "#64748b", fontSize: "0.72rem", letterSpacing: "0.04em" }}>
          Control Room
        </span>
      </div>
      <span
        style={{
          color: snapshot.activeRunId ? "#e2e8f0" : "#64748b",
          flex: 1,
          fontSize: "0.82rem",
          overflow: "hidden",
          textAlign: "center",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {snapshot.activeRunId ? activeGoal : "Idle"}
      </span>
      <div style={{ alignItems: "center", display: "flex", flexShrink: 0, gap: "0.5rem" }}>
        <MetricPill label="Runs" value={String(snapshot.runs.length)} />
        <MetricPill label="Active" value={snapshot.activeRunId ? "1" : "0"} />
        <MetricPill label="Blocked" value={blockedCount} />
      </div>
    </div>
  );
}

export function App() {
  const [actionError, setActionError] = useState<string | null>(null);
  const [taskError, setTaskError] = useState<string | null>(null);
  const [taskBusy, setTaskBusy] = useState(false);
  const [resolvingApprovalId, setResolvingApprovalId] = useState<
    ApprovalRequest["approvalRequestId"] | null
  >(null);
  const { error: snapshotError, selectedRunId, selectRun, snapshot } = useRuntimeSnapshot();
  const runDetails = useSelectedRunDetails(selectedRunId, snapshot);

  const sortedRuns = [...snapshot.runs].sort((left, right) =>
    right.run.startedAt.localeCompare(left.run.startedAt),
  );

  async function handleCreateTask(input: CreateTaskInput) {
    setTaskBusy(true);
    setActionError(null);
    setTaskError(null);

    try {
      const task = await window.iamRobot.createTask(input);
      const result = await window.iamRobot.startRun({ task });

      selectRun(result.run.runId);
    } catch (error) {
      setTaskError(error instanceof Error ? error.message : "Unable to create and start the task.");
    } finally {
      setTaskBusy(false);
    }
  }

  async function handleApprovalDecision(
    approvalRequestId: ApprovalRequest["approvalRequestId"],
    decision: "approved" | "rejected",
  ) {
    setResolvingApprovalId(approvalRequestId);
    setActionError(null);

    try {
      await window.iamRobot.resolveApproval({
        approvalRequestId,
        decision,
      });
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Unable to resolve approval.");
    } finally {
      setResolvingApprovalId(null);
    }
  }

  async function handleRetryRun() {
    if (!selectedRunId) {
      return;
    }

    setActionError(null);

    try {
      await window.iamRobot.retryRun({
        runId: selectedRunId,
        reason: "Retry requested from the desktop renderer.",
      });
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Unable to retry run.");
    }
  }

  async function handleCancelRun() {
    if (!selectedRunId) {
      return;
    }

    setActionError(null);

    try {
      await window.iamRobot.cancelRun(selectedRunId);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Unable to cancel run.");
    }
  }

  return (
    <div
      style={{
        background:
          "radial-gradient(circle at top left, rgba(56, 189, 248, 0.2), transparent 30%), radial-gradient(circle at top right, rgba(20, 184, 166, 0.18), transparent 28%), #020617",
        color: "#e2e8f0",
        fontFamily: '"SF Pro Display", "Inter Variable", ui-sans-serif, system-ui, sans-serif',
        minHeight: "100vh",
      }}
    >
      <header>
        <AppBar runDetails={runDetails} snapshot={snapshot} />
      </header>
      <main
        style={{
          margin: "0 auto",
          maxWidth: "1480px",
          padding: "1.25rem 2.5rem 2.5rem",
        }}
      >
        {snapshotError || actionError ? (
          <p
            role="alert"
            style={{
              background: "rgba(127, 29, 29, 0.25)",
              border: "1px solid rgba(248, 113, 113, 0.35)",
              borderRadius: "var(--radius-md)",
              color: "#fecaca",
              margin: "0 0 1rem",
              padding: "1rem 1.1rem",
            }}
          >
            {snapshotError ?? actionError}
          </p>
        ) : null}
        <section
          style={{
            alignItems: "start",
            display: "flex",
            flexWrap: "wrap",
            gap: "1.25rem",
          }}
        >
          <aside style={{ display: "grid", flex: "1 1 360px", gap: "1rem", maxWidth: "400px" }}>
            <TaskComposer busy={taskBusy} error={taskError} onSubmit={handleCreateTask} />
            <RunListCard onSelectRun={selectRun} runs={sortedRuns} selectedRunId={selectedRunId} />
          </aside>
          <div style={{ flex: "999 1 720px", minWidth: "320px" }}>
            <RunWorkspace
              details={runDetails.details}
              error={runDetails.error}
              loading={runDetails.loading}
              onApprove={(approvalRequestId) =>
                void handleApprovalDecision(approvalRequestId, "approved")
              }
              onCancelRun={() => void handleCancelRun()}
              onReject={(approvalRequestId) =>
                void handleApprovalDecision(approvalRequestId, "rejected")
              }
              onRetryRun={() => void handleRetryRun()}
              resolvingApprovalId={resolvingApprovalId}
            />
          </div>
        </section>
      </main>
    </div>
  );
}
