import { type WeddingInvitation } from '@momozzang/ui/src/entities/WeddingInvitation/model';
import { getSlugError } from './validateSlug';

export interface ValidationIssue {
  field: string;
  label: string;
  message: string;
}

/**
 * 저장(F14) 전 필수값/형식 검증.
 * 필수값: 슬러그, 제목, 신랑 이름, 신부 이름, 예식 날짜.
 * 형식: 슬러그 패턴, 시(1~12)/분(0~59) 범위.
 */
export function validateInvitation(data: WeddingInvitation): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const { invitationInfo, couple, weddingHallInfo } = data;

  if (!invitationInfo.url.trim()) {
    issues.push({ field: 'slug', label: '초대장 주소(슬러그)', message: '슬러그를 입력해 주세요.' });
  } else {
    const slugErr = getSlugError(invitationInfo.url);
    if (slugErr) {
      issues.push({ field: 'slug', label: '초대장 주소(슬러그)', message: slugErr });
    }
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

  if (!Number.isFinite(weddingHallInfo.hour) || weddingHallInfo.hour < 1 || weddingHallInfo.hour > 12) {
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
