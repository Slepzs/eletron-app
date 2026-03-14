import { execFile } from "node:child_process";
import { mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { promisify } from "node:util";

import type {
  BranchIntegrationResult,
  CherryPickBranchIntoWorktreeInput,
  IntegrateBranchInput,
  MergeBranchIntoWorktreeInput,
  PreparedWorktree,
  PrepareWorktreeInput,
  RemoveWorktreeInput,
} from "./contracts.js";
import { createWorktreePlan } from "./helpers.js";

const execFileAsync = promisify(execFile);

interface GitCommandFailureOptions {
  readonly cwd: string;
  readonly args: readonly string[];
  readonly stdout: string;
  readonly stderr: string;
  readonly cause?: unknown;
}

interface GitWorktreeRecord {
  readonly path: string;
  readonly headRevision?: string;
  readonly branchName?: string;
  readonly isDetached: boolean;
}

export class GitCommandError extends Error {
  readonly cwd: string;
  readonly args: readonly string[];
  readonly stdout: string;
  readonly stderr: string;

  constructor(message: string, options: GitCommandFailureOptions) {
    super(message, { cause: options.cause });
    this.name = "GitCommandError";
    this.cwd = options.cwd;
    this.args = options.args;
    this.stdout = options.stdout;
    this.stderr = options.stderr;
  }
}

export async function prepareIsolatedWorktree(
  input: PrepareWorktreeInput,
): Promise<PreparedWorktree> {
  const plan = createWorktreePlan(input);
  const existingWorktree = await findWorktreeByPath(input.repoPath, plan.worktreePath);

  if (existingWorktree) {
    if (existingWorktree.branchName && existingWorktree.branchName !== plan.branchName) {
      throw new Error(
        `Worktree path ${plan.worktreePath} is already attached to ${existingWorktree.branchName}.`,
      );
    }

    return {
      ...plan,
      repoPath: input.repoPath,
      baseBranch: input.baseBranch,
      headRevision: existingWorktree.headRevision ?? (await getHeadRevision(plan.worktreePath)),
      created: false,
    };
  }

  await mkdir(dirname(plan.worktreePath), { recursive: true });

  if (await branchExists(input.repoPath, plan.branchName)) {
    await runGit(input.repoPath, ["worktree", "add", plan.worktreePath, plan.branchName]);
  } else {
    await runGit(input.repoPath, [
      "worktree",
      "add",
      "-b",
      plan.branchName,
      plan.worktreePath,
      input.baseBranch,
    ]);
  }

  return {
    ...plan,
    repoPath: input.repoPath,
    baseBranch: input.baseBranch,
    headRevision: await getHeadRevision(plan.worktreePath),
    created: true,
  };
}

export async function removeWorktree(input: RemoveWorktreeInput): Promise<void> {
  const force = input.force ?? false;
  const existingWorktree = await findWorktreeByPath(input.repoPath, input.worktreePath);

  if (existingWorktree) {
    const removeArgs = ["worktree", "remove"];

    if (force) {
      removeArgs.push("--force");
    }

    removeArgs.push(input.worktreePath);
    await runGit(input.repoPath, removeArgs);
    await runGit(input.repoPath, ["worktree", "prune"]);
  }

  if (
    input.removeBranch &&
    input.branchName &&
    (await branchExists(input.repoPath, input.branchName))
  ) {
    await runGit(input.repoPath, ["branch", force ? "-D" : "-d", input.branchName]);
  }
}

export async function mergeBranchIntoWorktree(
  input: MergeBranchIntoWorktreeInput,
): Promise<BranchIntegrationResult> {
  await runGit(input.worktreePath, ["merge", "--no-ff", "--no-edit", input.sourceBranch]);

  const targetBranch = await getCurrentBranch(input.worktreePath);

  return {
    strategy: "merge",
    worktreePath: input.worktreePath,
    sourceBranch: input.sourceBranch,
    targetBranch,
    headRevision: await getHeadRevision(input.worktreePath),
    appliedCommitShas: [],
  };
}

export async function cherryPickBranchIntoWorktree(
  input: CherryPickBranchIntoWorktreeInput,
): Promise<BranchIntegrationResult> {
  const commitShas = await listBranchCommits(
    input.repoPath,
    input.targetBranch,
    input.sourceBranch,
  );

  if (commitShas.length > 0) {
    await runGit(input.worktreePath, ["cherry-pick", ...commitShas]);
  }

  return {
    strategy: "cherry-pick",
    worktreePath: input.worktreePath,
    sourceBranch: input.sourceBranch,
    targetBranch: input.targetBranch,
    headRevision: await getHeadRevision(input.worktreePath),
    appliedCommitShas: commitShas,
  };
}

export async function integrateBranch(
  input: IntegrateBranchInput,
): Promise<BranchIntegrationResult> {
  switch (input.strategy) {
    case "merge":
      return mergeBranchIntoWorktree({
        worktreePath: input.worktreePath,
        sourceBranch: input.sourceBranch,
      });
    case "cherry-pick":
      return cherryPickBranchIntoWorktree(input);
  }
}

export async function listBranchCommits(
  repoPath: string,
  targetBranch: string,
  sourceBranch: string,
): Promise<readonly string[]> {
  const stdout = await runGit(repoPath, [
    "rev-list",
    "--reverse",
    `${targetBranch}..${sourceBranch}`,
  ]);

  return stdout
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

async function branchExists(repoPath: string, branchName: string): Promise<boolean> {
  try {
    await runGit(repoPath, ["rev-parse", "--verify", `refs/heads/${branchName}`]);
    return true;
  } catch (error) {
    if (error instanceof GitCommandError) {
      return false;
    }

    throw error;
  }
}

async function findWorktreeByPath(
  repoPath: string,
  worktreePath: string,
): Promise<GitWorktreeRecord | undefined> {
  const normalizedWorktreePath = resolve(worktreePath);
  const worktrees = await listWorktrees(repoPath);

  return worktrees.find((worktree) => worktree.path === normalizedWorktreePath);
}

async function listWorktrees(repoPath: string): Promise<readonly GitWorktreeRecord[]> {
  const stdout = await runGit(repoPath, ["worktree", "list", "--porcelain"]);
  return parseGitWorktreeList(stdout);
}

function parseGitWorktreeList(stdout: string): readonly GitWorktreeRecord[] {
  const records: GitWorktreeRecord[] = [];
  let currentRecord: {
    path?: string;
    headRevision?: string;
    branchName?: string;
    isDetached: boolean;
  } = {
    isDetached: false,
  };

  for (const rawLine of stdout.split("\n")) {
    const line = rawLine.trim();

    if (line.length === 0) {
      if (currentRecord.path) {
        records.push(
          createGitWorktreeRecord({
            path: currentRecord.path,
            headRevision: currentRecord.headRevision,
            branchName: currentRecord.branchName,
            isDetached: currentRecord.isDetached,
          }),
        );
      }

      currentRecord = { isDetached: false };
      continue;
    }

    if (line.startsWith("worktree ")) {
      currentRecord.path = resolve(line.slice("worktree ".length));
      continue;
    }

    if (line.startsWith("HEAD ")) {
      currentRecord.headRevision = line.slice("HEAD ".length);
      continue;
    }

    if (line.startsWith("branch ")) {
      currentRecord.branchName = normalizeBranchRef(line.slice("branch ".length));
      continue;
    }

    if (line === "detached") {
      currentRecord.isDetached = true;
    }
  }

  if (currentRecord.path) {
    records.push(
      createGitWorktreeRecord({
        path: currentRecord.path,
        headRevision: currentRecord.headRevision,
        branchName: currentRecord.branchName,
        isDetached: currentRecord.isDetached,
      }),
    );
  }

  return records;
}

function createGitWorktreeRecord(record: {
  path: string;
  headRevision: string | undefined;
  branchName: string | undefined;
  isDetached: boolean;
}): GitWorktreeRecord {
  return {
    path: record.path,
    ...(record.headRevision ? { headRevision: record.headRevision } : {}),
    ...(record.branchName ? { branchName: record.branchName } : {}),
    isDetached: record.isDetached,
  };
}

function normalizeBranchRef(ref: string): string {
  const headsPrefix = "refs/heads/";

  if (ref.startsWith(headsPrefix)) {
    return ref.slice(headsPrefix.length);
  }

  return ref;
}

async function getCurrentBranch(worktreePath: string): Promise<string> {
  return (await runGit(worktreePath, ["branch", "--show-current"])).trim();
}

async function getHeadRevision(worktreePath: string): Promise<string> {
  return (await runGit(worktreePath, ["rev-parse", "HEAD"])).trim();
}

async function runGit(cwd: string, args: readonly string[]): Promise<string> {
  try {
    const result = await execFileAsync("git", [...args], {
      cwd,
      encoding: "utf8",
    });

    return result.stdout.trim();
  } catch (error) {
    const stdout = getCommandOutput(error, "stdout");
    const stderr = getCommandOutput(error, "stderr");
    const command = ["git", ...args].join(" ");

    throw new GitCommandError(`Git command failed: ${command}`, {
      cwd,
      args,
      stdout,
      stderr,
      cause: error,
    });
  }
}

function getCommandOutput(error: unknown, key: "stderr" | "stdout"): string {
  if (
    typeof error === "object" &&
    error !== null &&
    key in error &&
    typeof (error as Record<"stderr" | "stdout", unknown>)[key] === "string"
  ) {
    return ((error as Record<"stderr" | "stdout", string>)[key] ?? "").trim();
  }

  return "";
}
