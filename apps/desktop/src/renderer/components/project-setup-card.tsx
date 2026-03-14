import type { CreateProjectInput } from "@iamrobot/orchestration";
import type { Project } from "@iamrobot/protocol";
import { SectionCard } from "@iamrobot/ui";
import { type FormEvent, useState } from "react";

interface ProjectSetupCardProps {
  readonly busy: boolean;
  readonly error: string | null;
  readonly projects: readonly Project[];
  readonly selectedProjectId: Project["projectId"] | null;
  readonly onCreateProject: (input: CreateProjectInput) => Promise<void>;
  readonly onSelectProject: (projectId: Project["projectId"]) => Promise<void>;
}

export function ProjectSetupCard({
  busy,
  error,
  projects,
  selectedProjectId,
  onCreateProject,
  onSelectProject,
}: ProjectSetupCardProps) {
  const [showCreateForm, setShowCreateForm] = useState(projects.length === 0);
  const [projectName, setProjectName] = useState("");
  const [repoPath, setRepoPath] = useState("");

  const selectedProject =
    projects.find((project) => project.projectId === selectedProjectId) ?? null;

  async function handleBrowse() {
    const selectedDirectory = await window.iamRobot.selectDirectory();

    if (selectedDirectory === null) {
      return;
    }

    setRepoPath(selectedDirectory);

    if (projectName.trim().length === 0) {
      setProjectName(deriveProjectName(selectedDirectory));
    }
  }

  async function handleCreateProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const input: CreateProjectInput = {
      name: getRequiredValue(formData, "name"),
      repoPath: getRequiredValue(formData, "repoPath"),
      defaultBaseBranch: getRequiredValue(formData, "defaultBaseBranch"),
      defaultAllowedPaths: parseList(formData.get("defaultAllowedPaths")),
      verificationProfile: "default",
    };

    await onCreateProject(input);
    setProjectName("");
    setRepoPath("");
    setShowCreateForm(false);
  }

  return (
    <SectionCard eyebrow="Project" title="Choose a repository">
      <div style={{ display: "grid", gap: "1rem" }}>
        {projects.length > 0 ? (
          <label style={{ display: "grid", gap: "0.45rem" }}>
            <span style={labelStyle}>Saved projects</span>
            <select
              disabled={busy}
              onChange={(event) => void onSelectProject(event.target.value as Project["projectId"])}
              style={selectStyle}
              value={selectedProjectId ?? ""}
            >
              {projects.map((project) => (
                <option key={project.projectId} value={project.projectId}>
                  {project.name}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <p style={mutedCopyStyle}>
            Save a local repository as a project once, then reuse it when starting future runs.
          </p>
        )}

        {selectedProject ? (
          <div style={projectSummaryStyle}>
            <p style={summaryTitleStyle}>{selectedProject.name}</p>
            <p style={summaryPathStyle}>{selectedProject.repoPath}</p>
            <div style={summaryMetaRowStyle}>
              <span style={summaryPillStyle}>Branch: {selectedProject.defaultBaseBranch}</span>
              <span style={summaryPillStyle}>
                Verification: {selectedProject.verificationProfile}
              </span>
            </div>
          </div>
        ) : null}

        <button
          disabled={busy}
          onClick={() => setShowCreateForm((current) => !current)}
          style={secondaryButtonStyle}
          type="button"
        >
          {showCreateForm ? "Hide project form" : "Add project"}
        </button>

        {error ? (
          <p role="alert" style={errorStyle}>
            {error}
          </p>
        ) : null}

        {showCreateForm ? (
          <form
            onSubmit={(event) => void handleCreateProject(event)}
            style={{ display: "grid", gap: "0.85rem" }}
          >
            <label style={{ display: "grid", gap: "0.4rem" }}>
              <span style={labelStyle}>Project name</span>
              <input
                name="name"
                onChange={(event) => setProjectName(event.target.value)}
                placeholder="IAM Robot"
                required
                style={inputStyle}
                type="text"
                value={projectName}
              />
            </label>
            <label style={{ display: "grid", gap: "0.4rem" }}>
              <span style={labelStyle}>Repository path</span>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <input
                  name="repoPath"
                  onChange={(event) => setRepoPath(event.target.value)}
                  placeholder="/absolute/path/to/repository"
                  required
                  style={{ ...inputStyle, flex: 1 }}
                  type="text"
                  value={repoPath}
                />
                <button
                  disabled={busy}
                  onClick={() => void handleBrowse()}
                  style={browseButtonStyle}
                  type="button"
                >
                  Browse
                </button>
              </div>
            </label>
            <label style={{ display: "grid", gap: "0.4rem" }}>
              <span style={labelStyle}>Default base branch</span>
              <input
                defaultValue="main"
                name="defaultBaseBranch"
                placeholder="main"
                required
                style={inputStyle}
                type="text"
              />
            </label>
            <label style={{ display: "grid", gap: "0.4rem" }}>
              <span style={labelStyle}>Default allowed paths</span>
              <textarea
                name="defaultAllowedPaths"
                placeholder={"apps/desktop\npackages/ui"}
                rows={3}
                style={textAreaStyle}
              />
            </label>
            <button disabled={busy} style={primaryButtonStyle} type="submit">
              {busy ? "Saving project..." : "Save project"}
            </button>
          </form>
        ) : null}
      </div>
    </SectionCard>
  );
}

function deriveProjectName(repoPath: string): string {
  const normalizedPath = repoPath.replace(/\/+$/, "");
  const segments = normalizedPath.split("/");
  return segments.at(-1) || repoPath;
}

function getRequiredValue(formData: FormData, key: string): string {
  const value = formData.get(key);

  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`Missing required project field: ${key}`);
  }

  return value.trim();
}

function parseList(value: FormDataEntryValue | null): readonly string[] {
  if (typeof value !== "string") {
    return [];
  }

  return value
    .split("\n")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

const labelStyle = {
  color: "#94a3b8",
  fontSize: "0.72rem",
  fontWeight: 600,
  letterSpacing: "0.06em",
  textTransform: "uppercase" as const,
};

const mutedCopyStyle = {
  color: "#94a3b8",
  fontSize: "0.9rem",
  lineHeight: 1.5,
  margin: 0,
};

const inputStyle = {
  background: "rgba(15, 23, 42, 0.6)",
  border: "1px solid rgba(148, 163, 184, 0.20)",
  borderRadius: "var(--radius-md)",
  boxSizing: "border-box" as const,
  color: "#e2e8f0",
  font: "inherit",
  fontSize: "0.9rem",
  outline: "none",
  padding: "0.7rem 0.85rem",
  width: "100%",
};

const textAreaStyle = {
  ...inputStyle,
  minHeight: "5.5rem",
  resize: "vertical" as const,
};

const selectStyle = {
  ...inputStyle,
  appearance: "none" as const,
};

const projectSummaryStyle = {
  background: "rgba(15, 23, 42, 0.5)",
  border: "1px solid rgba(148, 163, 184, 0.16)",
  borderRadius: "var(--radius-md)",
  display: "grid",
  gap: "0.55rem",
  padding: "0.9rem 1rem",
};

const summaryTitleStyle = {
  color: "#e2e8f0",
  fontSize: "0.95rem",
  fontWeight: 700,
  margin: 0,
};

const summaryPathStyle = {
  color: "#94a3b8",
  fontFamily: "ui-monospace, monospace",
  fontSize: "0.75rem",
  margin: 0,
  wordBreak: "break-all" as const,
};

const summaryMetaRowStyle = {
  display: "flex",
  flexWrap: "wrap" as const,
  gap: "0.5rem",
};

const summaryPillStyle = {
  background: "rgba(14, 165, 233, 0.12)",
  border: "1px solid rgba(14, 165, 233, 0.2)",
  borderRadius: "999px",
  color: "#7dd3fc",
  fontSize: "0.72rem",
  padding: "0.25rem 0.55rem",
};

const primaryButtonStyle = {
  background: "rgba(14, 165, 233, 0.15)",
  border: "1px solid rgba(14, 165, 233, 0.45)",
  borderRadius: "var(--radius-md)",
  color: "#7dd3fc",
  cursor: "pointer",
  fontSize: "0.88rem",
  fontWeight: 600,
  padding: "0.75rem 1rem",
};

const secondaryButtonStyle = {
  background: "rgba(15, 23, 42, 0.72)",
  border: "1px solid rgba(148, 163, 184, 0.28)",
  borderRadius: "var(--radius-md)",
  color: "#cbd5e1",
  cursor: "pointer",
  font: "inherit",
  fontSize: "0.82rem",
  fontWeight: 600,
  padding: "0.7rem 0.95rem",
};

const browseButtonStyle = {
  background: "rgba(15, 23, 42, 0.72)",
  border: "1px solid rgba(148, 163, 184, 0.28)",
  borderRadius: "14px",
  color: "#94a3b8",
  cursor: "pointer",
  font: "inherit",
  fontSize: "0.82rem",
  fontWeight: 600,
  padding: "0.8rem 1rem",
  whiteSpace: "nowrap" as const,
};

const errorStyle = {
  background: "rgba(127, 29, 29, 0.25)",
  border: "1px solid rgba(248, 113, 113, 0.35)",
  borderRadius: "var(--radius-md)",
  color: "#fecaca",
  margin: 0,
  padding: "0.85rem 1rem",
};
