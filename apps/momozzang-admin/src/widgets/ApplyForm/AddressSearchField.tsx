import { useState } from 'react';
import { Input } from '@momozzang/ui/src/shared/ui/Input/Input';
import { KakaoMap } from '@momozzang/ui/src/shared/ui/KakaoMap';
import {
  searchPlaces,
  KakaoPlacesUnavailableError,
  KakaoNoResultError,
  type PlaceResult,
} from '@momozzang/ui/src/shared/ui/KakaoMap';
import type { WeddingInvitation } from '@momozzang/ui/src/entities/WeddingInvitation/model';
import styles from './ApplyForm.module.css';

type WeddingHallInfo = WeddingInvitation['weddingHallInfo'];

interface Props {
  address: string;
  latitude: number;
  longitude: number;
  hallName: string;
  onChange: (patch: Partial<WeddingHallInfo>) => void;
}

type SearchStatus =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'results' }
  | { kind: 'error'; message: string };

/**
 * 장소(POI) 검색 → 후보 선택 → 자동 좌표 (F5).
 * - 장소명을 입력해 검색하면 후보 목록(장소명 + 도로명주소)이 뜨고,
 *   항목을 클릭하면 address/latitude/longitude 를 한 번에 patch 한다.
 * - hallName 이 비어 있으면 placeName 으로 비파괴적으로 보조 채움.
 * - 키/도메인 미등록·무결과 시 안내 문구를 띄우되, 주소·좌표 수동 입력 경로는 그대로 유지한다
 *   (장소 검색 실패가 폼 저장을 막지 않음).
 */
export function AddressSearchField({ address, latitude, longitude, hallName, onChange }: Props) {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<SearchStatus>({ kind: 'idle' });
  const [results, setResults] = useState<PlaceResult[]>([]);
  const hasCoords = Number.isFinite(latitude) && Number.isFinite(longitude);

  const handleSearch = async () => {
    const keyword = query.trim();
    if (!keyword) {
      setStatus({ kind: 'error', message: '먼저 검색할 장소명을 입력해 주세요.' });
      return;
    }
    setStatus({ kind: 'loading' });
    setResults([]);
    try {
      const places = await searchPlaces(keyword);
      setResults(places);
      setStatus({ kind: 'results' });
    } catch (err) {
      const message =
        err instanceof KakaoPlacesUnavailableError
          ? `${err.message} 아래에 주소와 위도/경도를 직접 입력해 저장할 수 있어요.`
          : err instanceof KakaoNoResultError
            ? err.message
            : err instanceof Error
              ? `${err.message} 주소·좌표를 직접 입력해 저장할 수 있어요.`
              : '장소 검색에 실패했어요. 직접 입력해 주세요.';
      setStatus({ kind: 'error', message });
    }
  };

  const handleSelect = (place: PlaceResult) => {
    const patch: Partial<WeddingHallInfo> = {
      address: place.roadAddress || place.address,
      latitude: place.latitude,
      longitude: place.longitude,
    };
    // hallName 이 비어 있을 때만 장소명으로 보조 채움(기존 값 비파괴).
    if (!hallName.trim()) {
      patch.hallName = place.placeName;
    }
    onChange(patch);
    setStatus({ kind: 'idle' });
    setResults([]);
  };

  return (
    <>
      <div className={styles.field}>
        <label className={styles.label} htmlFor="apply-place">
          장소 검색
        </label>
        <div className={styles.addressSearchRow}>
          <Input
            id="apply-place"
            className={styles.addressSearchInput}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="예식장 이름을 입력하세요 (예: 경기교총웨딩하우스)"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                void handleSearch();
              }
            }}
          />
          <button
            type="button"
            className={styles.addressSearchButton}
            onClick={() => void handleSearch()}
            disabled={status.kind === 'loading'}
          >
            {status.kind === 'loading' ? '검색 중…' : '장소 검색'}
          </button>
        </div>

        {status.kind === 'results' && results.length > 0 && (
          <ul className={styles.placeResults}>
            {results.map((place, i) => (
              <li key={`${place.placeName}-${i}`}>
                <button
                  type="button"
                  className={styles.placeResultItem}
                  onClick={() => handleSelect(place)}
                >
                  <span className={styles.placeResultName}>{place.placeName}</span>
                  <span className={styles.placeResultAddr}>
                    {place.roadAddress || place.address}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}

        {status.kind === 'error' && <p className={styles.error}>{status.message}</p>}
        <p className={styles.hint}>
          장소명을 검색해 후보를 고르면 주소·위도·경도가 자동으로 채워지고 아래 지도에 핀으로
          표시됩니다. 미리보기 &lsquo;오시는 길&rsquo;에도 즉시 반영됩니다.
        </p>
      </div>

      <div className={styles.field}>
        <label className={styles.label} htmlFor="apply-address">
          주소
        </label>
        <Input
          id="apply-address"
          value={address}
          onChange={(e) => onChange({ address: e.target.value })}
          placeholder="검색으로 채워지거나 직접 입력할 수 있어요"
        />
      </div>

      {hasCoords && (
        <div className={styles.addressMap}>
          <KakaoMap latitude={latitude} longitude={longitude} title={hallName || '예식장'} />
        </div>
      )}

      <div className={styles.grid2}>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="apply-latitude">
            위도(latitude)
          </label>
          <Input
            id="apply-latitude"
            type="number"
            value={Number.isFinite(latitude) ? latitude : ''}
            onChange={(e) =>
              onChange({ latitude: e.target.value === '' ? NaN : Number(e.target.value) })
            }
            placeholder="예: 37.5665"
            step="any"
          />
        </div>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="apply-longitude">
            경도(longitude)
          </label>
          <Input
            id="apply-longitude"
            type="number"
            value={Number.isFinite(longitude) ? longitude : ''}
            onChange={(e) =>
              onChange({ longitude: e.target.value === '' ? NaN : Number(e.target.value) })
            }
            placeholder="예: 126.978"
            step="any"
          />
        </div>
      </div>
      <p className={styles.hint}>
        좌표는 검색 없이 직접 입력해도 됩니다(미입력 시 지도는 폴백 표시).
      </p>
    </>
  );
}
