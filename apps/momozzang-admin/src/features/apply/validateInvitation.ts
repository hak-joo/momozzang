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

  // 형식 검증 (전화번호, 이메일, 계좌번호, 좌표)
  checkPhone(invitationInfo.order.phone, 'orderPhone', '주문자 전화번호', issues);
  checkEmail(invitationInfo.order.email, 'orderEmail', '주문자 이메일', issues);

  checkPhone(couple.groom.phone, 'groomPhone', '신랑 전화번호', issues);
  checkEmail(couple.groom.email, 'groomEmail', '신랑 이메일', issues);
  checkAccounts(couple.groom.accounts, 'groom', '신랑', issues);

  checkPhone(couple.bride.phone, 'bridePhone', '신부 전화번호', issues);
  checkEmail(couple.bride.email, 'brideEmail', '신부 이메일', issues);
  checkAccounts(couple.bride.accounts, 'bride', '신부', issues);

  if (data.parents) {
    const { groomFather, groomMother, brideFather, brideMother } = data.parents;
    if (groomFather) {
      checkPhone(groomFather.phone, 'groomFatherPhone', '신랑 아버님 전화번호', issues);
      checkEmail(groomFather.email, 'groomFatherEmail', '신랑 아버님 이메일', issues);
      checkAccounts(groomFather.accounts, 'groomFather', '신랑 아버님', issues);
    }
    if (groomMother) {
      checkPhone(groomMother.phone, 'groomMotherPhone', '신랑 어머님 전화번호', issues);
      checkEmail(groomMother.email, 'groomMotherEmail', '신랑 어머님 이메일', issues);
      checkAccounts(groomMother.accounts, 'groomMother', '신랑 어머님', issues);
    }
    if (brideFather) {
      checkPhone(brideFather.phone, 'brideFatherPhone', '신부 아버님 전화번호', issues);
      checkEmail(brideFather.email, 'brideFatherEmail', '신부 아버님 이메일', issues);
      checkAccounts(brideFather.accounts, 'brideFather', '신부 아버님', issues);
    }
    if (brideMother) {
      checkPhone(brideMother.phone, 'brideMotherPhone', '신부 어머님 전화번호', issues);
      checkEmail(brideMother.email, 'brideMotherEmail', '신부 어머님 이메일', issues);
      checkAccounts(brideMother.accounts, 'brideMother', '신부 어머님', issues);
    }
  }

  if (weddingHallInfo.latitude !== undefined && weddingHallInfo.latitude !== null && String(weddingHallInfo.latitude).trim() !== '') {
    const latNum = Number(weddingHallInfo.latitude);
    if (!Number.isFinite(latNum) || latNum < -90 || latNum > 90) {
      issues.push({ field: 'latitude', label: '위도', message: '위도는 -90~90 범위의 숫자여야 합니다.' });
    }
  }
  if (weddingHallInfo.longitude !== undefined && weddingHallInfo.longitude !== null && String(weddingHallInfo.longitude).trim() !== '') {
    const lngNum = Number(weddingHallInfo.longitude);
    if (!Number.isFinite(lngNum) || lngNum < -180 || lngNum > 180) {
      issues.push({ field: 'longitude', label: '경도', message: '경도는 -180~180 범위의 숫자여야 합니다.' });
    }
  }

  return issues;
}

function checkPhone(
  phone: { number?: string } | undefined,
  field: string,
  label: string,
  issues: ValidationIssue[],
) {
  const num = phone?.number?.trim();
  if (num && !/^\d{9,11}$/.test(num)) {
    issues.push({ field, label, message: '전화번호는 9~11자리 숫자만 입력해 주세요.' });
  }
}

function checkEmail(
  email: string | undefined,
  field: string,
  label: string,
  issues: ValidationIssue[],
) {
  const mail = email?.trim();
  if (mail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail)) {
    issues.push({ field, label, message: '올바른 이메일 형식이 아닙니다.' });
  }
}

function checkAccounts(
  accounts: Array<{ accountNumber?: string }> | undefined,
  fieldPrefix: string,
  labelPrefix: string,
  issues: ValidationIssue[],
) {
  if (!accounts) return;
  accounts.forEach((acct, index) => {
    const num = acct.accountNumber?.trim();
    if (num && !/^[0-9-]+$/.test(num)) {
      issues.push({
        field: `${fieldPrefix}-account-${index}`,
        label: `${labelPrefix} 계좌번호`,
        message: '계좌번호는 숫자와 하이픈(-)만 입력해 주세요.',
      });
    }
  });
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
