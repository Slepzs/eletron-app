import type { CreateTaskInput } from "@iamrobot/orchestration";
import type { Project } from "@iamrobot/protocol";
import { SectionCard } from "@iamrobot/ui";
import { type FormEvent, useState } from "react";

export interface TaskComposerProps {
  readonly busy: boolean;
  readonly error: string | null;
  readonly selectedProject: Project | null;
  readonly onSubmit: (input: CreateTaskInput) => Promise<void>;
}

export function TaskComposer({ busy, error, selectedProject, onSubmit }: TaskComposerProps) {
  const [buttonHovered, setButtonHovered] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (selectedProject === null) {
      throw new Error("Select a project before creating a task.");
    }

    const formData = new FormData(event.currentTarget);
    const input: CreateTaskInput = {
      repoPath: selectedProject.repoPath,
      baseBranch: getRequiredValue(formData, "baseBranch"),
      goal: getRequiredValue(formData, "goal"),
      constraints: parseList(formData.get("constraints")),
      acceptanceCriteria: parseList(formData.get("acceptanceCriteria")),
      allowedPaths: parseList(formData.get("allowedPaths")),
      verificationProfile: selectedProject.verificationProfile,
    };

    await onSubmit(input);
  }

  return (
    <SectionCard eyebrow="Task Creation" title="Start a run">
      {selectedProject === null ? (
        <p style={emptyStateStyle}>
          Select a saved project first. Task creation will reuse its repository path and defaults.
        </p>
      ) : (
        <form
          key={selectedProject.projectId}
          onSubmit={(event) => void handleSubmit(event)}
          style={{ display: "grid", gap: "1rem" }}
        >
          <div style={projectReferenceStyle}>
            <span style={projectNameStyle}>{selectedProject.name}</span>
            <span style={projectPathStyle}>{selectedProject.repoPath}</span>
          </div>
          <Field
            autoComplete="off"
            defaultValue={selectedProject.defaultBaseBranch}
            label="Base branch"
            name="baseBranch"
            placeholder="main"
            required
          />
          <Field
            autoComplete="off"
            defaultValue=""
            label="Goal"
            name="goal"
            placeholder="Implement the next phase of work"
            required
          />
          <TextAreaField
            defaultValue=""
            label="Constraints"
            name="constraints"
            placeholder="One entry per line"
            rows={3}
          />
          <TextAreaField
            defaultValue=""
            label="Acceptance criteria"
            name="acceptanceCriteria"
            placeholder="One entry per line"
            rows={3}
          />
          <TextAreaField
            defaultValue={selectedProject.defaultAllowedPaths.join("\n")}
            label="Allowed paths"
            name="allowedPaths"
            placeholder={"apps/desktop\npackages/ui"}
            rows={2}
          />
          {error ? (
            <p role="alert" style={errorStyle}>
              {error}
            </p>
          ) : null}
          <button
            disabled={busy}
            onMouseEnter={() => setButtonHovered(true)}
            onMouseLeave={() => setButtonHovered(false)}
            style={{
              background: busy
                ? "rgba(14, 165, 233, 0.08)"
                : buttonHovered
                  ? "rgba(14, 165, 233, 0.25)"
                  : "rgba(14, 165, 233, 0.15)",
              border: busy
                ? "1px solid rgba(14, 165, 233, 0.25)"
                : buttonHovered
                  ? "1px solid rgba(14, 165, 233, 0.7)"
                  : "1px solid rgba(14, 165, 233, 0.45)",
              borderRadius: "var(--radius-md)",
              color: busy ? "rgba(125, 211, 252, 0.5)" : "#7dd3fc",
              cursor: busy ? "not-allowed" : "pointer",
              fontSize: "0.88rem",
              fontWeight: 600,
              letterSpacing: "0.04em",
              opacity: busy ? 0.6 : 1,
              padding: "0.75rem 1rem",
              transition: "background 150ms ease, border-color 150ms ease",
            }}
            type="submit"
          >
            {busy ? "Starting run..." : "Create task and start run"}
          </button>
        </form>
      )}
    </SectionCard>
  );
}

interface FieldProps {
  readonly autoComplete: string;
  readonly defaultValue: string;
  readonly label: string;
  readonly name: string;
  readonly placeholder: string;
  readonly required?: boolean;
}

function Field({ autoComplete, defaultValue, label, name, placeholder, required }: FieldProps) {
  const [focused, setFocused] = useState(false);

  return (
    <label style={{ display: "grid", gap: "0.4rem" }}>
      <span style={labelStyle}>{label}</span>
      <input
        autoComplete={autoComplete}
        defaultValue={defaultValue}
        name={name}
        onBlur={() => setFocused(false)}
        onFocus={() => setFocused(true)}
        placeholder={placeholder}
        required={required}
        style={{
          ...inputStyle,
          background: focused ? "rgba(15, 23, 42, 0.9)" : "rgba(15, 23, 42, 0.6)",
          border: focused
            ? "1px solid rgba(56, 189, 248, 0.55)"
            : "1px solid rgba(148, 163, 184, 0.20)",
        }}
        type="text"
      />
    </label>
  );
}

interface TextAreaFieldProps {
  readonly defaultValue: string;
  readonly label: string;
  readonly name: string;
  readonly placeholder: string;
  readonly rows: number;
}

function TextAreaField({ defaultValue, label, name, placeholder, rows }: TextAreaFieldProps) {
  const [focused, setFocused] = useState(false);

  return (
    <label style={{ display: "grid", gap: "0.4rem" }}>
      <span style={labelStyle}>{label}</span>
      <textarea
        defaultValue={defaultValue}
        name={name}
        onBlur={() => setFocused(false)}
        onFocus={() => setFocused(true)}
        placeholder={placeholder}
        rows={rows}
        style={{
          ...textAreaStyle,
          background: focused ? "rgba(15, 23, 42, 0.9)" : "rgba(15, 23, 42, 0.6)",
          border: focused
            ? "1px solid rgba(56, 189, 248, 0.55)"
            : "1px solid rgba(148, 163, 184, 0.20)",
        }}
      />
    </label>
  );
}

function getRequiredValue(formData: FormData, key: string): string {
  const value = formData.get(key);

  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`Missing required task field: ${key}`);
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
  transition: "border-color 150ms ease, background 150ms ease",
  width: "100%",
};

const textAreaStyle = {
  ...inputStyle,
  minHeight: "5.5rem",
  resize: "vertical" as const,
};

const projectReferenceStyle = {
  background: "rgba(15, 23, 42, 0.5)",
  border: "1px solid rgba(148, 163, 184, 0.16)",
  borderRadius: "var(--radius-md)",
  display: "grid",
  gap: "0.35rem",
  padding: "0.85rem 1rem",
};

const projectNameStyle = {
  color: "#e2e8f0",
  fontSize: "0.9rem",
  fontWeight: 700,
};

const projectPathStyle = {
  color: "#94a3b8",
  fontFamily: "ui-monospace, monospace",
  fontSize: "0.75rem",
  wordBreak: "break-all" as const,
};

const emptyStateStyle = {
  color: "#94a3b8",
  fontSize: "0.9rem",
  lineHeight: 1.5,
  margin: 0,
};

const errorStyle = {
  background: "rgba(127, 29, 29, 0.25)",
  border: "1px solid rgba(248, 113, 113, 0.35)",
  borderRadius: "var(--radius-md)",
  color: "#fecaca",
  margin: 0,
  padding: "0.85rem 1rem",
};
