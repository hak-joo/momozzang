import { Input } from '@momozzang/ui/src/shared/ui/Input/Input';
import { Button } from '@momozzang/ui/src/shared/ui/Button';
import type { EtcItem } from '@momozzang/ui/src/entities/WeddingInvitation/model';
import type { EtcField, EtcKey } from '../../features/apply/useApplyForm';
import styles from './ApplyForm.module.css';

interface Props {
  etcKey: EtcKey;
  label: string;
  item: EtcItem | undefined;
  onAddLine: (key: EtcKey, field: EtcField) => void;
  onUpdateLine: (key: EtcKey, field: EtcField, index: number, value: string) => void;
  onRemoveLine: (key: EtcKey, field: EtcField, index: number) => void;
}

function LineList({
  etcKey,
  field,
  fieldLabel,
  lines,
  placeholder,
  onAddLine,
  onUpdateLine,
  onRemoveLine,
}: {
  etcKey: EtcKey;
  field: EtcField;
  fieldLabel: string;
  lines: string[];
  placeholder: string;
  onAddLine: Props['onAddLine'];
  onUpdateLine: Props['onUpdateLine'];
  onRemoveLine: Props['onRemoveLine'];
}) {
  return (
    <div className={styles.etcFieldGroup}>
      <div className={styles.accountEditorHeader}>
        <span className={styles.subLabel}>{fieldLabel}</span>
        <Button type="button" size="sm" variant="secondary" onClick={() => onAddLine(etcKey, field)}>
          + 항목 추가
        </Button>
      </div>
      {lines.length === 0 && <p className={styles.hint}>항목이 없습니다.</p>}
      <ul className={styles.etcLineList}>
        {lines.map((line, index) => (
          <li key={`${etcKey}-${field}-${index}`} className={styles.etcLineRow}>
            <Input
              className={styles.etcLineInput}
              value={line}
              onChange={(e) => onUpdateLine(etcKey, field, index, e.target.value)}
              placeholder={placeholder}
              aria-label={`${fieldLabel} ${index + 1}`}
            />
            <button
              type="button"
              className={styles.removeButton}
              onClick={() => onRemoveLine(etcKey, field, index)}
              aria-label={`${fieldLabel} ${index + 1} 삭제`}
            >
              삭제
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** 교통 안내 1종(버스/자차/지하철/셔틀)의 info[]·subInfo[] 배열 편집기. */
export function EtcInfoEditor({
  etcKey,
  label,
  item,
  onAddLine,
  onUpdateLine,
  onRemoveLine,
}: Props) {
  const info = item?.info ?? [];
  const subInfo = item?.subInfo ?? [];

  return (
    <div className={styles.etcEditor}>
      <h4 className={styles.etcTitle}>{label}</h4>
      <LineList
        etcKey={etcKey}
        field="info"
        fieldLabel="안내 문구"
        lines={info}
        placeholder="예: 강남역 3번 출구 도보 5분"
        onAddLine={onAddLine}
        onUpdateLine={onUpdateLine}
        onRemoveLine={onRemoveLine}
      />
      <LineList
        etcKey={etcKey}
        field="subInfo"
        fieldLabel="보조 문구"
        lines={subInfo}
        placeholder="예: 주차 2시간 무료"
        onAddLine={onAddLine}
        onUpdateLine={onUpdateLine}
        onRemoveLine={onRemoveLine}
      />
    </div>
  );
}
