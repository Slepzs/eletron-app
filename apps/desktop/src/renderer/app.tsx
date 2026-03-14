import type { CreateTaskInput } from "@iamrobot/orchestration";
import type { ApprovalRequest } from "@iamrobot/protocol";
import { RunListCard } from "@iamrobot/ui";
import { useState } from "react";

import { RunWorkspace } from "./components/run-workspace";
import { TaskComposer } from "./components/task-composer";
import { useRuntimeSnapshot } from "./hooks/use-runtime-snapshot";
import { useSelectedRunDetails } from "./hooks/use-selected-run-details";

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
    <main
      style={{
        background:
          "radial-gradient(circle at top left, rgba(56, 189, 248, 0.2), transparent 30%), radial-gradient(circle at top right, rgba(20, 184, 166, 0.18), transparent 28%), #020617",
        color: "#e2e8f0",
        fontFamily: '"SF Pro Display", "Inter Variable", ui-sans-serif, system-ui, sans-serif',
        minHeight: "100vh",
        padding: "2.5rem",
      }}
    >
      <div
        style={{
          margin: "0 auto",
          maxWidth: "1480px",
        }}
      >
        <section
          style={{
            alignItems: "end",
            display: "flex",
            flexWrap: "wrap",
            gap: "1.5rem",
            justifyContent: "space-between",
            marginBottom: "2rem",
          }}
        >
          <div>
            <p
              style={{
                color: "#7dd3fc",
                fontSize: "0.8rem",
                fontWeight: 700,
                letterSpacing: "0.16em",
                margin: 0,
                textTransform: "uppercase",
              }}
            >
              IAM Robot
            </p>
            <h1
              style={{
                fontSize: "clamp(2.4rem, 5vw, 4.8rem)",
                lineHeight: 0.95,
                margin: "0.9rem 0 1rem",
                maxWidth: "11ch",
              }}
            >
              Runtime-backed desktop control room.
            </h1>
            <p
              style={{
                color: "#94a3b8",
                fontSize: "1rem",
                lineHeight: 1.7,
                margin: 0,
                maxWidth: "72ch",
              }}
            >
              The renderer now reflects the real local runtime: task creation, run history,
              approvals, artifacts, verification, verdicts, and the full event timeline all flow
              through the typed preload bridge.
            </p>
          </div>
          <div
            style={{
              backdropFilter: "blur(16px)",
              background: "rgba(8, 15, 28, 0.62)",
              border: "1px solid rgba(148, 163, 184, 0.18)",
              borderRadius: "24px",
              display: "grid",
              gap: "0.75rem",
              minWidth: "280px",
              padding: "1.25rem 1.4rem",
            }}
          >
            <Metric label="Runs" value={`${snapshot.runs.length}`} />
            <Metric label="Active run" value={snapshot.activeRunId ? "1" : "0"} />
            <Metric
              label="Blocked approvals"
              value={`${
                runDetails.details?.approvalRequests.filter(
                  (request) => request.decision === "pending",
                ).length ?? 0
              }`}
            />
          </div>
        </section>
        {snapshotError || actionError ? (
          <p
            role="alert"
            style={{
              background: "rgba(127, 29, 29, 0.25)",
              border: "1px solid rgba(248, 113, 113, 0.35)",
              borderRadius: "16px",
              color: "#fecaca",
              margin: "0 0 1.5rem",
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
          <aside style={{ display: "grid", flex: "1 1 340px", gap: "1rem", maxWidth: "380px" }}>
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
      </div>
    </main>
  );
}

interface MetricProps {
  readonly label: string;
  readonly value: string;
}

function Metric({ label, value }: MetricProps) {
  return (
    <div>
      <p
        style={{
          color: "#64748b",
          fontSize: "0.74rem",
          letterSpacing: "0.08em",
          margin: 0,
          textTransform: "uppercase",
        }}
      >
        {label}
      </p>
      <p style={{ fontSize: "1.65rem", fontWeight: 700, margin: "0.35rem 0 0" }}>{value}</p>
    </div>
  );
}
