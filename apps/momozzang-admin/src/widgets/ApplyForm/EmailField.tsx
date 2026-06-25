import { Input } from '@momozzang/ui/src/shared/ui/Input/Input';
import { Select } from '@momozzang/ui/src/shared/ui/Select';
import styles from './ApplyForm.module.css';

interface Props {
  idPrefix: string;
  label?: string;
  email: string;
  onChange: (value: string) => void;
}

const DOMAIN_PRESETS = ['naver.com', 'gmail.com', 'daum.net', 'kakao.com', 'hanmail.net'];
const DIRECT = '__direct__';

function splitEmail(email: string): { local: string; domain: string; hasAt: boolean } {
  const at = email.indexOf('@');
  if (at < 0) return { local: email, domain: '', hasAt: false };
  return { local: email.slice(0, at), domain: email.slice(at + 1), hasAt: true };
}

/**
 * 이메일 입력: 아이디 + `@` + 도메인 셀렉트(프리셋) 또는 직접 입력.
 * 도메인이 프리셋에 없으면(또는 직접 입력 모드로 `@`만 있으면) "직접 입력"이 선택되어
 * 도메인 입력 필드가 노출된다.
 */
export function EmailField({ idPrefix, label = '이메일', email, onChange }: Props) {
  const { local, domain, hasAt } = splitEmail(email);
  const isPreset = DOMAIN_PRESETS.includes(domain);
  // `@`가 있고 프리셋이 아니면(빈 도메인 포함) 직접 입력 모드로 본다.
  const selectValue = !hasAt ? '' : isPreset ? domain : DIRECT;

  const handleLocal = (value: string) => {
    onChange(hasAt ? `${value}@${domain}` : value);
  };

  const handleDomainSelect = (value: string) => {
    if (value === DIRECT) {
      // 직접 입력으로 전환 — 도메인을 비워 입력 필드 노출
      onChange(`${local}@`);
      return;
    }
    if (value === '') {
      onChange(local);
      return;
    }
    onChange(`${local}@${value}`);
  };

  const handleDomainInput = (value: string) => {
    onChange(`${local}@${value}`);
  };

  const showDirectInput = selectValue === DIRECT;

  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor={`${idPrefix}-email-local`}>
        {label}
      </label>
      <div className={styles.emailRow}>
        <Input
          id={`${idPrefix}-email-local`}
          className={styles.emailLocalInput}
          value={local}
          onChange={(e) => handleLocal(e.target.value)}
          placeholder="아이디"
          aria-label="이메일 아이디"
        />
        <span className={styles.emailAt}>@</span>
        {showDirectInput ? (
          <Input
            id={`${idPrefix}-email-domain`}
            className={styles.emailDomainInput}
            value={domain}
            onChange={(e) => handleDomainInput(e.target.value)}
            placeholder="도메인 직접 입력"
            aria-label="이메일 도메인"
          />
        ) : (
          <span className={styles.emailDomainText}>{domain || '도메인'}</span>
        )}
        <Select
          className={styles.emailDomainSelect}
          value={selectValue}
          onChange={(e) => handleDomainSelect(e.target.value)}
          aria-label="이메일 도메인 선택"
        >
          <option value="">선택</option>
          {DOMAIN_PRESETS.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
          <option value={DIRECT}>직접 입력</option>
        </Select>
      </div>
    </div>
  );
}
