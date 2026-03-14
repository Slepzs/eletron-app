import type {
  AgentSession,
  AgentSessionStatus,
  ApprovalDecision,
  ApprovalKind,
  ApprovalRequest,
  Artifact,
  ArtifactKind,
  DomainEvent,
  DomainEventType,
  Run,
  RunStage,
  RunStatus,
  Task,
  VerdictStatus,
  VerificationCheckResult,
  VerificationResult,
  VerificationResultStatus,
} from "@iamrobot/protocol";
import { integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const tasks = sqliteTable("tasks", {
  id: text("id").$type<Task["taskId"]>().primaryKey(),
  repoPath: text("repo_path").notNull(),
  baseBranch: text("base_branch").notNull(),
  goal: text("goal").notNull(),
  constraints: text("constraints", { mode: "json" }).$type<readonly string[]>().notNull(),
  acceptanceCriteria: text("acceptance_criteria", {
    mode: "json",
  })
    .$type<readonly string[]>()
    .notNull(),
  allowedPaths: text("allowed_paths", { mode: "json" }).$type<readonly string[]>().notNull(),
  verificationProfile: text("verification_profile").notNull(),
});

export const runs = sqliteTable("runs", {
  id: text("id").$type<Run["runId"]>().primaryKey(),
  taskId: text("task_id").$type<Task["taskId"]>().notNull(),
  status: text("status").$type<RunStatus>().notNull(),
  stage: text("stage").$type<RunStage>().notNull(),
  currentAttempt: integer("current_attempt").notNull(),
  maxAttempts: integer("max_attempts").notNull(),
  startedAt: text("started_at").notNull(),
  completedAt: text("completed_at"),
});

export const agentSessions = sqliteTable("agent_sessions", {
  id: text("id").$type<AgentSession["sessionId"]>().primaryKey(),
  runId: text("run_id").$type<Run["runId"]>().notNull(),
  adapter: text("adapter").$type<AgentSession["adapter"]>().notNull(),
  role: text("role").$type<AgentSession["role"]>().notNull(),
  status: text("status").$type<AgentSessionStatus>().notNull(),
  startedAt: text("started_at").notNull(),
  endedAt: text("ended_at"),
});

export const artifacts = sqliteTable("artifacts", {
  id: text("id").$type<Artifact["artifactId"]>().primaryKey(),
  runId: text("run_id").$type<Run["runId"]>().notNull(),
  sessionId: text("session_id").$type<AgentSession["sessionId"]>(),
  kind: text("kind").$type<ArtifactKind>().notNull(),
  label: text("label").notNull(),
  path: text("path"),
  contentType: text("content_type"),
  createdAt: text("created_at").notNull(),
});

export const verificationResults = sqliteTable("verification_results", {
  id: text("id").$type<VerificationResult["verificationResultId"]>().primaryKey(),
  runId: text("run_id").$type<Run["runId"]>().notNull(),
  status: text("status").$type<VerificationResultStatus>().notNull(),
  checks: text("checks", { mode: "json" }).$type<readonly VerificationCheckResult[]>().notNull(),
  completedAt: text("completed_at").notNull(),
});

export const approvalRequests = sqliteTable("approval_requests", {
  id: text("id").$type<ApprovalRequest["approvalRequestId"]>().primaryKey(),
  runId: text("run_id").$type<Run["runId"]>().notNull(),
  kind: text("kind").$type<ApprovalKind>().notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  requestedAt: text("requested_at").notNull(),
  resolvedAt: text("resolved_at"),
  decision: text("decision").$type<ApprovalDecision>().notNull(),
});

export const verdicts = sqliteTable("verdicts", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  runId: text("run_id").$type<Run["runId"]>().notNull(),
  status: text("status").$type<VerdictStatus>().notNull(),
  summary: text("summary").notNull(),
  blockingIssues: text("blocking_issues", { mode: "json" }).$type<readonly string[]>().notNull(),
  proposedNextAction: text("proposed_next_action"),
  confidence: real("confidence").notNull(),
  recordedAt: text("recorded_at").notNull(),
});

export const domainEvents = sqliteTable("domain_events", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  runId: text("run_id").$type<Run["runId"]>().notNull(),
  type: text("type").$type<DomainEventType>().notNull(),
  timestamp: text("timestamp").notNull(),
  payload: text("payload", { mode: "json" }).$type<DomainEvent>().notNull(),
});

export const persistenceSchema = {
  tasks,
  runs,
  agentSessions,
  artifacts,
  verificationResults,
  approvalRequests,
  verdicts,
  domainEvents,
};

export type TaskRow = typeof tasks.$inferSelect;
export type TaskInsert = typeof tasks.$inferInsert;

export type RunRow = typeof runs.$inferSelect;
export type RunInsert = typeof runs.$inferInsert;

export type AgentSessionRow = typeof agentSessions.$inferSelect;
export type AgentSessionInsert = typeof agentSessions.$inferInsert;

export type ArtifactRow = typeof artifacts.$inferSelect;
export type ArtifactInsert = typeof artifacts.$inferInsert;

export type VerificationResultRow = typeof verificationResults.$inferSelect;
export type VerificationResultInsert = typeof verificationResults.$inferInsert;

export type ApprovalRequestRow = typeof approvalRequests.$inferSelect;
export type ApprovalRequestInsert = typeof approvalRequests.$inferInsert;

export type VerdictRow = typeof verdicts.$inferSelect;
export type VerdictInsert = typeof verdicts.$inferInsert;

export type DomainEventRow = typeof domainEvents.$inferSelect;
export type DomainEventInsert = typeof domainEvents.$inferInsert;
