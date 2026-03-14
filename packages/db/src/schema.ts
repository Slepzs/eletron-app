import type {
  AgentSessionStatus,
  ApprovalDecision,
  ApprovalKind,
  ArtifactKind,
  RunStage,
  RunStatus,
  VerificationCheckResult,
} from "@iamrobot/protocol";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const tasks = sqliteTable("tasks", {
  id: text("id").primaryKey(),
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
  id: text("id").primaryKey(),
  taskId: text("task_id").notNull(),
  status: text("status").$type<RunStatus>().notNull(),
  stage: text("stage").$type<RunStage>().notNull(),
  currentAttempt: integer("current_attempt").notNull(),
  maxAttempts: integer("max_attempts").notNull(),
  startedAt: text("started_at").notNull(),
  completedAt: text("completed_at"),
});

export const agentSessions = sqliteTable("agent_sessions", {
  id: text("id").primaryKey(),
  runId: text("run_id").notNull(),
  adapter: text("adapter").notNull(),
  role: text("role").notNull(),
  status: text("status").$type<AgentSessionStatus>().notNull(),
  startedAt: text("started_at").notNull(),
  endedAt: text("ended_at"),
});

export const artifacts = sqliteTable("artifacts", {
  id: text("id").primaryKey(),
  runId: text("run_id").notNull(),
  sessionId: text("session_id"),
  kind: text("kind").$type<ArtifactKind>().notNull(),
  label: text("label").notNull(),
  path: text("path"),
  contentType: text("content_type"),
  createdAt: text("created_at").notNull(),
});

export const verificationResults = sqliteTable("verification_results", {
  id: text("id").primaryKey(),
  runId: text("run_id").notNull(),
  status: text("status").notNull(),
  checks: text("checks", { mode: "json" }).$type<readonly VerificationCheckResult[]>().notNull(),
  completedAt: text("completed_at").notNull(),
});

export const approvalRequests = sqliteTable("approval_requests", {
  id: text("id").primaryKey(),
  runId: text("run_id").notNull(),
  kind: text("kind").$type<ApprovalKind>().notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  requestedAt: text("requested_at").notNull(),
  resolvedAt: text("resolved_at"),
  decision: text("decision").$type<ApprovalDecision>().notNull(),
});
