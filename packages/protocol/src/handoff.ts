export const HANDOFF_SECTION_KEYS = [
  "PLAN",
  "ASSUMPTIONS",
  "CHANGES",
  "RISKS",
  "REQUESTED_ACTION",
] as const;

export type HandoffSectionKey = (typeof HANDOFF_SECTION_KEYS)[number];

export interface StructuredHandoff {
  readonly format: "tagged-sections";
  readonly sections: Readonly<Partial<Record<HandoffSectionKey, string>>>;
  readonly sectionOrder: readonly HandoffSectionKey[];
}

export interface StructuredHandoffSpec {
  readonly format: StructuredHandoff["format"];
  readonly requiredSections: readonly HandoffSectionKey[];
  readonly optionalSections: readonly HandoffSectionKey[];
}

export function createDefaultStructuredHandoffSpec(): StructuredHandoffSpec {
  return {
    format: "tagged-sections",
    requiredSections: HANDOFF_SECTION_KEYS,
    optionalSections: [],
  };
}

export function getStructuredHandoffSection(
  handoff: StructuredHandoff,
  key: HandoffSectionKey,
): string | undefined {
  return handoff.sections[key];
}
