export interface SectionStyles {

    primary: string,
    secondary: string,
    background: string,
    surface: string,
    text: {
        primary: string,
        secondary: string,
        muted: string,
    },

}

export interface ThemeConfig {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  surface: string;
  text: {
    primary: string;
    secondary: string;
    muted: string;
  };
  fontFamily: string;
}

// Default light theme
export const DEFAULT_THEME: ThemeConfig = {
  primary: "#3B82F6", // blue-500
  secondary: "#1E40AF", // blue-700
  accent: "#F59E0B", // amber-500
  background: "#FFFFFF", // white
  surface: "#F9FAFB", // gray-50
  text: {
    primary: "#111827", // gray-900
    secondary: "#374151", // gray-700
    muted: "#6B7280", // gray-500
  },
  fontFamily: "Inter",
};

// Predefined theme options
export const THEME_PRESETS = {
  light: DEFAULT_THEME,
  blue: {
    ...DEFAULT_THEME,
    primary: "#3B82F6",
    secondary: "#1E40AF",
    accent: "#F59E0B",
  },
  green: {
    ...DEFAULT_THEME,
    primary: "#10B981",
    secondary: "#047857",
    accent: "#F59E0B",
  },
  purple: {
    ...DEFAULT_THEME,
    primary: "#8B5CF6",
    secondary: "#6D28D9",
    accent: "#F59E0B",
  },
  rose: {
    ...DEFAULT_THEME,
    primary: "#F43F5E",
    secondary: "#E11D48",
    accent: "#F59E0B",
  },
};