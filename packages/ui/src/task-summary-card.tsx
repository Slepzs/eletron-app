import type { Run, Task } from "@iamrobot/protocol";

import { SectionCard } from "./section-card";
import { StatusBadge } from "./status-badge";

export interface TaskSummaryCardProps {
  readonly run: Run;
  readonly task: Task;
}

export function TaskSummaryCard({ run, task }: TaskSummaryCardProps) {
  return (
    <SectionCard aside={<StatusBadge status={run.status} />} eyebrow="Run" title={task.goal}>
      <dl
        style={{
          display: "grid",
          gap: "0.75rem",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          margin: 0,
        }}
      >
        <div>
          <dt style={{ color: "#94a3b8", fontSize: "0.8rem" }}>Repository</dt>
          <dd style={{ margin: "0.25rem 0 0" }}>{task.repoPath}</dd>
        </div>
        <div>
          <dt style={{ color: "#94a3b8", fontSize: "0.8rem" }}>Base Branch</dt>
          <dd style={{ margin: "0.25rem 0 0" }}>{task.baseBranch}</dd>
        </div>
        <div>
          <dt style={{ color: "#94a3b8", fontSize: "0.8rem" }}>Stage</dt>
          <dd style={{ margin: "0.25rem 0 0", textTransform: "capitalize" }}>{run.stage}</dd>
        </div>
        <div>
          <dt style={{ color: "#94a3b8", fontSize: "0.8rem" }}>Verification</dt>
          <dd style={{ margin: "0.25rem 0 0" }}>{task.verificationProfile}</dd>
        </div>
      </dl>
    </SectionCard>
  );
}
