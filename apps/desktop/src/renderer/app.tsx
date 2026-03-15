import type { CreateProjectInput, CreateTaskInput } from "@iamrobot/orchestration";
import type { ApprovalRequest } from "@iamrobot/protocol";
import { useEffect, useState } from "react";

import { AutonomousActivityView } from "./components/autonomous-activity-view";
import { ProjectSetupCard } from "./components/project-setup-card";
import { RunWorkspace } from "./components/run-workspace";
import { Sidebar } from "./components/sidebar";
import { TaskComposer } from "./components/task-composer";
import { useLiveRunOutput } from "./hooks/use-live-run-output";
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
        padding: "0 1.5rem",
      }}
    >
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
  const [projectError, setProjectError] = useState<string | null>(null);
  const [projectBusy, setProjectBusy] = useState(false);
  const [taskError, setTaskError] = useState<string | null>(null);
  const [taskBusy, setTaskBusy] = useState(false);
  const [isComposing, setIsComposing] = useState(false);
  const [isHeartbeatActive, setIsHeartbeatActive] = useState(false);
  // Tracks whether the current run selection was made explicitly by the user.
  // When false and heartbeat is active, AutonomousActivityView is shown instead
  // of RunWorkspace, even though we auto-load the active run's details.
  const [isManualRunSelection, setIsManualRunSelection] = useState(false);
  const [resolvingApprovalId, setResolvingApprovalId] = useState<
    ApprovalRequest["approvalRequestId"] | null
  >(null);
  const { error: snapshotError, selectedRunId, selectRun, snapshot } = useRuntimeSnapshot();
  const runDetails = useSelectedRunDetails(selectedRunId, snapshot);
  const liveRunOutput = useLiveRunOutput(selectedRunId);

  const sortedRuns = [...snapshot.runs].sort((left, right) =>
    right.run.startedAt.localeCompare(left.run.startedAt),
  );
  const selectedProject =
    snapshot.projects.find((project) => project.projectId === snapshot.selectedProjectId) ?? null;

  // Restore heartbeat mode on mount
  useEffect(() => {
    void window.iamRobot.getHeartbeatMode().then(setIsHeartbeatActive);
  }, []);

  // When autonomous mode is active and no run is manually selected,
  // auto-track the currently active run so its details are visible.
  useEffect(() => {
    if (isHeartbeatActive && !isManualRunSelection && snapshot.activeRunId) {
      selectRun(snapshot.activeRunId);
    }
  }, [isHeartbeatActive, isManualRunSelection, snapshot.activeRunId, selectRun]);

  // Auto-open composer on first launch when there are no runs
  useEffect(() => {
    if (snapshot.runs.length === 0) {
      setIsComposing(true);
    }
  }, [snapshot.runs.length]);

  function handleSelectRun(runId: Parameters<typeof selectRun>[0]) {
    setIsComposing(false);
    setIsManualRunSelection(true);
    selectRun(runId);
  }

  async function handleToggleHeartbeat() {
    const next = !isHeartbeatActive;
    await window.iamRobot.setHeartbeatMode(next);
    setIsHeartbeatActive(next);
    // When entering autonomous mode, drop any manual selection so the activity view shows.
    if (next) setIsManualRunSelection(false);
  }

  async function handleCreateProject(input: CreateProjectInput) {
    setProjectBusy(true);
    setProjectError(null);

    try {
      await window.iamRobot.createProject(input);
    } catch (error) {
      setProjectError(error instanceof Error ? error.message : "Unable to save the project.");
    } finally {
      setProjectBusy(false);
    }
  }

  async function handleCreateTask(input: CreateTaskInput) {
    setTaskBusy(true);
    setActionError(null);
    setTaskError(null);

    try {
      const task = await window.iamRobot.createTask(input);
      const result = await window.iamRobot.startRun({ task });

      setIsComposing(false);
      selectRun(result.run.runId);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to create and start the task.";

      if (message.includes("already active") && snapshot.activeRunId) {
        setIsComposing(false);
        setIsManualRunSelection(true);
        selectRun(snapshot.activeRunId);
      }

      setTaskError(message);
    } finally {
      setTaskBusy(false);
    }
  }

  async function handleSelectProject(projectId: (typeof snapshot.projects)[number]["projectId"]) {
    setProjectBusy(true);
    setProjectError(null);

    try {
      await window.iamRobot.selectProject(projectId);
    } catch (error) {
      setProjectError(
        error instanceof Error ? error.message : "Unable to switch the active project.",
      );
    } finally {
      setProjectBusy(false);
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
        color: "#e2e8f0",
        display: "flex",
        fontFamily: '"SF Pro Display", "Inter Variable", ui-sans-serif, system-ui, sans-serif',
        height: "100vh",
        overflow: "hidden",
      }}
    >
      <Sidebar
        isComposing={isComposing}
        isHeartbeatActive={isHeartbeatActive}
        onNewRun={() => setIsComposing((prev) => !prev)}
        onSelectRun={handleSelectRun}
        onToggleHeartbeat={() => void handleToggleHeartbeat()}
        runs={sortedRuns}
        selectedRunId={selectedRunId}
      />
      <div
        style={{
          background:
            "radial-gradient(circle at top left, rgba(56, 189, 248, 0.2), transparent 30%), radial-gradient(circle at top right, rgba(20, 184, 166, 0.18), transparent 28%), #020617",
          display: "flex",
          flex: 1,
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        <header>
          <AppBar runDetails={runDetails} snapshot={snapshot} />
        </header>
        <main
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "1.25rem 2rem 2.5rem",
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
          {isComposing ? (
            <div style={{ display: "grid", gap: "1rem", marginBottom: "1.25rem" }}>
              <ProjectSetupCard
                busy={projectBusy}
                error={projectError}
                onCreateProject={handleCreateProject}
                onSelectProject={handleSelectProject}
                projects={snapshot.projects}
                selectedProjectId={snapshot.selectedProjectId}
              />
              <TaskComposer
                busy={taskBusy}
                error={taskError}
                onSubmit={handleCreateTask}
                selectedProject={selectedProject}
              />
            </div>
          ) : null}
          {isHeartbeatActive && !isManualRunSelection ? (
            <AutonomousActivityView
              liveOutputEntries={liveRunOutput.entries}
              liveOutputError={liveRunOutput.error}
              onSelectRun={handleSelectRun}
              runDetails={runDetails.details}
              selectedRunId={selectedRunId}
              snapshot={snapshot}
            />
          ) : (
            <RunWorkspace
              details={runDetails.details}
              error={runDetails.error}
              liveOutputEntries={liveRunOutput.entries}
              liveOutputError={liveRunOutput.error}
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
          )}
        </main>
      </div>
    </div>
  );
}
