import type { RuntimeRunDetails } from "@iamrobot/protocol";

import { formatRunStageLabel, formatTimestamp } from "./runtime-formatting";
import { SectionCard } from "./section-card";
import { StatusBadge } from "./status-badge";

export interface RunOverviewCardProps {
  readonly details: RuntimeRunDetails;
}

export function RunOverviewCard({ details }: RunOverviewCardProps) {
  const { run, task } = details;

  return (
    <SectionCard
      aside={<StatusBadge status={run.status} />}
      eyebrow="Selected Run"
      title={task.goal}
    >
      <div style={{ display: "grid", gap: "1rem" }}>
        <dl
          style={{
            display: "grid",
            gap: "0.9rem",
            gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
            margin: 0,
          }}
        >
          <OverviewField label="Repository" value={task.repoPath} />
          <OverviewField label="Base branch" value={task.baseBranch} />
          <OverviewField label="Stage" value={formatRunStageLabel(run.stage)} />
          <OverviewField label="Attempt" value={`${run.currentAttempt} / ${run.maxAttempts}`} />
          <OverviewField label="Verification" value={task.verificationProfile} />
          <OverviewField label="Started" value={formatTimestamp(run.startedAt)} />
          <OverviewField label="Completed" value={formatTimestamp(run.completedAt)} />
          <OverviewField label="Active approvals" value={`${details.approvalRequests.length}`} />
        </dl>
        <TaskListBlock items={task.constraints} title="Constraints" />
        <TaskListBlock items={task.acceptanceCriteria} title="Acceptance Criteria" />
        <TaskListBlock items={task.allowedPaths} title="Allowed Paths" />
      </div>
    </SectionCard>
  );
}

interface OverviewFieldProps {
  readonly label: string;
  readonly value: string;
}

function OverviewField({ label, value }: OverviewFieldProps) {
  return (
    <div>
      <dt
        style={{
          color: "#64748b",
          fontSize: "0.68rem",
          letterSpacing: "0.06em",
          textTransform: "uppercase",
        }}
      >
        {label}
      </dt>
      <dd style={{ fontSize: "0.88rem", margin: "0.25rem 0 0" }}>{value}</dd>
    </div>
  );
}

interface TaskListBlockProps {
  readonly items: readonly string[];
  readonly title: string;
}

function TaskListBlock({ items, title }: TaskListBlockProps) {
  return (
    <div>
      <h3
        style={{
          color: "#cbd5e1",
          fontSize: "0.8rem",
          letterSpacing: "0.08em",
          margin: "0 0 0.65rem",
          textTransform: "uppercase",
        }}
      >
        {title}
      </h3>
      {items.length === 0 ? (
        <p style={{ color: "#64748b", margin: 0 }}>No entries recorded.</p>
      ) : (
        <ul style={{ color: "#e2e8f0", margin: 0, paddingLeft: "1.25rem" }}>
          {items.map((item) => (
            <li key={item} style={{ lineHeight: 1.6 }}>
              {item}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
