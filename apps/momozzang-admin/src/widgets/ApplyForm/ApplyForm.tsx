import { Input } from '@momozzang/ui/src/shared/ui/Input/Input';
import {
  type WeddingInvitation,
  type ThemeKind,
  type ThemeColorOptions,
  type AmPm,
} from '@momozzang/ui/src/entities/WeddingInvitation/model';
import { getSlugError } from '../../features/apply/validateSlug';
import styles from './ApplyForm.module.css';

interface Props {
  invitation: WeddingInvitation;
  onInvitationInfoChange: (patch: Partial<WeddingInvitation['invitationInfo']>) => void;
  onGroomNameChange: (name: string) => void;
  onBrideNameChange: (name: string) => void;
  onWeddingHallChange: (patch: Partial<WeddingInvitation['weddingHallInfo']>) => void;
  onThemeChange: (theme: ThemeKind) => void;
  onThemeColorChange: (themeColor: ThemeColorOptions) => void;
}

const HOURS = Array.from({ length: 12 }, (_, i) => i + 1);
const MINUTES = Array.from({ length: 60 }, (_, i) => i);

export function ApplyForm({
  invitation,
  onInvitationInfoChange,
  onGroomNameChange,
  onBrideNameChange,
  onWeddingHallChange,
  onThemeChange,
  onThemeColorChange,
}: Props) {
  const { invitationInfo, couple, weddingHallInfo, theme, customization } = invitation;
  const slugError = getSlugError(invitationInfo.url);
  const themeColor: ThemeColorOptions = customization?.themeColor === 'PINK' ? 'PINK' : 'PURPLE';

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

      {/* 신랑 · 신부 */}
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
      </section>

      {/* 예식 정보 */}
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
