export interface ClaudeJsonStreamState {
  lineBuffer: string;
  readonly textCandidates: string[];
}

interface JsonObject {
  readonly [key: string]: unknown;
}

const TEXT_KEYS = [
  "completion",
  "content",
  "delta",
  "message",
  "output",
  "response",
  "result",
  "text",
];

function isJsonObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null;
}

function collectText(value: unknown, depth = 0): readonly string[] {
  if (depth > 6) {
    return [];
  }

  if (typeof value === "string") {
    return value.trim().length > 0 ? [value] : [];
  }

  if (Array.isArray(value)) {
    return value.flatMap((entry) => collectText(entry, depth + 1));
  }

  if (!isJsonObject(value)) {
    return [];
  }

  return TEXT_KEYS.flatMap((key) => collectText(value[key], depth + 1));
}

function toTextCandidate(value: unknown): string | undefined {
  const fragments = collectText(value)
    .map((fragment) => fragment.trim())
    .filter((fragment) => fragment.length > 0);

  if (fragments.length === 0) {
    return undefined;
  }

  return fragments.join("\n");
}

function addTextCandidate(streamState: ClaudeJsonStreamState, value: unknown): void {
  const candidate = toTextCandidate(value);

  if (
    candidate === undefined ||
    streamState.textCandidates[streamState.textCandidates.length - 1] === candidate
  ) {
    return;
  }

  streamState.textCandidates.push(candidate);
}

export function createClaudeJsonStreamState(): ClaudeJsonStreamState {
  return {
    lineBuffer: "",
    textCandidates: [],
  };
}

export function consumeClaudeStdoutChunk(streamState: ClaudeJsonStreamState, chunk: string): void {
  streamState.lineBuffer += chunk;

  const lines = streamState.lineBuffer.split(/\r?\n/u);
  streamState.lineBuffer = lines.pop() ?? "";

  for (const line of lines) {
    const trimmedLine = line.trim();

    if (trimmedLine.length === 0) {
      continue;
    }

    try {
      const parsed = JSON.parse(trimmedLine) as unknown;
      addTextCandidate(streamState, parsed);
    } catch {
      // Claude may occasionally emit non-JSON lines; keep streaming raw output regardless.
    }
  }
}

export function flushClaudeStdoutBuffer(streamState: ClaudeJsonStreamState): void {
  const remainder = streamState.lineBuffer.trim();

  if (remainder.length === 0) {
    streamState.lineBuffer = "";
    return;
  }

  try {
    const parsed = JSON.parse(remainder) as unknown;
    addTextCandidate(streamState, parsed);
  } catch {
    // Ignore trailing partial or non-JSON content.
  }

  streamState.lineBuffer = "";
}
