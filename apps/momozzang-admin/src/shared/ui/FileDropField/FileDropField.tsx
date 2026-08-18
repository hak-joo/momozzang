import { useCallback, useId, useRef, useState } from 'react';
import type { DragEvent, ReactNode, RefObject } from 'react';
import { clsx } from 'clsx';
import { Button } from '@momozzang/ui/src/shared/ui/Button';
import styles from './FileDropField.module.css';

export interface FileDropFieldProps {
  /** 드롭존 식별자. `data-file-drop` 값이자 `data-file-slot` 값이다(계약 3 §4.3). */
  slot: string;
  /** `input` 의 `id`. `label[for]` 와 짝지어 접근 가능한 이름을 만든다(DoD 22). */
  id: string;
  /** 한국어 라벨. 네이티브 위젯의 `Choose File` 을 대체하는 문구다. */
  label: string;
  /** 버튼 문구. 기본 `파일 선택`. */
  buttonLabel?: string;
  /** 드래그 안내 문구. 기본값은 단일 파일 기준. */
  hint?: string;
  accept?: string;
  multiple?: boolean;
  disabled?: boolean;
  /** 선택/드롭된 파일. 항상 1개 이상이며 `multiple` 이 아니면 정확히 1개다. */
  onFiles: (files: File[]) => void;
  /** 외부 트리거(예: 갤러리의 `사진 추가 +`)가 인풋을 직접 클릭할 수 있게 한다. */
  inputRef?: RefObject<HTMLInputElement | null>;
  /** 스프린트 1·2 스크립트가 쓰는 기존 식별자를 유지하기 위한 통로. */
  inputTestId?: string;
  className?: string;
  /** 썸네일(`ImageThumb`) 등 슬롯 내용. 드롭존 안에 놓여야 측정 훅이 짝을 찾는다. */
  children?: ReactNode;
}

const DEFAULT_HINT = '이곳에 이미지를 끌어다 놓아도 등록됩니다.';

/**
 * 파일 선택 컨트롤(F6 · P1-2 · A4 · DoD 21).
 *
 * 네이티브 `input[type=file]` 위젯은 UA 셰도우 DOM 안에 영문 `Choose File / No file chosen`
 * 을 그린다 — 문자열 스캔으로는 잡히지 않는 측정 사각지대였다(계약 3 §0.1). 그래서 인풋을
 * **`clip` 으로 시각적으로만 숨기고**(포커스·라벨 클릭·버튼 클릭은 살아 있다) 한국어 라벨 +
 * 버튼 + 드래그&드롭으로 조작면을 다시 세운다.
 *
 * `display:none` 을 쓰지 않는 이유는 §4.2 다 — 그러면 컨트롤이 탭 순서에서 사라져
 * DoD 13("모든 폼 컨트롤에 포커스 표현")이 조용히 공허해진다. 포커스 단서는 드롭존이
 * `:focus-within` 으로 뷰어 `Button` 과 같은 링을 그려 대신 표시한다.
 */
export function FileDropField({
  slot,
  id,
  label,
  buttonLabel = '파일 선택',
  hint = DEFAULT_HINT,
  accept = 'image/*',
  multiple = false,
  disabled = false,
  onFiles,
  inputRef,
  inputTestId,
  className,
  children,
}: FileDropFieldProps) {
  const hintId = useId();
  const ownRef = useRef<HTMLInputElement>(null);
  const ref = inputRef ?? ownRef;
  const [dragOver, setDragOver] = useState(false);
  // dragenter/dragleave 는 자손 위를 지날 때마다 짝지어 발생한다. 깊이를 세지 않으면
  // 라벨/버튼 위로 커서가 들어가는 순간 시각 반응이 깜빡인다.
  const depth = useRef(0);

  const emit = useCallback(
    (list: ArrayLike<File> | null | undefined) => {
      if (!list || list.length === 0) return;
      onFiles(multiple ? Array.from(list) : [list[0]]);
    },
    [multiple, onFiles],
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      emit(e.target.files);
      e.target.value = ''; // 같은 파일 재선택 허용.
    },
    [emit],
  );

  const hasFiles = (e: DragEvent<HTMLDivElement>) =>
    Array.from(e.dataTransfer?.types ?? []).includes('Files');

  const handleDragEnter = useCallback((e: DragEvent<HTMLDivElement>) => {
    if (!hasFiles(e)) return;
    e.preventDefault();
    depth.current += 1;
    setDragOver(true);
  }, []);

  const handleDragOver = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      if (disabled || !hasFiles(e)) return;
      // preventDefault 가 없으면 브라우저가 기본 동작(파일 열기)으로 가로챈다.
      e.preventDefault();
      if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
      setDragOver(true);
    },
    [disabled],
  );

  const handleDragLeave = useCallback((e: DragEvent<HTMLDivElement>) => {
    if (!hasFiles(e)) return;
    depth.current = Math.max(0, depth.current - 1);
    if (depth.current === 0) setDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      depth.current = 0;
      setDragOver(false);
      if (disabled) return;
      emit(e.dataTransfer?.files);
    },
    [disabled, emit],
  );

  return (
    <div
      className={clsx(styles.zone, disabled && styles.disabled, className)}
      data-file-drop={slot}
      data-dragover={dragOver ? 'true' : undefined}
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <label className={styles.label} htmlFor={id}>
        {label}
      </label>
      <input
        ref={ref}
        id={id}
        type="file"
        className={styles.input}
        accept={accept}
        multiple={multiple}
        disabled={disabled}
        onChange={handleChange}
        data-file-slot={slot}
        aria-describedby={hintId}
        {...(inputTestId ? { 'data-testid': inputTestId } : null)}
      />
      {/* 썸네일 슬롯은 드롭존에 남는 높이를 **흡수**한다(QA_FINDINGS_3 N3).
          같은 grid 행의 드롭존들은 stretch 로 높이가 이미 같은데(363/363), 그 안의 썸네일
          비율이 다르면(portrait 240 vs square 160) 뒤따르는 버튼·안내문이 80px 어긋났다.
          남는 높이를 여기서 먹으면 조작면이 행 바닥에 정렬된다. */}
      {children ? <div className={styles.body}>{children}</div> : null}
      <div className={styles.actions}>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          disabled={disabled}
          onClick={() => ref.current?.click()}
        >
          {buttonLabel}
        </Button>
      </div>
      <p className={styles.hint} id={hintId}>
        {hint}
      </p>
    </div>
  );
}
