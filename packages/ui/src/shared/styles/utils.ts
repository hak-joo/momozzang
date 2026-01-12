import type { CSSProperties } from 'react';
import type { ThemeColorOptions } from '@entities/WeddingInvitation/model';

// Palette Definitions
const PALETTES: Record<ThemeColorOptions, Record<string, string>> = {
  PURPLE: {
    '--color-primary-base': '#a696ea',
    '--color-primary-strong': '#7f6dd9',
    '--color-primary-soft': '#c3b6f3',
    '--color-primary-text': '#512985',
    '--color-primary-desc': '#967eb6',
    '--color-primary-contrast': '#ffffff',
    '--color-primary-accent': '#95aeff',
    '--color-primary-border': '#aca4ff', // Border
    '--color-primary-medium': '#7871c2', // Medium
    '--color-primary-bg-light': '#ebe9ff', // Bg Light
    '--color-primary-bg-pale': '#F0E6FF', // Bg Pale
    '--color-disabled': '#d5d2f6',
  },
  GREEN: {
    '--color-primary-base': '#81C784', // Base
    '--color-primary-strong': '#66BB6A', // Strong
    '--color-primary-soft': '#A5D6A7', // Soft
    '--color-primary-text': '#1B5E20', // Text
    '--color-primary-desc': '#43A047', // Desc
    '--color-primary-contrast': '#ffffff',
    '--color-primary-accent': '#4CAF50', // Accent
    '--color-primary-border': '#81C784', // Border
    '--color-primary-medium': '#2E7D32', // Medium
    '--color-primary-bg-light': '#E8F5E9', // Bg Light
    '--color-primary-bg-pale': '#F1F8E9', // Bg Pale
    '--color-disabled': '#C8E6C9',
  },
  BLUE: {
    // Placeholder for future implementation
    '--color-primary-base': '#a696ea',
    '--color-primary-strong': '#7f6dd9',
    '--color-primary-soft': '#c3b6f3',
    '--color-primary-text': '#512985',
    '--color-primary-desc': '#967eb6',
    '--color-primary-contrast': '#ffffff',
    '--color-primary-accent': '#95aeff',
    '--color-primary-border': '#aca4ff',
    '--color-primary-medium': '#7871c2',
    '--color-primary-bg-light': '#ebe9ff',
    '--color-primary-bg-pale': '#F0E6FF',
    '--color-disabled': '#d5d2f6',
  },
  PINK: {
    // Placeholder for future implementation
    '--color-primary-base': '#a696ea',
    '--color-primary-strong': '#7f6dd9',
    '--color-primary-soft': '#c3b6f3',
    '--color-primary-text': '#512985',
    '--color-primary-desc': '#967eb6',
    '--color-primary-contrast': '#ffffff',
    '--color-primary-accent': '#95aeff',
    '--color-primary-border': '#aca4ff',
    '--color-primary-medium': '#7871c2',
    '--color-primary-bg-light': '#ebe9ff',
    '--color-primary-bg-pale': '#F0E6FF',
    '--color-disabled': '#d5d2f6',
  },
};

const THEME_HUES: Record<ThemeColorOptions, number> = {
  PURPLE: 270,
  GREEN: 120,
  BLUE: 210,
  PINK: 330,
};

/**
 * 테마 색상을 기반으로 CSS 변수 객체를 생성합니다.
 * @param themeColor 메인 테마 옵션 (Enum)
 * @returns CSSProperties 객체
 */
export function getThemeVariables(themeColor?: ThemeColorOptions): CSSProperties {
  const selectedTheme = themeColor ? PALETTES[themeColor] : PALETTES.PURPLE;
  return (selectedTheme || PALETTES.PURPLE) as CSSProperties;
}

export function getThemeHue(themeColor?: ThemeColorOptions): number {
  return themeColor ? THEME_HUES[themeColor] : 270;
}
