export const Menu = {
  Home: 'home',
  Guestbook: 'guestbook',
  Gallery: 'gallery',
  Directions: 'directions',
} as const;

export type Menu = (typeof Menu)[keyof typeof Menu];
