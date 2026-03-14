import type {
  HandoffSectionKey,
  StructuredHandoff,
  StructuredHandoffSpec,
} from "@iamrobot/protocol";

function createSectionPattern(sectionNames: readonly string[]): RegExp {
  const escapedSections = sectionNames.map((sectionName) =>
    sectionName.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&"),
  );

  return new RegExp(
    String.raw`^\s*(?:#{1,6}\s*)?(?:\*\*)?(?:\[)?(${escapedSections.join("|")})(?:\])?(?:\*\*)?\s*:?\s*(.*)$`,
    "u",
  );
}

function finalizeSectionContent(contentLines: readonly string[]): string {
  return contentLines.join("\n").trim();
}

export function parseStructuredHandoff(
  rawText: string,
  spec: StructuredHandoffSpec,
): StructuredHandoff | null {
  const allowedSections = [...spec.requiredSections, ...spec.optionalSections];
  const sectionPattern = createSectionPattern(allowedSections);
  const sections = new Map<HandoffSectionKey, string>();
  const sectionOrder: HandoffSectionKey[] = [];
  const lines = rawText.split(/\r?\n/u);

  let activeSection: HandoffSectionKey | null = null;
  let activeContent: string[] = [];

  for (const line of lines) {
    const match = line.match(sectionPattern);

    if (match === null) {
      if (activeSection !== null) {
        activeContent.push(line);
      }

      continue;
    }

    if (activeSection !== null) {
      sections.set(activeSection, finalizeSectionContent(activeContent));
    }

    const sectionName = match[1] as HandoffSectionKey;
    activeSection = sectionName;
    if (!sectionOrder.includes(activeSection)) {
      sectionOrder.push(activeSection);
    }
    const inlineContent = match[2] ?? "";
    activeContent = inlineContent.length > 0 ? [inlineContent] : [];
  }

  if (activeSection !== null) {
    sections.set(activeSection, finalizeSectionContent(activeContent));
  }

  const missingRequiredSection = spec.requiredSections.some(
    (sectionName) => !sections.has(sectionName),
  );

  if (missingRequiredSection) {
    return null;
  }

  return {
    format: "tagged-sections",
    sections: Object.fromEntries(sections) as StructuredHandoff["sections"],
    sectionOrder,
  };
}
