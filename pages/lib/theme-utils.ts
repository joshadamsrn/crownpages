import { ThemeConfig, THEME_PRESETS } from '@/types';

/**
 * Get a predefined theme by name
 */
export function getThemeByName(themeName: string): ThemeConfig {
  return THEME_PRESETS[themeName as keyof typeof THEME_PRESETS] || THEME_PRESETS.light;
}

/**
 * Create a custom theme from business colors
 */
export function createCustomTheme(
  primaryColor?: string | null,
  secondaryColor?: string | null,
  fontFamily?: string | null
): ThemeConfig {
  const baseTheme = THEME_PRESETS.light;

  return {
    ...baseTheme,
    primary: primaryColor || baseTheme.primary,
    secondary: secondaryColor || baseTheme.secondary,
    fontFamily: fontFamily || baseTheme.fontFamily,
  };
}

/**
 * Validate if a color is a valid hex color
 */
export function isValidHexColor(color: string): boolean {
  return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color);
}

/**
 * Get available theme names
 */
export function getAvailableThemes(): string[] {
  return Object.keys(THEME_PRESETS);
}

/**
 * Generate CSS variables string from theme
 */
export function themeToCSSVariables(theme: ThemeConfig): string {
  return `
    --primary-color: ${theme.primary};
    --secondary-color: ${theme.secondary};
    --accent-color: ${theme.accent};
    --background-color: ${theme.background};
    --surface-color: ${theme.surface};
    --text-primary: ${theme.text.primary};
    --text-secondary: ${theme.text.secondary};
    --text-muted: ${theme.text.muted};
    --font-family: ${theme.fontFamily};
  `.trim();
} 