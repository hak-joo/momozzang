import type { MapProviderKey, MapProviderSpec } from './types';

export function createMapProviders(params: {
  latitude: number;
  longitude: number;
  name: string;
}): Record<MapProviderKey, MapProviderSpec> {
  const { latitude, longitude, name } = params;
  const encodedName = encodeURIComponent(name);
  const lat = latitude.toFixed(6);
  const lng = longitude.toFixed(6);

  return {
    naver: {
      label: '네이버 지도',
      iosScheme: `nmap://route/car?dlat=${lat}&dlng=${lng}&dname=${encodedName}`,
      androidScheme: `nmap://route/car?dlat=${lat}&dlng=${lng}&dname=${encodedName}`,
      iosStore: 'https://apps.apple.com/kr/app/naver-map-navigation/id311867728',
      androidStore: 'https://play.google.com/store/apps/details?id=com.nhn.android.nmap',
      androidPackage: 'com.nhn.android.nmap',
      webFallback: `https://map.naver.com/v5/directions/${lng},${lat}`,
    },
    tmap: {
      label: '티맵 지도',
      iosScheme: `tmap://route?goalname=${encodedName}&goalx=${lng}&goaly=${lat}`,
      androidScheme: `tmap://route?goalname=${encodedName}&goalx=${lng}&goaly=${lat}`,
      iosStore: 'https://apps.apple.com/kr/app/t-map-내비게이션-운전대리/id431589174',
      androidStore: 'market://details?id=com.skt.tmap.ku',
      androidPackage: 'com.skt.tmap.ku',
    },
    kakaoNavi: {
      label: '카카오맵 지도',
      // Switch from kakaonavi to kakaomap for generic usage & better URL support
      iosScheme: `kakaomap://route?ep=${lat},${lng}&by=CAR`, 
      androidScheme: `kakaomap://route?ep=${lat},${lng}&by=CAR`,
      iosStore: 'https://apps.apple.com/kr/app/kakao-map/id304608425',
      androidStore: 'market://details?id=net.daum.android.map',
      androidPackage: 'net.daum.android.map',
      webFallback: `https://map.kakao.com/link/to/${encodedName},${lat},${lng}`,
    },
  };
}