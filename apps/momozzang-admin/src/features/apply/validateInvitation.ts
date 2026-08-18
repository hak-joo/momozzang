import { type WeddingInvitation } from '@momozzang/ui/src/entities/WeddingInvitation/model';
import { getSlugSaveError } from './validateSlug';

export interface ValidationIssue {
  field: string;
  label: string;
  message: string;
}

/** 신청(F3) 메타데이터 — 청첩장 본문이 아니라 신청 정보다. */
export interface ApplicationMeta {
  editPassword: string;
  applicantContact: string;
}

/** 편집 비밀번호 길이 경계. */
const EDIT_PASSWORD_MIN_LENGTH = 8;
const EDIT_PASSWORD_MAX_LENGTH = 64;
/** 신청자 연락처 길이 상한. */
const APPLICANT_CONTACT_MAX_LENGTH = 100;

/**
 * 청첩장 **본문** 전용 검증.
 * 필수값: 슬러그, 제목, 신랑 이름, 신부 이름, 예식 날짜. 형식: 슬러그 패턴+길이(3~50), 시(1~12)/분(0~59).
 *
 * `/edit` 은 신청 메타(연락처·편집 비밀번호)를 다루지 않는다 — 저장 경로가 본문 `data` 만 갱신하므로
 * 가짜 `meta` 를 지어 넣지 않도록 본문 검사를 여기로 분리했다.
 *
 * 오류 메시지에는 입력값을 넣지 않는다.
 */
export function validateInvitationBody(data: WeddingInvitation): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const { invitationInfo, couple, weddingHallInfo } = data;

  // 빈 슬러그 분기는 getSlugSaveError 가 흡수한다(메시지는 기존과 동일).
  const slugErr = getSlugSaveError(invitationInfo.url.trim());
  if (slugErr) {
    issues.push({ field: 'slug', label: '초대장 주소(슬러그)', message: slugErr });
  }

  if (!invitationInfo.title.trim()) {
    issues.push({ field: 'title', label: '초대장 제목', message: '제목을 입력해 주세요.' });
  }

  if (!couple.groom.name.trim()) {
    issues.push({ field: 'groomName', label: '신랑 이름', message: '신랑 이름을 입력해 주세요.' });
  }

  if (!couple.bride.name.trim()) {
    issues.push({ field: 'brideName', label: '신부 이름', message: '신부 이름을 입력해 주세요.' });
  }

  if (!weddingHallInfo.date.trim()) {
    issues.push({ field: 'date', label: '예식 날짜', message: '예식 날짜를 입력해 주세요.' });
  }

  if (
    !Number.isFinite(weddingHallInfo.hour) ||
    weddingHallInfo.hour < 1 ||
    weddingHallInfo.hour > 12
  ) {
    issues.push({ field: 'hour', label: '예식 시각(시)', message: '시는 1~12 범위여야 합니다.' });
  }

  if (
    !Number.isFinite(weddingHallInfo.minute) ||
    weddingHallInfo.minute < 0 ||
    weddingHallInfo.minute > 59
  ) {
    issues.push({ field: 'minute', label: '예식 시각(분)', message: '분은 0~59 범위여야 합니다.' });
  }

  return issues;
}

/**
 * 저장(신청) 전 필수값/형식 검증 = 본문 검증 + 신청 메타 검증.
 * 이슈 순서는 본문 → 신청자 연락처 → 편집 비밀번호다(기존과 동일).
 *
 * `meta` 는 **필수 인자**다. 선택 인자로 두면 호출부가 빼먹어도 컴파일이 통과해
 * 신청 검증이 조용히 사라진다.
 */
export function validateInvitation(
  data: WeddingInvitation,
  meta: ApplicationMeta,
): ValidationIssue[] {
  const issues: ValidationIssue[] = validateInvitationBody(data);

  if (!meta.applicantContact.trim()) {
    issues.push({
      field: 'applicantContact',
      label: '신청자 연락처',
      message: '연락처를 입력해 주세요.',
    });
  } else if (meta.applicantContact.trim().length > APPLICANT_CONTACT_MAX_LENGTH) {
    issues.push({
      field: 'applicantContact',
      label: '신청자 연락처',
      message: `연락처는 ${APPLICANT_CONTACT_MAX_LENGTH}자 이하로 입력해 주세요.`,
    });
  }

  // 비밀번호는 trim 하지 않는다 — 앞뒤 공백도 비밀번호의 일부이며, trim 하면
  // 화면에 보이는 길이와 저장되는 값이 어긋난다.
  if (
    meta.editPassword.length < EDIT_PASSWORD_MIN_LENGTH ||
    meta.editPassword.length > EDIT_PASSWORD_MAX_LENGTH
  ) {
    issues.push({
      field: 'editPassword',
      label: '편집 비밀번호',
      message: `편집 비밀번호는 ${EDIT_PASSWORD_MIN_LENGTH}자 이상 ${EDIT_PASSWORD_MAX_LENGTH}자 이하로 입력해 주세요.`,
    });
  }

  return issues;
}
