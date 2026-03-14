export type EntityId<Brand extends string> = string & {
  readonly __brand: Brand;
};

export type ProjectId = EntityId<"project">;
export type TaskId = EntityId<"task">;
export type RunId = EntityId<"run">;
export type AgentSessionId = EntityId<"agent-session">;
export type ArtifactId = EntityId<"artifact">;
export type ApprovalRequestId = EntityId<"approval-request">;
export type VerificationResultId = EntityId<"verification-result">;

export function createEntityId<Brand extends string>(brand: Brand, value: string): EntityId<Brand> {
  return `${brand}_${value}` as EntityId<Brand>;
}
