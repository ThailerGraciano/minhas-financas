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

export interface MidnightBaseTokens {
  bgPrincipal: string;
  bgSecundario: string;
  surface: string;
  surfaceElevated: string;
  hover: string;
  active: string;
  input: string;
  border: string;
  textPrincipal: string;
  textSecundario: string;
  textAuxiliar: string;
  textDesabilitado: string;
}

export interface ThemePreset {
  id: string;
  name: string;
  description: string;
  midnight: MidnightBaseTokens;
  accents: Record<TransactionTab, AccentColorConfig>;
}

/* ==========================================================================
   PALETAS / PRESETS DE CORES PRÉ-CONFIGURADOS
   ========================================================================== */

export const THEME_PRESETS: Record<string, ThemePreset> = {
  /**
   * 1. MIDNIGHT + ELECTRIC BLUE (Padrão Atual)
   * Base azul-escura profunda com Rosa Coral, Verde Menta e Azul Cobalto.
   */
  midnight_electric: {
    id: "midnight_electric",
    name: "Midnight + Electric Blue",
    description: "Visual padrão atual inspirado no C6 Bank com Apple Liquid Glass",
    midnight: {
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
    },
    accents: {
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
    },
  },

  /**
   * 2. CARBON & GOLD (C6 Bank Black Edition)
   * Base chumbo-escura com detalhes em Dourado, Rubro e Verde.
   */
  carbon_gold: {
    id: "carbon_gold",
    name: "Carbon & Gold",
    description: "Estilo sofisticado C6 Carbon com detalhes dourados",
    midnight: {
      bgPrincipal: "#0A0A0C",
      bgSecundario: "#121216",
      surface: "#18181E",
      surfaceElevated: "#202028",
      hover: "#282834",
      active: "#323242",
      input: "#14141A",
      border: "#2E2E3C",
      textPrincipal: "#F8FAFC",
      textSecundario: "#9CA3AF",
      textAuxiliar: "#6B7280",
      textDesabilitado: "#4B5563",
    },
    accents: {
      expense: {
        name: "Despesa",
        primary: "#F87171",
        hover: "#EF4444",
        active: "#DC2626",
        softBg: "#2B1A1E",
        elevatedBg: "#381C23",
        border: "#6E2D38",
        rgb: "248, 113, 113",
        glow: "rgba(248, 113, 113, 0.22)",
        subtleGlow: "rgba(248, 113, 113, 0.08)",
      },
      income: {
        name: "Receita",
        primary: "#FBBF24",
        hover: "#F59E0B",
        active: "#D97706",
        softBg: "#2B2416",
        elevatedBg: "#3B2E15",
        border: "#6E521D",
        rgb: "251, 191, 36",
        glow: "rgba(251, 191, 36, 0.22)",
        subtleGlow: "rgba(251, 191, 36, 0.08)",
      },
      transfer: {
        name: "Transferência",
        primary: "#93C5FD",
        hover: "#60A5FA",
        active: "#3B82F6",
        softBg: "#172338",
        elevatedBg: "#1B2C47",
        border: "#294D7D",
        rgb: "147, 197, 253",
        glow: "rgba(147, 197, 253, 0.22)",
        subtleGlow: "rgba(147, 197, 253, 0.08)",
      },
    },
  },

  /**
   * 3. EMERALD BANKING (Private Banking)
   * Base esmeralda-escura elegante com Menta, Rosa suave e Azul Turquesa.
   */
  emerald_banking: {
    id: "emerald_banking",
    name: "Emerald Banking",
    description: "Paleta verde-esmeralda sofisticada para bancos de investimento",
    midnight: {
      bgPrincipal: "#061311",
      bgSecundario: "#0A1C1A",
      surface: "#0F2623",
      surfaceElevated: "#15332F",
      hover: "#1D423D",
      active: "#25534D",
      input: "#0B1F1C",
      border: "#1E4741",
      textPrincipal: "#F0FDF4",
      textSecundario: "#A7F3D0",
      textAuxiliar: "#6EE7B7",
      textDesabilitado: "#34D399",
    },
    accents: {
      expense: {
        name: "Despesa",
        primary: "#FB7185",
        hover: "#F43F5E",
        active: "#E11D48",
        softBg: "#29171C",
        elevatedBg: "#381B23",
        border: "#6E2A3A",
        rgb: "251, 113, 133",
        glow: "rgba(251, 113, 133, 0.22)",
        subtleGlow: "rgba(251, 113, 133, 0.08)",
      },
      income: {
        name: "Receita",
        primary: "#10B981",
        hover: "#059669",
        active: "#047857",
        softBg: "#102922",
        elevatedBg: "#16382E",
        border: "#236352",
        rgb: "16, 185, 129",
        glow: "rgba(16, 185, 129, 0.22)",
        subtleGlow: "rgba(16, 185, 129, 0.08)",
      },
      transfer: {
        name: "Transferência",
        primary: "#38BDF8",
        hover: "#0EA5E9",
        active: "#0284C7",
        softBg: "#122736",
        elevatedBg: "#16364D",
        border: "#215B80",
        rgb: "56, 189, 248",
        glow: "rgba(56, 189, 248, 0.22)",
        subtleGlow: "rgba(56, 189, 248, 0.08)",
      },
    },
  },
};

/* ==========================================================================
   CONFIGURAÇÃO ATIVA DO SISTEMA
   Para mudar a paleta inteira, altere apenas a linha abaixo!
   ========================================================================== */
export const ACTIVE_THEME: ThemePreset = THEME_PRESETS.midnight_electric;

export const MIDNIGHT_TOKENS: MidnightBaseTokens = ACTIVE_THEME.midnight;
export const TRANSACTION_ACCENTS: Record<TransactionTab, AccentColorConfig> = ACTIVE_THEME.accents;

/** Retorna o accent do tipo de transação com garantia de tipagem estrita */
export function getTransactionAccent(tab: TransactionTab): AccentColorConfig {
  return TRANSACTION_ACCENTS[tab];
}
