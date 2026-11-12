export type TransactionTab = "expense" | "income" | "transfer";

export interface AccentColorConfig {
  name: string;
  primary: string;
  hover: string;
  active: string;
  softBg: string;
  elevatedBg: string;
  border: string;
  rgb: string;
  glow: string;
  subtleGlow: string;
}

export const MIDNIGHT_TOKENS = {
  bgPrincipal: "#0B1220",
  bgSecundario: "#0E1726",
  surface: "#111A2A",
  surfaceElevated: "#151F31",
  hover: "#1C293D",
  active: "#24344C",
  input: "#101A2A",
  border: "#29384E",
  textPrincipal: "#F2F5FA",
  textSecundario: "#A7B3C5",
  textAuxiliar: "#718096",
  textDesabilitado: "#526176",
} as const;

export const TRANSACTION_ACCENTS: Record<TransactionTab, AccentColorConfig> = {
  expense: {
    name: "Despesa",
    primary: "#FF7185",
    hover: "#FF8999",
    active: "#E85C72",
    softBg: "#2A1924",
    elevatedBg: "#351D2B",
    border: "#713747",
    rgb: "255, 113, 133",
    glow: "rgba(255, 113, 133, 0.22)",
    subtleGlow: "rgba(255, 113, 133, 0.08)",
  },
  income: {
    name: "Receita",
    primary: "#42D6A0",
    hover: "#62E2B3",
    active: "#2DB98A",
    softBg: "#132A28",
    elevatedBg: "#17382F",
    border: "#28634F",
    rgb: "66, 214, 160",
    glow: "rgba(66, 214, 160, 0.22)",
    subtleGlow: "rgba(66, 214, 160, 0.08)",
  },
  transfer: {
    name: "Transferência",
    primary: "#639BFF",
    hover: "#80ADFF",
    active: "#477FE0",
    softBg: "#18263A",
    elevatedBg: "#1C304B",
    border: "#304E78",
    rgb: "99, 155, 255",
    glow: "rgba(99, 155, 255, 0.22)",
    subtleGlow: "rgba(99, 155, 255, 0.08)",
  },
};

