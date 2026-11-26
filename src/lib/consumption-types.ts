export const CONSUMPTION_NATURES = [
  "recurring",
  "installment",
  "fixed",
  "extraordinary",
  "financial_movement",
  "individual_withdrawal",
  "unclassified",
] as const;

export type ConsumptionNature = (typeof CONSUMPTION_NATURES)[number];

export const DEFAULT_CONSUMPTION_NATURES = [
  "recurring",
  "fixed",
  "extraordinary",
  "financial_movement",
  "individual_withdrawal",
] as const;

export type DefaultConsumptionNature = (typeof DEFAULT_CONSUMPTION_NATURES)[number];

export const CLASSIFICATION_SOURCES = [
  "auto",
  "manual",
  "inherited_installment",
] as const;

export type ClassificationSource = (typeof CLASSIFICATION_SOURCES)[number];

export function isConsumptionNature(value: unknown): value is ConsumptionNature {
  return typeof value === "string" && (CONSUMPTION_NATURES as readonly string[]).includes(value);
}

export function isDefaultConsumptionNature(value: unknown): value is DefaultConsumptionNature {
  return typeof value === "string" && (DEFAULT_CONSUMPTION_NATURES as readonly string[]).includes(value);
}

export function isClassificationSource(value: unknown): value is ClassificationSource {
  return typeof value === "string" && (CLASSIFICATION_SOURCES as readonly string[]).includes(value);
}
