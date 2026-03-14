import type { RuntimeRunDetails, Verdict } from "@iamrobot/protocol";

export function buildDiagnosticsReport(details: RuntimeRunDetails, verdict: Verdict): string {
  const fc = verdict.failureContext;
  const lines: string[] = [
    "# IAM Robot Failure Diagnostics",
    `Generated: ${new Date().toISOString()}`,
    "",
    "## Run",
    `- Run ID: ${details.run.runId}`,
    `- Goal: ${details.task.goal}`,
    `- Stage at failure: ${details.run.stage}`,
    `- Attempt: ${details.run.currentAttempt} of ${details.run.maxAttempts}`,
    `- Status: ${details.run.status}`,
    "",
    "## Verdict",
    `- Status: ${verdict.status}`,
    `- Summary: ${verdict.summary}`,
    "- Blocking issues:",
    ...verdict.blockingIssues.map((i) => `  - ${i}`),
    `- Proposed next action: ${verdict.proposedNextAction ?? "—"}`,
  ];

  if (fc !== undefined) {
    lines.push(
      "",
      "## Failure Context",
      `- Exit code: ${fc.exitCode ?? "—"}`,
      `- Signal: ${fc.signal ?? "—"}`,
      `- Stage: ${fc.stage}`,
      `- Role: ${fc.role}`,
    );

    if (fc.stderrSnippet !== null) {
      lines.push("", "## Stderr (last 2000 chars)", "```", fc.stderrSnippet, "```");
    }

    if (fc.stackTrace !== null) {
      lines.push("", "## Stack Trace", "```", fc.stackTrace, "```");
    }
  }

  const logArtifacts = details.artifacts.filter((a) => a.kind === "log");
  if (logArtifacts.length > 0) {
    lines.push("", "## Log Artifacts");
    for (const a of logArtifacts) {
      lines.push(`- ${a.label}${a.path !== undefined ? ` — ${a.path}` : ""}`);
    }
  }

  if (details.sessions.length > 0) {
    lines.push("", "## Agent Sessions");
    for (const s of details.sessions) {
      const ended = s.endedAt ?? "—";
      lines.push(
        `- [${s.role}] ${s.adapter} · ${s.status} · started ${s.startedAt} · ended ${ended}`,
      );
    }
  }

  lines.push("", "---", "Paste this report to an AI to diagnose the failure.");
  return lines.join("\n");
}
