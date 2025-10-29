export const isIOS = () =>
  typeof navigator !== 'undefined' && /iphone|ipad|ipod/i.test(navigator.userAgent);

export const isAndroid = () =>
  typeof navigator !== 'undefined' && /android/i.test(navigator.userAgent);
