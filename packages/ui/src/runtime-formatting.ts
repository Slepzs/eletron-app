import type {
  AgentKind,
  AgentRole,
  AgentSessionStatus,
  DomainEvent,
  RunStage,
  VerdictStatus,
  VerificationCheckStatus,
} from "@iamrobot/protocol";

function formatLabel(value: string): string {
  return value
    .split("_")
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

export function formatTimestamp(value?: string): string {
  if (!value) {
    return "Pending";
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function formatRunStageLabel(stage: RunStage): string {
  return formatLabel(stage);
}

export function formatAgentKindLabel(kind: AgentKind): string {
  return kind === "claude" ? "Claude Code" : "Codex CLI";
}

export function formatAgentRoleLabel(role: AgentRole): string {
  return formatLabel(role);
}

export function formatSessionStatusLabel(status: AgentSessionStatus): string {
  return formatLabel(status);
}

export function formatVerdictStatusLabel(status: VerdictStatus): string {
  return formatLabel(status);
}

export function getVerdictColor(status: VerdictStatus): string {
  switch (status) {
    case "accepted":
      return "#22c55e";
    case "needs_retry":
      return "#f59e0b";
    case "rejected":
      return "#f97316";
  }
}

export function getSessionStatusColor(status: AgentSessionStatus): string {
  switch (status) {
    case "completed":
      return "#22c55e";
    case "failed":
      return "#ef4444";
    case "interrupted":
      return "#f59e0b";
    case "pending":
      return "#94a3b8";
    case "running":
      return "#38bdf8";
  }
}

export function getCheckStatusColor(status: VerificationCheckStatus): string {
  switch (status) {
    case "failed":
      return "#ef4444";
    case "passed":
      return "#22c55e";
    case "skipped":
      return "#94a3b8";
  }
}

export function describeDomainEvent(event: DomainEvent): {
  readonly detail: string;
  readonly title: string;
} {
  switch (event.type) {
    case "agent.handoff.received":
      return {
        title: "Handoff received",
        detail: `${formatAgentKindLabel(event.session.adapter)} ${formatAgentRoleLabel(event.session.role)}`,
      };
    case "agent.session.started":
      return {
        title: "Agent session started",
        detail: `${formatAgentKindLabel(event.session.adapter)} ${formatAgentRoleLabel(event.session.role)}`,
      };
    case "agent.session.status.changed":
      return {
        title: "Agent session updated",
        detail: `Session moved to ${formatSessionStatusLabel(event.nextStatus)}`,
      };
    case "approval.requested":
      return {
        title: "Approval requested",
        detail: `${formatLabel(event.approvalRequest.kind)}: ${event.approvalRequest.title}`,
      };
    case "approval.resolved":
      return {
        title: "Approval resolved",
        detail: `${event.approvalRequest.title} was ${formatLabel(event.approvalRequest.decision)}`,
      };
    case "artifact.recorded":
      return {
        title: "Artifact recorded",
        detail: `${formatLabel(event.artifact.kind)}: ${event.artifact.label}`,
      };
    case "run.created":
      return {
        title: "Run created",
        detail: event.task.goal,
      };
    case "run.stage.changed":
      return {
        title: "Stage changed",
        detail: `${formatRunStageLabel(event.previousStage)} -> ${formatRunStageLabel(event.nextStage)}`,
      };
    case "run.status.changed":
      return {
        title: "Run status changed",
        detail: `${formatLabel(event.previousStatus)} -> ${formatLabel(event.nextStatus)}`,
      };
    case "run.verdict.recorded":
      return {
        title: "Verdict recorded",
        detail: `${formatVerdictStatusLabel(event.verdict.status)} · ${event.verdict.summary}`,
      };
    case "verification.started":
      return {
        title: "Verification started",
        detail: `${event.checks.length} checks in ${event.verificationProfile}`,
      };
    case "verification.completed":
      return {
        title: "Verification completed",
        detail: `${formatLabel(event.result.status)} · ${event.result.checks.length} checks`,
      };
  }
}
