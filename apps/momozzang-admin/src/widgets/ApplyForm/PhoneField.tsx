import { Input } from '@momozzang/ui/src/shared/ui/Input/Input';
import { Checkbox } from '@momozzang/ui/src/shared/ui/Checkbox';
import type { Phone } from '@momozzang/ui/src/entities/WeddingInvitation/model';
import styles from './ApplyForm.module.css';

interface Props {
  idPrefix: string;
  label?: string;
  phone: Phone;
  onNumberChange: (value: string) => void;
  onInternationalChange: (value: boolean) => void;
  onCountryCodeChange: (value: string) => void;
}

/**
 * 휴대폰 입력: 번호 + 국제 토글 + 국가코드.
 * 국제 토글 OFF 시 국가코드 입력은 숨김(기본 +82 유지). ON 시 국가코드 입력 노출.
 */
export function PhoneField({
  idPrefix,
  label = '휴대폰',
  phone,
  onNumberChange,
  onInternationalChange,
  onCountryCodeChange,
}: Props) {
  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor={`${idPrefix}-number`}>
        {label}
      </label>
      <div className={styles.phoneRow}>
        {phone.isInternational && (
          <Input
            id={`${idPrefix}-country`}
            className={styles.countryCodeInput}
            value={phone.countryCode}
            onChange={(e) => onCountryCodeChange(e.target.value)}
            placeholder="+82"
            aria-label="국가코드"
          />
        )}
        <Input
          id={`${idPrefix}-number`}
          className={styles.phoneNumberInput}
          value={phone.number}
          onChange={(e) => onNumberChange(e.target.value)}
          placeholder="01012345678 (하이픈 없이)"
          inputMode="tel"
        />
      </div>
      <Checkbox
        checked={phone.isInternational}
        onChange={(e) => onInternationalChange(e.target.checked)}
        label="국제 전화번호 사용 (국가코드 입력)"
      />
    </div>
  );
}
