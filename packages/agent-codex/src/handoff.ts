import type {
  HandoffSectionKey,
  StructuredHandoff,
  StructuredHandoffSpec,
} from "@iamrobot/protocol";

export function parseStructuredHandoff(
  rawText: string,
  spec: StructuredHandoffSpec,
): StructuredHandoff | undefined {
  const allowedKeys = getAllowedSectionKeys(spec);
  const allowedKeySet = new Set<HandoffSectionKey>(allowedKeys);
  const sections: Partial<Record<HandoffSectionKey, string>> = {};
  const sectionOrder: HandoffSectionKey[] = [];
  let currentKey: HandoffSectionKey | undefined;
  let currentLines: string[] = [];

  const flushCurrentSection = (): void => {
    if (!currentKey) {
      return;
    }

    sections[currentKey] = normalizeSectionContent(currentLines);
    currentKey = undefined;
    currentLines = [];
  };

  for (const rawLine of rawText.split(/\r?\n/u)) {
    const sectionMatch = /^([A-Z_]+):(.*)$/u.exec(rawLine.trimEnd());

    if (!sectionMatch) {
      if (currentKey) {
        currentLines.push(rawLine);
      }

      continue;
    }

    const nextKey = sectionMatch[1] as HandoffSectionKey;

    if (!allowedKeySet.has(nextKey)) {
      if (currentKey) {
        currentLines.push(rawLine);
      }

      continue;
    }

    flushCurrentSection();
    currentKey = nextKey;
    sectionOrder.push(nextKey);
    const inlineContent = (sectionMatch[2] ?? "").trim();
    currentLines = inlineContent.length > 0 ? [inlineContent] : [];
  }

  flushCurrentSection();

  if (spec.requiredSections.some((key) => !(key in sections))) {
    return undefined;
  }

  return {
    format: spec.format,
    sections,
    sectionOrder,
  };
}

export function buildCodexPrompt(prompt: string, spec: StructuredHandoffSpec): string {
  const sectionList = getAllowedSectionKeys(spec);
  const trimmedPrompt = prompt.trim();
  const instructionLines = [
    "Respond using tagged sections exactly once and in this order.",
    "Keep each header uppercase and followed by a colon.",
    "If a section has nothing to report, write `None.` for that section.",
    ...sectionList.map((section) => `${section}:`),
  ];

  return trimmedPrompt.length === 0
    ? instructionLines.join("\n")
    : `${trimmedPrompt}\n\n${instructionLines.join("\n")}`;
}

function getAllowedSectionKeys(spec: StructuredHandoffSpec): readonly HandoffSectionKey[] {
  return [...new Set([...spec.requiredSections, ...spec.optionalSections])];
}

function normalizeSectionContent(lines: readonly string[]): string {
  return lines.join("\n").trim();
}
