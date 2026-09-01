import type { CSSProperties } from 'react';
import type { ThemeColorOptions } from '@entities/WeddingInvitation/model';

// New Palette Definitions
const PALETTES: Record<'BASIC' | ThemeColorOptions, Record<string, string>> = {
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
    '--color-shadow-100': 'rgba(176, 196, 255, 0.30)',
    '--color-shadow-200': 'rgba(51, 48, 255, 0.10)',
    '--box-shadow-main':
      '0 4px 4px 0 var(--color-shadow-100) inset, 0 -2px 12px 2px var(--color-shadow-200) inset',
    '--box-shadow-sub':
      '0 3.6px 3.6px 0 var(--color-shadow-100) inset, 0 -1.8px 10.8px 1.8px var(--color-shadow-200) inset',
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
    // Gradient
    '--color-gradient-start': '#FF9FF1',
    '--color-gradient-end': '#E77EFF',
    '--color-shadow-100': 'rgba(250, 176, 255, 0.30)',
    '--color-shadow-200': 'rgba(210, 48, 255, 0.10)',
    '--box-shadow-main':
      '0 4px 4px 0 var(--color-shadow-100) inset, 0 -2px 12px 2px var(--color-shadow-200) inset',
    '--box-shadow-sub':
      '0 3.6px 3.6px 0 var(--color-shadow-100) inset, 0 -1.8px 10.8px 1.8px var(--color-shadow-200) inset',
  },
  GREEN: {
    // Main
    '--color-main-100': '#D2F6D5',
    '--color-main-200': '#CBE2D1',
    '--color-main-300': '#A4FFAE',
    '--color-main-400': '#7EB68B',
    '--color-main-500': '#71C283',
    '--color-main-600': '#29B551',
    // Sub
    '--color-sub-100': '#F4FFF6',
    '--color-sub-200': '#EBFDF0',
    '--color-sub-300': '#C2FFD4',
    '--color-sub-400': '#A1FFBA',
    '--color-sub-500': '#95FFB2',
    '--color-sub-600': '#76FFA1',
    // Gradient
    '--color-gradient-start': '#A4FFAE',
    '--color-gradient-end': '#76FFA1',
    '--color-shadow-100': 'rgba(176, 255, 196, 0.30)',
    '--color-shadow-200': 'rgba(48, 255, 100, 0.10)',
    '--box-shadow-main':
      '0 4px 4px 0 var(--color-shadow-100) inset, 0 -2px 12px 2px var(--color-shadow-200) inset',
    '--box-shadow-sub':
      '0 3.6px 3.6px 0 var(--color-shadow-100) inset, 0 -1.8px 10.8px 1.8px var(--color-shadow-200) inset',
  },
  BLUE: {
    // Main
    '--color-main-100': '#D2E6F6',
    '--color-main-200': '#CBD7E2',
    '--color-main-300': '#A4D4FF',
    '--color-main-400': '#7E9DB6',
    '--color-main-500': '#7199C2',
    '--color-main-600': '#296EB5',
    // Sub
    '--color-sub-100': '#F4FAFF',
    '--color-sub-200': '#EBF4FF',
    '--color-sub-300': '#C2E0FF',
    '--color-sub-400': '#A1CCFF',
    '--color-sub-500': '#95BDFF',
    '--color-sub-600': '#76AAFF',
    // Gradient
    '--color-gradient-start': '#A4D4FF',
    '--color-gradient-end': '#76AAFF',
    '--color-shadow-100': 'rgba(176, 212, 255, 0.30)',
    '--color-shadow-200': 'rgba(48, 120, 255, 0.10)',
    '--box-shadow-main':
      '0 4px 4px 0 var(--color-shadow-100) inset, 0 -2px 12px 2px var(--color-shadow-200) inset',
    '--box-shadow-sub':
      '0 3.6px 3.6px 0 var(--color-shadow-100) inset, 0 -1.8px 10.8px 1.8px var(--color-shadow-200) inset',
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
  const safeTheme: ThemeColorOptions =
    themeColor && PALETTES[themeColor] ? themeColor : 'PURPLE';
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
