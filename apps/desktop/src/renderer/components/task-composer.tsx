import type { CreateTaskInput } from "@iamrobot/orchestration";
import { SectionCard } from "@iamrobot/ui";
import { type FormEvent, useState } from "react";

export interface TaskComposerProps {
  readonly busy: boolean;
  readonly error: string | null;
  readonly onSubmit: (input: CreateTaskInput) => Promise<void>;
}

export function TaskComposer({ busy, error, onSubmit }: TaskComposerProps) {
  const [repoPath, setRepoPath] = useState("");
  const [buttonHovered, setButtonHovered] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const input: CreateTaskInput = {
      repoPath: getRequiredValue(formData, "repoPath"),
      baseBranch: getRequiredValue(formData, "baseBranch"),
      goal: getRequiredValue(formData, "goal"),
      constraints: parseList(formData.get("constraints")),
      acceptanceCriteria: parseList(formData.get("acceptanceCriteria")),
      allowedPaths: parseList(formData.get("allowedPaths")),
    };

    await onSubmit(input);
  }

  async function handleBrowse() {
    const selected = await window.iamRobot.selectDirectory();
    if (selected !== null) {
      setRepoPath(selected);
    }
  }

  return (
    <SectionCard eyebrow="Task Creation" title="Start a run">
      <form onSubmit={(event) => void handleSubmit(event)} style={{ display: "grid", gap: "1rem" }}>
        <label style={{ display: "grid", gap: "0.45rem" }}>
          <span style={{ color: "#cbd5e1", fontSize: "0.82rem", fontWeight: 700 }}>Repository path</span>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <input
              name="repoPath"
              onChange={(e) => setRepoPath(e.target.value)}
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
        <Field
          autoComplete="off"
          defaultValue="main"
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
          label="Constraints"
          name="constraints"
          placeholder="One entry per line"
          rows={3}
        />
        <TextAreaField
          label="Acceptance criteria"
          name="acceptanceCriteria"
          placeholder="One entry per line"
          rows={3}
        />
        <TextAreaField
          label="Allowed paths"
          name="allowedPaths"
          placeholder={"apps/desktop\npackages/ui"}
          rows={2}
        />
        {error ? (
          <p
            role="alert"
            style={{
              background: "rgba(127, 29, 29, 0.25)",
              border: "1px solid rgba(248, 113, 113, 0.35)",
              borderRadius: "var(--radius-md)",
              color: "#fecaca",
              margin: 0,
              padding: "0.85rem 1rem",
            }}
          >
            {error}
          </p>
        ) : null}
        <button
          disabled={busy}
          onMouseEnter={() => setButtonHovered(true)}
          onMouseLeave={() => setButtonHovered(false)}
          style={{
            background: busy ? "rgba(14, 165, 233, 0.08)" : buttonHovered ? "rgba(14, 165, 233, 0.25)" : "rgba(14, 165, 233, 0.15)",
            border: busy ? "1px solid rgba(14, 165, 233, 0.25)" : buttonHovered ? "1px solid rgba(14, 165, 233, 0.7)" : "1px solid rgba(14, 165, 233, 0.45)",
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
      <span style={{ color: "#94a3b8", fontSize: "0.72rem", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase" }}>
        {label}
      </span>
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
          border: focused ? "1px solid rgba(56, 189, 248, 0.55)" : "1px solid rgba(148, 163, 184, 0.20)",
        }}
        type="text"
      />
    </label>
  );
}

interface TextAreaFieldProps {
  readonly label: string;
  readonly name: string;
  readonly placeholder: string;
  readonly rows: number;
}

function TextAreaField({ label, name, placeholder, rows }: TextAreaFieldProps) {
  const [focused, setFocused] = useState(false);
  return (
    <label style={{ display: "grid", gap: "0.4rem" }}>
      <span style={{ color: "#94a3b8", fontSize: "0.72rem", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase" }}>
        {label}
      </span>
      <textarea
        name={name}
        onBlur={() => setFocused(false)}
        onFocus={() => setFocused(true)}
        placeholder={placeholder}
        rows={rows}
        style={{
          ...textAreaStyle,
          background: focused ? "rgba(15, 23, 42, 0.9)" : "rgba(15, 23, 42, 0.6)",
          border: focused ? "1px solid rgba(56, 189, 248, 0.55)" : "1px solid rgba(148, 163, 184, 0.20)",
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

const inputStyle = {
  background: "rgba(15, 23, 42, 0.6)",
  border: "1px solid rgba(148, 163, 184, 0.20)",
  borderRadius: "var(--radius-md)",
  boxSizing: "border-box",
  color: "#e2e8f0",
  font: "inherit",
  fontSize: "0.9rem",
  outline: "none",
  padding: "0.7rem 0.85rem",
  transition: "border-color 150ms ease, background 150ms ease",
  width: "100%",
} as const;

const textAreaStyle = {
  ...inputStyle,
  minHeight: "5.5rem",
  resize: "vertical" as const,
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
  whiteSpace: "nowrap",
} as const;
