export type MapProviderKey = 'naver' | 'tmap' | 'kakaoNavi';

export type MapProviderSpec = {
  label: string;
  iosScheme?: string;
  androidScheme?: string;
  iosStore?: string;
  androidStore?: string;
  androidPackage?: string;
  webFallback?: string;
};
