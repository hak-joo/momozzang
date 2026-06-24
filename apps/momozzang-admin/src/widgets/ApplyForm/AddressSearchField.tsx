import { useState } from 'react';
import { Input } from '@momozzang/ui/src/shared/ui/Input/Input';
import { NaverMap } from '@momozzang/ui/src/shared/ui/NaverMap';
import {
  geocodeAddress,
  GeocoderUnavailableError,
} from '@momozzang/ui/src/shared/ui/NaverMap';
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
  | { kind: 'success'; message: string }
  | { kind: 'error'; message: string };

/**
 * 주소 검색 → Naver Geocoding 자동 좌표 (F2).
 * - 검색 성공 시 address/latitude/longitude 를 한 번에 patch 한다.
 * - 키/서브모듈 미설정·무결과 시 안내 문구를 띄우되, 주소·좌표 수동 입력 경로는 그대로 유지한다
 *   (지오코딩 실패가 폼 저장을 막지 않음).
 */
export function AddressSearchField({ address, latitude, longitude, hallName, onChange }: Props) {
  const [status, setStatus] = useState<SearchStatus>({ kind: 'idle' });
  const hasCoords = Number.isFinite(latitude) && Number.isFinite(longitude);

  const handleSearch = async () => {
    const query = address.trim();
    if (!query) {
      setStatus({ kind: 'error', message: '먼저 검색할 주소를 입력해 주세요.' });
      return;
    }
    setStatus({ kind: 'loading' });
    try {
      const result = await geocodeAddress(query);
      onChange({
        address: result.address,
        latitude: result.latitude,
        longitude: result.longitude,
      });
      setStatus({
        kind: 'success',
        message: `좌표를 찾았어요: ${result.latitude.toFixed(5)}, ${result.longitude.toFixed(5)}`,
      });
    } catch (err) {
      const message =
        err instanceof GeocoderUnavailableError
          ? `${err.message} 아래에 주소와 위도/경도를 직접 입력해 저장할 수 있어요.`
          : err instanceof Error
            ? `${err.message} 주소·좌표를 직접 입력해 저장할 수 있어요.`
            : '주소 검색에 실패했어요. 직접 입력해 주세요.';
      setStatus({ kind: 'error', message });
    }
  };

  return (
    <>
      <div className={styles.field}>
        <label className={styles.label} htmlFor="apply-address">
          주소
        </label>
        <div className={styles.addressSearchRow}>
          <Input
            id="apply-address"
            className={styles.addressSearchInput}
            value={address}
            onChange={(e) => onChange({ address: e.target.value })}
            placeholder="예식장 주소를 입력하고 검색하세요"
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
            {status.kind === 'loading' ? '검색 중…' : '주소 검색'}
          </button>
        </div>
        {status.kind === 'success' && <p className={styles.hint}>{status.message}</p>}
        {status.kind === 'error' && <p className={styles.error}>{status.message}</p>}
        <p className={styles.hint}>
          검색하면 위도/경도가 자동으로 채워지고 아래 지도에 핀으로 표시됩니다. 미리보기
          &lsquo;오시는 길&rsquo;에도 즉시 반영됩니다.
        </p>
      </div>

      {hasCoords && (
        <div className={styles.addressMap}>
          <NaverMap latitude={latitude} longitude={longitude} title={hallName || '예식장'} />
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
