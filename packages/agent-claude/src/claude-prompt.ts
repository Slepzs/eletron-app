import type { StartAgentSessionInput } from "@iamrobot/agent-sdk";
import type { AgentRole } from "@iamrobot/protocol";

function formatAllowedPaths(cwd: string, allowedPaths: readonly string[]): string {
  if (allowedPaths.length === 0) {
    return `- Limit changes and reads to the current workspace: ${cwd}`;
  }

  const lines = allowedPaths.map((allowedPath) => `- ${allowedPath}`);
  return lines.join("\n");
}

function formatSectionList(sectionNames: readonly string[]): string {
  return sectionNames.map((sectionName) => `${sectionName}:`).join("\n");
}

function resolvePermissionMode(role: AgentRole): string {
  switch (role) {
    case "implementer":
      return "acceptEdits";
    case "planner":
    case "reviewer":
      return "plan";
  }
}

export function createClaudePrompt(input: StartAgentSessionInput): string {
  const allSections = [
    ...new Set([...input.handoff.requiredSections, ...input.handoff.optionalSections]),
  ];

  return [
    input.prompt.trim(),
    "",
    "Follow these execution constraints:",
    `- Role: ${input.role}`,
    `- Repository root: ${input.task.repoPath}`,
    `- Working directory: ${input.cwd}`,
    "- Do not write outside the allowed paths.",
    formatAllowedPaths(input.cwd, input.allowedPaths),
    "",
    "Return the final answer using tagged sections only.",
    "Use each section header exactly as written below and keep every section present, even if brief.",
    formatSectionList(allSections),
  ].join("\n");
}

export function createClaudeArgs(
  input: StartAgentSessionInput,
  cliSessionId: string,
  prompt: string,
  additionalDirectories: readonly string[],
  isResume: boolean,
): readonly string[] {
  const args = [
    "--print",
    "--verbose",
    "--output-format",
    "stream-json",
    "--permission-mode",
    resolvePermissionMode(input.role),
  ];

  if (isResume) {
    args.push("--resume", cliSessionId);
  } else {
    args.push("--session-id", cliSessionId);
  }

  if (additionalDirectories.length > 0) {
    args.push("--add-dir", ...additionalDirectories);
  }

  args.push(prompt);

  return args;
}
