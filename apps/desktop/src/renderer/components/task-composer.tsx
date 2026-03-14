import type { CreateTaskInput } from "@iamrobot/orchestration";
import { SectionCard } from "@iamrobot/ui";
import type { FormEvent } from "react";

export interface TaskComposerProps {
  readonly busy: boolean;
  readonly error: string | null;
  readonly onSubmit: (input: CreateTaskInput) => Promise<void>;
}

export function TaskComposer({ busy, error, onSubmit }: TaskComposerProps) {
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

  return (
    <SectionCard eyebrow="Task Creation" title="Start a run">
      <form onSubmit={(event) => void handleSubmit(event)} style={{ display: "grid", gap: "1rem" }}>
        <Field
          autoComplete="off"
          defaultValue=""
          label="Repository path"
          name="repoPath"
          placeholder="/absolute/path/to/repository"
          required
        />
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
          rows={4}
        />
        <TextAreaField
          label="Acceptance criteria"
          name="acceptanceCriteria"
          placeholder="One entry per line"
          rows={4}
        />
        <TextAreaField
          label="Allowed paths"
          name="allowedPaths"
          placeholder={"apps/desktop\npackages/ui"}
          rows={3}
        />
        {error ? (
          <p
            role="alert"
            style={{
              background: "rgba(127, 29, 29, 0.25)",
              border: "1px solid rgba(248, 113, 113, 0.35)",
              borderRadius: "14px",
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
          style={{
            background: "linear-gradient(135deg, #0284c7, #0f766e)",
            border: "none",
            borderRadius: "999px",
            color: "#f8fafc",
            cursor: busy ? "wait" : "pointer",
            fontSize: "0.92rem",
            fontWeight: 700,
            padding: "0.9rem 1.1rem",
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
  return (
    <label style={{ display: "grid", gap: "0.45rem" }}>
      <span style={{ color: "#cbd5e1", fontSize: "0.82rem", fontWeight: 700 }}>{label}</span>
      <input
        autoComplete={autoComplete}
        defaultValue={defaultValue}
        name={name}
        placeholder={placeholder}
        required={required}
        style={inputStyle}
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
  return (
    <label style={{ display: "grid", gap: "0.45rem" }}>
      <span style={{ color: "#cbd5e1", fontSize: "0.82rem", fontWeight: 700 }}>{label}</span>
      <textarea name={name} placeholder={placeholder} rows={rows} style={textAreaStyle} />
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
  background: "rgba(15, 23, 42, 0.72)",
  border: "1px solid rgba(148, 163, 184, 0.28)",
  borderRadius: "14px",
  color: "#e2e8f0",
  font: "inherit",
  padding: "0.8rem 0.9rem",
} as const;

const textAreaStyle = {
  ...inputStyle,
  minHeight: "6.5rem",
  resize: "vertical" as const,
};
