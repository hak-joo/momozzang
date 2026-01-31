import type { CSSProperties } from 'react';
import type { ThemeColorOptions } from '@entities/WeddingInvitation/model';

// New Palette Definitions
const PALETTES: Record<'BASIC' | 'PURPLE' | 'PINK', Record<string, string>> = {
  BASIC: {
    '--color-basic-white': '#FFFFFF',
    '--color-basic-white50': 'rgba(255, 255, 255, 0.5)',
    '--color-basic-black': '#484848',
    '--color-basic-black50': 'rgba(0, 0, 0, 0.5)',
  },
  PURPLE: {
    // Main
    '--color-main-100': '#D5D2F6',
    '--color-main-200': '#D1CBE2',
    '--color-main-300': '#ACA4FF',
    '--color-main-400': '#967EB6',
    '--color-main-500': '#7871C2',
    '--color-main-600': '#5129B5',
    // Sub
    '--color-sub-100': '#F4FAFF',
    '--color-sub-200': '#EBF6FF',
    '--color-sub-300': '#C2E4FF',
    '--color-sub-400': '#A1CEFF',
    '--color-sub-500': '#95AEFF',
    '--color-sub-600': '#76A3FF',
    // Gradient
    '--color-gradient-start': '#ACA4FF', // 100%
    '--color-gradient-end': '#6AA3FF', // 100%
  },
  PINK: {
    // Main
    '--color-main-100': '#F6D2F1',
    '--color-main-200': '#E0CBE2',
    '--color-main-300': '#FF9FF1',
    '--color-main-400': '#B57EB6',
    '--color-main-500': '#B971C2',
    '--color-main-600': '#AB3783',
    // Sub
    '--color-sub-100': '#F9F4FF',
    '--color-sub-200': '#FDF1FF',
    '--color-sub-300': '#F6E0FF',
    '--color-sub-400': '#E3B2FF',
    '--color-sub-500': '#FFA5F1',
    '--color-sub-600': '#E77EFF',
    // Gradient (Placeholder - using Main 300 to 600 or similar if not specified, but usually derived.
    // For now, let's pick a pinkish gradient or leave same if generic.
    // Wait, the user didn't specify gradient for pink. I will use a reasonable default based on Main colors for now to avoid breaking.)
    '--color-gradient-start': '#FF9FF1',
    '--color-gradient-end': '#E77EFF',
  },
};

const THEME_HUES: Record<ThemeColorOptions, number> = {
  PURPLE: 270,
  GREEN: 120, // Deprecated but keeping for type safety if Enum exists
  BLUE: 210, // Deprecated
  PINK: 330,
};

/**
 * 테마 색상을 기반으로 CSS 변수 객체를 생성합니다.
 * @param themeColor 메인 테마 옵션 (Enum)
 * @returns CSSProperties 객체
 */
export function getThemeVariables(themeColor?: ThemeColorOptions): CSSProperties {
  // Default to PURPLE if undefined or not found (though defined themes are PURPLE/PINK)
  const safeTheme = themeColor === 'PINK' ? 'PINK' : 'PURPLE';
  const themeVars = PALETTES[safeTheme];

  return {
    ...PALETTES.BASIC,
    ...themeVars,
  } as CSSProperties;
}

export function getThemeHue(themeColor?: ThemeColorOptions): number {
  return themeColor ? THEME_HUES[themeColor] : PURPLE_HUE;
}

export const PURPLE_HUE = 270;
