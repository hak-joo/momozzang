import { useState } from 'react';
import { Input } from '@momozzang/ui/src/shared/ui/Input/Input';
import { Button } from '@momozzang/ui/src/shared/ui/Button';
import { openPostcodeSearch } from '@momozzang/ui/src/shared/lib/daumPostcode';
import { geocodeAddress } from '@momozzang/ui/src/shared/lib/naverMaps';
import {
  type WeddingInvitation,
  type ThemeKind,
  type ThemeColorOptions,
  type AmPm,
  type Person,
  type Account,
  type Side,
  type DeceaseType,
  type RsvpSettings,
  type AboutUs,
} from '@momozzang/ui/src/entities/WeddingInvitation/model';
import { getSlugError } from '../../features/apply/validateSlug';
import type {
  AccountOwner,
  EtcField,
  EtcKey,
  ParentSlot,
} from '../../features/apply/useApplyForm';
import { PhoneField } from './PhoneField';
import { EmailField } from './EmailField';
import { AccountEditor } from './AccountEditor';
import { EtcInfoEditor } from './EtcInfoEditor';
import styles from './ApplyForm.module.css';

interface Props {
  invitation: WeddingInvitation;
  // 기본 정보 / 이름 / 예식 / 테마 (S1)
  onInvitationInfoChange: (patch: Partial<WeddingInvitation['invitationInfo']>) => void;
  onGroomNameChange: (name: string) => void;
  onBrideNameChange: (name: string) => void;
  onWeddingHallChange: (patch: Partial<WeddingInvitation['weddingHallInfo']>) => void;
  onThemeChange: (theme: ThemeKind) => void;
  onThemeColorChange: (themeColor: ThemeColorOptions) => void;
  // 주문자 (F3)
  onOrderChange: (patch: Partial<Person>) => void;
  onOrderPhoneChange: (patch: Partial<Person['phone']>) => void;
  // 신랑·신부 연락처 (F4)
  onCouplePersonChange: (side: Side, patch: Partial<Person>) => void;
  onCouplePhoneChange: (side: Side, patch: Partial<Person['phone']>) => void;
  // 혼주 (F5)
  onParentsEnabledChange: (enabled: boolean) => void;
  onParentPersonChange: (slot: ParentSlot, patch: Partial<Person>) => void;
  onParentPhoneChange: (slot: ParentSlot, patch: Partial<Person['phone']>) => void;
  // 계좌 (F4·F5)
  onAddAccount: (owner: AccountOwner) => void;
  onRemoveAccount: (owner: AccountOwner, accountId: string) => void;
  onUpdateAccount: (owner: AccountOwner, accountId: string, patch: Partial<Account>) => void;
  // 축의금 (F9)
  onGiftMoneyChange: (patch: Partial<WeddingInvitation['congratulatoryMoneyInfo']>) => void;
  // 교통 (F8)
  onEtcEnabledChange: (enabled: boolean) => void;
  onAddEtcLine: (key: EtcKey, field: EtcField) => void;
  onUpdateEtcLine: (key: EtcKey, field: EtcField, index: number, value: string) => void;
  onRemoveEtcLine: (key: EtcKey, field: EtcField, index: number) => void;
  // RSVP (F7)
  onRsvpChange: (patch: Partial<RsvpSettings>) => void;
  onRsvpIncludeChange: (patch: Partial<RsvpSettings['include']>) => void;
  onRsvpPerSideChange: (
    side: Side,
    patch: Partial<NonNullable<RsvpSettings['perSide']>[Side]>,
  ) => void;
  onRsvpPerSideIncludeChange: (side: Side, patch: Partial<RsvpSettings['include']>) => void;
  // 소개 (F13)
  onAboutUsChange: (patch: Partial<AboutUs>) => void;
}

const HOURS = Array.from({ length: 12 }, (_, i) => i + 1);
const MINUTES = Array.from({ length: 60 }, (_, i) => i);

const PARENT_SLOTS: Array<{ slot: ParentSlot; label: string }> = [
  { slot: 'groomFather', label: '신랑 아버지' },
  { slot: 'groomMother', label: '신랑 어머니' },
  { slot: 'brideFather', label: '신부 아버지' },
  { slot: 'brideMother', label: '신부 어머니' },
];

const DECEASE_OPTIONS: Array<{ value: DeceaseType; label: string }> = [
  { value: 'none', label: '표기 없음' },
  { value: 'flower', label: '국화(꽃) 표기' },
  { value: 'hanja', label: '한자(故) 표기' },
];

const RSVP_INCLUDE_OPTIONS: Array<{ key: keyof RsvpSettings['include']; label: string }> = [
  { key: 'attendeeCount', label: '참석 인원' },
  { key: 'mealOption', label: '식사 여부' },
  { key: 'contact', label: '연락처' },
  { key: 'companionName', label: '동반인 이름' },
  { key: 'charterBus', label: '전세버스' },
];

const ETC_SECTIONS: Array<{ key: EtcKey; label: string }> = [
  { key: 'busInfo', label: '버스' },
  { key: 'carInfo', label: '자가용' },
  { key: 'metroInfo', label: '지하철' },
  { key: 'shuttleInfo', label: '셔틀버스(선택)' },
];

function CoupleContactBlock({
  side,
  person,
  onPersonChange,
  onPhoneChange,
  onAddAccount,
  onRemoveAccount,
  onUpdateAccount,
}: {
  side: Side;
  person: Person;
  onPersonChange: Props['onCouplePersonChange'];
  onPhoneChange: Props['onCouplePhoneChange'];
  onAddAccount: Props['onAddAccount'];
  onRemoveAccount: Props['onRemoveAccount'];
  onUpdateAccount: Props['onUpdateAccount'];
}) {
  const label = side === 'groom' ? '신랑' : '신부';
  const owner: AccountOwner = { kind: 'couple', side };
  return (
    <div className={styles.personBlock}>
      <h4 className={styles.subSectionTitle}>{label}</h4>
      <PhoneField
        idPrefix={`apply-${side}`}
        phone={person.phone}
        onNumberChange={(number) => onPhoneChange(side, { number })}
        onInternationalChange={(isInternational) => onPhoneChange(side, { isInternational })}
        onCountryCodeChange={(countryCode) => onPhoneChange(side, { countryCode })}
      />
      <EmailField
        idPrefix={`apply-${side}`}
        email={person.email ?? ''}
        onChange={(email) => onPersonChange(side, { email })}
      />
      <AccountEditor
        idPrefix={`apply-${side}`}
        owner={owner}
        accounts={person.accounts ?? []}
        onAdd={onAddAccount}
        onRemove={onRemoveAccount}
        onUpdate={onUpdateAccount}
      />
    </div>
  );
}

function ParentBlock({
  slot,
  label,
  person,
  onPersonChange,
  onPhoneChange,
  onAddAccount,
  onRemoveAccount,
  onUpdateAccount,
}: {
  slot: ParentSlot;
  label: string;
  person: Person | undefined;
  onPersonChange: Props['onParentPersonChange'];
  onPhoneChange: Props['onParentPhoneChange'];
  onAddAccount: Props['onAddAccount'];
  onRemoveAccount: Props['onRemoveAccount'];
  onUpdateAccount: Props['onUpdateAccount'];
}) {
  const owner: AccountOwner = { kind: 'parent', slot };
  const phone = person?.phone ?? { number: '', isInternational: false, countryCode: '+82' };
  const isDeceased = person?.isDeceased ?? false;
  return (
    <div className={styles.personBlock}>
      <h4 className={styles.subSectionTitle}>{label}</h4>
      <div className={styles.field}>
        <label className={styles.label} htmlFor={`apply-${slot}-name`}>
          이름
        </label>
        <Input
          id={`apply-${slot}-name`}
          value={person?.name ?? ''}
          onChange={(e) => onPersonChange(slot, { name: e.target.value })}
          placeholder={`${label} 이름`}
        />
      </div>
      <PhoneField
        idPrefix={`apply-${slot}`}
        phone={phone}
        onNumberChange={(number) => onPhoneChange(slot, { number })}
        onInternationalChange={(isInternational) => onPhoneChange(slot, { isInternational })}
        onCountryCodeChange={(countryCode) => onPhoneChange(slot, { countryCode })}
      />
      <label className={styles.checkboxRow}>
        <input
          type="checkbox"
          checked={isDeceased}
          onChange={(e) => onPersonChange(slot, { isDeceased: e.target.checked })}
        />
        <span>고인</span>
      </label>
      {isDeceased && (
        <div className={styles.field}>
          <label className={styles.label} htmlFor={`apply-${slot}-deceasetype`}>
            고인 표기
          </label>
          <select
            id={`apply-${slot}-deceasetype`}
            className={styles.select}
            value={person?.deceasedType ?? 'none'}
            onChange={(e) =>
              onPersonChange(slot, { deceasedType: e.target.value as DeceaseType })
            }
          >
            {DECEASE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      )}
      <AccountEditor
        idPrefix={`apply-${slot}`}
        owner={owner}
        accounts={person?.accounts ?? []}
        onAdd={onAddAccount}
        onRemove={onRemoveAccount}
        onUpdate={onUpdateAccount}
      />
    </div>
  );
}

function RsvpIncludeToggles({
  include,
  onChange,
  idPrefix,
}: {
  include: Partial<RsvpSettings['include']> | undefined;
  onChange: (patch: Partial<RsvpSettings['include']>) => void;
  idPrefix: string;
}) {
  return (
    <div className={styles.field}>
      <span className={styles.subLabel}>포함 항목</span>
      <div className={styles.toggleGrid}>
        {RSVP_INCLUDE_OPTIONS.map(({ key, label }) => (
          <label key={`${idPrefix}-${key}`} className={styles.checkboxRow}>
            <input
              type="checkbox"
              checked={include?.[key] ?? false}
              onChange={(e) => onChange({ [key]: e.target.checked })}
            />
            <span>{label}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

export function ApplyForm(props: Props) {
  const {
    invitation,
    onInvitationInfoChange,
    onGroomNameChange,
    onBrideNameChange,
    onWeddingHallChange,
    onThemeChange,
    onThemeColorChange,
    onOrderChange,
    onOrderPhoneChange,
    onCouplePersonChange,
    onCouplePhoneChange,
    onParentsEnabledChange,
    onParentPersonChange,
    onParentPhoneChange,
    onAddAccount,
    onRemoveAccount,
    onUpdateAccount,
    onGiftMoneyChange,
    onEtcEnabledChange,
    onAddEtcLine,
    onUpdateEtcLine,
    onRemoveEtcLine,
    onRsvpChange,
    onRsvpIncludeChange,
    onRsvpPerSideChange,
    onRsvpPerSideIncludeChange,
    onAboutUsChange,
  } = props;

  // 주소 검색 + 지오코딩 상태
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [geocodeError, setGeocodeError] = useState<string | null>(null);

  async function handleAddressSearch() {
    setGeocodeError(null);
    const result = await openPostcodeSearch();
    if (!result) return; // 팝업 강제 닫기

    onWeddingHallChange({ address: result.address });

    setIsGeocoding(true);
    try {
      const coords = await geocodeAddress(result.address);
      if (coords) {
        onWeddingHallChange({ latitude: coords.latitude, longitude: coords.longitude });
      } else {
        setGeocodeError('주소로 좌표를 찾지 못했어요. 위/경도를 직접 입력해 주세요.');
      }
    } finally {
      setIsGeocoding(false);
    }
  }

  const {
    invitationInfo,
    couple,
    parents,
    weddingHallInfo,
    theme,
    customization,
    congratulatoryMoneyInfo,
    etcInfo,
    rsvpRequest,
    aboutUs,
  } = invitation;
  const slugError = getSlugError(invitationInfo.url);
  const themeColor: ThemeColorOptions = customization?.themeColor === 'PINK' ? 'PINK' : 'PURPLE';
  const order = invitationInfo.order;

  return (
    <div className={styles.form}>
      {/* 기본 정보 */}
      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>기본 정보</h3>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="apply-title">
            초대장 제목
          </label>
          <Input
            id="apply-title"
            value={invitationInfo.title}
            onChange={(e) => onInvitationInfoChange({ title: e.target.value })}
            placeholder="예: OO ♥ OO 결혼합니다"
          />
          <p className={styles.hint}>브라우저 탭 제목(공유 시 메인 텍스트)에 사용됩니다.</p>
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="apply-message">
            청첩장 문구
          </label>
          <textarea
            id="apply-message"
            className={styles.textarea}
            value={invitationInfo.message}
            onChange={(e) => onInvitationInfoChange({ message: e.target.value })}
            rows={5}
            placeholder="모시는 글에 표시될 문구를 입력하세요. (여러 줄 가능)"
          />
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="apply-slug">
            초대장 주소(슬러그)
          </label>
          <div className={styles.slugRow}>
            <span className={styles.slugPrefix}>https://.../m/</span>
            <Input
              id="apply-slug"
              className={styles.slugInput}
              value={invitationInfo.url}
              onChange={(e) => onInvitationInfoChange({ url: e.target.value })}
              placeholder="my-wedding"
              aria-invalid={slugError ? 'true' : 'false'}
            />
          </div>
          {slugError && <p className={styles.error}>{slugError}</p>}
        </div>
      </section>

      {/* 주문자 정보 (F3) */}
      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>주문자 정보</h3>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="apply-order-name">
            주문자 이름
          </label>
          <Input
            id="apply-order-name"
            value={order.name}
            onChange={(e) => onOrderChange({ name: e.target.value })}
            placeholder="주문자 이름"
          />
        </div>
        <PhoneField
          idPrefix="apply-order"
          phone={order.phone}
          onNumberChange={(number) => onOrderPhoneChange({ number })}
          onInternationalChange={(isInternational) => onOrderPhoneChange({ isInternational })}
          onCountryCodeChange={(countryCode) => onOrderPhoneChange({ countryCode })}
        />
        <EmailField
          idPrefix="apply-order"
          email={order.email ?? ''}
          onChange={(email) => onOrderChange({ email })}
        />
      </section>

      {/* 신랑 · 신부 (F4: 이름 + 연락처 + 계좌) */}
      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>신랑 · 신부</h3>
        <div className={styles.grid2}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="apply-groom">
              신랑 이름
            </label>
            <Input
              id="apply-groom"
              value={couple.groom.name}
              onChange={(e) => onGroomNameChange(e.target.value)}
              placeholder="신랑 이름"
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="apply-bride">
              신부 이름
            </label>
            <Input
              id="apply-bride"
              value={couple.bride.name}
              onChange={(e) => onBrideNameChange(e.target.value)}
              placeholder="신부 이름"
            />
          </div>
        </div>

        <CoupleContactBlock
          side="groom"
          person={couple.groom}
          onPersonChange={onCouplePersonChange}
          onPhoneChange={onCouplePhoneChange}
          onAddAccount={onAddAccount}
          onRemoveAccount={onRemoveAccount}
          onUpdateAccount={onUpdateAccount}
        />
        <CoupleContactBlock
          side="bride"
          person={couple.bride}
          onPersonChange={onCouplePersonChange}
          onPhoneChange={onCouplePhoneChange}
          onAddAccount={onAddAccount}
          onRemoveAccount={onRemoveAccount}
          onUpdateAccount={onUpdateAccount}
        />
      </section>

      {/* 축의금 옵션 (F9) */}
      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>축의금 안내</h3>
        <label className={styles.checkboxRow}>
          <input
            type="checkbox"
            checked={congratulatoryMoneyInfo.enabled}
            onChange={(e) => onGiftMoneyChange({ enabled: e.target.checked })}
          />
          <span>축의금 안내(계좌) 사용</span>
        </label>
        <p className={styles.hint}>
          끄면 미리보기 &lsquo;마음을 전하실 곳&rsquo;의 계좌 목록이 숨겨집니다.
        </p>
        <label className={styles.checkboxRow}>
          <input
            type="checkbox"
            checked={congratulatoryMoneyInfo.cardPayment}
            onChange={(e) => onGiftMoneyChange({ cardPayment: e.target.checked })}
          />
          <span>카드 결제 표시</span>
        </label>
      </section>

      {/* 혼주 (F5) */}
      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>혼주(부모) 정보</h3>
        <label className={styles.checkboxRow}>
          <input
            type="checkbox"
            checked={parents.enabled}
            onChange={(e) => onParentsEnabledChange(e.target.checked)}
          />
          <span>혼주 정보 사용</span>
        </label>
        {PARENT_SLOTS.map(({ slot, label }) => (
          <ParentBlock
            key={slot}
            slot={slot}
            label={label}
            person={parents[slot]}
            onPersonChange={onParentPersonChange}
            onPhoneChange={onParentPhoneChange}
            onAddAccount={onAddAccount}
            onRemoveAccount={onRemoveAccount}
            onUpdateAccount={onUpdateAccount}
          />
        ))}
      </section>

      {/* 예식 정보 (F6) */}
      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>예식 정보</h3>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="apply-date">
            예식 날짜
          </label>
          <Input
            id="apply-date"
            type="date"
            value={weddingHallInfo.date}
            onChange={(e) => onWeddingHallChange({ date: e.target.value })}
          />
        </div>

        <div className={styles.grid3}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="apply-ampm">
              오전/오후
            </label>
            <select
              id="apply-ampm"
              className={styles.select}
              value={weddingHallInfo.ampm}
              onChange={(e) => onWeddingHallChange({ ampm: e.target.value as AmPm })}
            >
              <option value="AM">오전</option>
              <option value="PM">오후</option>
            </select>
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="apply-hour">
              시
            </label>
            <select
              id="apply-hour"
              className={styles.select}
              value={weddingHallInfo.hour}
              onChange={(e) => onWeddingHallChange({ hour: Number(e.target.value) })}
            >
              {HOURS.map((h) => (
                <option key={h} value={h}>
                  {h}시
                </option>
              ))}
            </select>
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="apply-minute">
              분
            </label>
            <select
              id="apply-minute"
              className={styles.select}
              value={weddingHallInfo.minute}
              onChange={(e) => onWeddingHallChange({ minute: Number(e.target.value) })}
            >
              {MINUTES.map((m) => (
                <option key={m} value={m}>
                  {m}분
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className={styles.grid2}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="apply-hallname">
              예식장명
            </label>
            <Input
              id="apply-hallname"
              value={weddingHallInfo.hallName}
              onChange={(e) => onWeddingHallChange({ hallName: e.target.value })}
              placeholder="예식장 이름"
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="apply-halldetail">
              층/홀/실
            </label>
            <Input
              id="apply-halldetail"
              value={weddingHallInfo.hallDetail}
              onChange={(e) => onWeddingHallChange({ hallDetail: e.target.value })}
              placeholder="예: 3층 그랜드홀"
            />
          </div>
        </div>

        <label className={styles.checkboxRow}>
          <input
            type="checkbox"
            checked={weddingHallInfo.lineBreakBetweenNameAndHall}
            onChange={(e) =>
              onWeddingHallChange({ lineBreakBetweenNameAndHall: e.target.checked })
            }
          />
          <span>예식장명과 홀 사이 줄바꿈</span>
        </label>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="apply-tel">
            대표 전화
          </label>
          <Input
            id="apply-tel"
            value={weddingHallInfo.tel}
            onChange={(e) => onWeddingHallChange({ tel: e.target.value })}
            placeholder="예식장 대표 전화"
            inputMode="tel"
          />
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="apply-address">
            주소
          </label>
          <div className={styles.addressRow}>
            <Input
              id="apply-address"
              className={styles.addressInput}
              value={weddingHallInfo.address}
              onChange={(e) => {
                setGeocodeError(null);
                onWeddingHallChange({ address: e.target.value });
              }}
              placeholder="예식장 주소"
              readOnly={isGeocoding}
            />
            <Button
              className={styles.addressSearchBtn}
              size="sm"
              variant="secondary"
              disabled={isGeocoding}
              onClick={handleAddressSearch}
            >
              {isGeocoding ? '검색 중…' : '주소 검색'}
            </Button>
          </div>
          {isGeocoding && (
            <p className={styles.geocodeHintLoading}>좌표 변환 중입니다…</p>
          )}
          {geocodeError && !isGeocoding && (
            <p className={styles.geocodeHintError}>{geocodeError}</p>
          )}
          <p className={styles.hint}>미리보기 &lsquo;오시는 길&rsquo;에 즉시 반영됩니다.</p>
        </div>

        <div className={styles.grid2}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="apply-latitude">
              위도(latitude)
            </label>
            <Input
              id="apply-latitude"
              type="number"
              value={Number.isFinite(weddingHallInfo.latitude) ? weddingHallInfo.latitude : ''}
              onChange={(e) =>
                onWeddingHallChange({
                  latitude: e.target.value === '' ? NaN : Number(e.target.value),
                })
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
              value={Number.isFinite(weddingHallInfo.longitude) ? weddingHallInfo.longitude : ''}
              onChange={(e) =>
                onWeddingHallChange({
                  longitude: e.target.value === '' ? NaN : Number(e.target.value),
                })
              }
              placeholder="예: 126.978"
              step="any"
            />
          </div>
        </div>
        <p className={styles.hint}>좌표는 미입력해도 됩니다(지도 폴백 표시).</p>
      </section>

      {/* 교통/기타 안내 (F8) */}
      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>교통/기타 안내</h3>
        <label className={styles.checkboxRow}>
          <input
            type="checkbox"
            checked={etcInfo.enabled}
            onChange={(e) => onEtcEnabledChange(e.target.checked)}
          />
          <span>교통/기타 안내 사용</span>
        </label>
        {ETC_SECTIONS.map(({ key, label }) => (
          <EtcInfoEditor
            key={key}
            etcKey={key}
            label={label}
            item={etcInfo[key]}
            onAddLine={onAddEtcLine}
            onUpdateLine={onUpdateEtcLine}
            onRemoveLine={onRemoveEtcLine}
          />
        ))}
      </section>

      {/* RSVP (F7) */}
      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>참석 의사(RSVP)</h3>
        <label className={styles.checkboxRow}>
          <input
            type="checkbox"
            checked={rsvpRequest.enabled}
            onChange={(e) => onRsvpChange({ enabled: e.target.checked })}
          />
          <span>RSVP 사용</span>
        </label>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="apply-rsvp-title">
            공통 제목
          </label>
          <Input
            id="apply-rsvp-title"
            value={rsvpRequest.title ?? ''}
            onChange={(e) => onRsvpChange({ title: e.target.value })}
            placeholder="예: 참석 여부를 알려주세요"
          />
        </div>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="apply-rsvp-content">
            공통 내용
          </label>
          <textarea
            id="apply-rsvp-content"
            className={styles.textarea}
            value={rsvpRequest.content ?? ''}
            onChange={(e) => onRsvpChange({ content: e.target.value })}
            rows={3}
            placeholder="RSVP 안내 문구"
          />
        </div>

        <RsvpIncludeToggles
          idPrefix="apply-rsvp-common"
          include={rsvpRequest.include}
          onChange={onRsvpIncludeChange}
        />

        <label className={styles.checkboxRow}>
          <input
            type="checkbox"
            checked={rsvpRequest.separateForBrideGroom}
            onChange={(e) => onRsvpChange({ separateForBrideGroom: e.target.checked })}
          />
          <span>신랑 · 신부 분리 설정</span>
        </label>

        {rsvpRequest.separateForBrideGroom &&
          (['groom', 'bride'] as Side[]).map((side) => {
            const sideLabel = side === 'groom' ? '신랑측' : '신부측';
            const sideData = rsvpRequest.perSide?.[side];
            return (
              <div key={side} className={styles.personBlock}>
                <h4 className={styles.subSectionTitle}>{sideLabel}</h4>
                <div className={styles.field}>
                  <label className={styles.label} htmlFor={`apply-rsvp-${side}-title`}>
                    제목
                  </label>
                  <Input
                    id={`apply-rsvp-${side}-title`}
                    value={sideData?.title ?? ''}
                    onChange={(e) => onRsvpPerSideChange(side, { title: e.target.value })}
                    placeholder={`${sideLabel} 제목`}
                  />
                </div>
                <div className={styles.field}>
                  <label className={styles.label} htmlFor={`apply-rsvp-${side}-content`}>
                    내용
                  </label>
                  <textarea
                    id={`apply-rsvp-${side}-content`}
                    className={styles.textarea}
                    value={sideData?.content ?? ''}
                    onChange={(e) => onRsvpPerSideChange(side, { content: e.target.value })}
                    rows={2}
                    placeholder={`${sideLabel} 내용`}
                  />
                </div>
                <RsvpIncludeToggles
                  idPrefix={`apply-rsvp-${side}`}
                  include={sideData?.include}
                  onChange={(patch) => onRsvpPerSideIncludeChange(side, patch)}
                />
              </div>
            );
          })}

        <label className={styles.checkboxRow}>
          <input
            type="checkbox"
            checked={rsvpRequest.popupOnAccess}
            onChange={(e) => onRsvpChange({ popupOnAccess: e.target.checked })}
          />
          <span>접속 시 팝업 표시</span>
        </label>
      </section>

      {/* 소개 (F13) */}
      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>소개 (About Us)</h3>
        <p className={styles.hint}>
          미니룸의 &lsquo;About Us!&rsquo; 시트에 즉시 반영됩니다. (이미지는 다음 스프린트)
        </p>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="apply-about-title">
            소개 제목
          </label>
          <Input
            id="apply-about-title"
            value={aboutUs?.title ?? ''}
            onChange={(e) => onAboutUsChange({ title: e.target.value })}
            placeholder="예: 우리 두 사람을 소개합니다"
          />
        </div>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="apply-about-groom">
            신랑 소개
          </label>
          <textarea
            id="apply-about-groom"
            className={styles.textarea}
            value={aboutUs?.groomDesc ?? ''}
            onChange={(e) => onAboutUsChange({ groomDesc: e.target.value })}
            rows={3}
            placeholder="신랑 소개 문구"
          />
        </div>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="apply-about-bride">
            신부 소개
          </label>
          <textarea
            id="apply-about-bride"
            className={styles.textarea}
            value={aboutUs?.brideDesc ?? ''}
            onChange={(e) => onAboutUsChange({ brideDesc: e.target.value })}
            rows={3}
            placeholder="신부 소개 문구"
          />
        </div>
      </section>

      {/* 테마 */}
      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>테마</h3>
        <div className={styles.grid2}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="apply-theme">
              테마
            </label>
            <select
              id="apply-theme"
              className={styles.select}
              value={theme}
              onChange={(e) => onThemeChange(e.target.value as ThemeKind)}
            >
              <option value="CYWORLD">CYWORLD</option>
              <option value="RETRO">RETRO</option>
            </select>
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="apply-themecolor">
              테마색
            </label>
            <select
              id="apply-themecolor"
              className={styles.select}
              value={themeColor}
              onChange={(e) => onThemeColorChange(e.target.value as ThemeColorOptions)}
            >
              <option value="PURPLE">PURPLE</option>
              <option value="PINK">PINK</option>
            </select>
          </div>
        </div>
      </section>
    </div>
  );
}
