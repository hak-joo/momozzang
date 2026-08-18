import { hashPassword } from '../../../shared/lib/hashPassword';
import type {
  InvitationRecord,
  InvitationStatus,
  InvitationSummary,
  WeddingInvitation,
} from '../model';
import type { CreateInvitationInput, InvitationRepository } from './types';

/**
 * 로컬(비-Supabase) 환경용 청첩장 저장소.
 *
 * 이전에는 `getInvitation`이 slug와 무관하게 항상 시드를 반환하고 `updateInvitation`이
 * no-op이라 저장→재불러오기 라운드트립이 불가능했다(스프린트 3 [G2]).
 * 이제 `localStorage`에 slug별로 영속해 실제 Supabase에 쓰지 않고도 라운드트립이 성립한다.
 * 저장된 값이 없는 slug는 `null`을 반환한다(N1) — 미존재 슬러그 불러오기가
 * "성공"으로 오인되지 않게 하고, Supabase 구현체(실 조회 시 미존재면 null)와 동작을 일치시킨다.
 * 신규 진입 시 시드 시작은 폼(`useApplyForm`)이 직접 `exampleWeddingInvitation`을 초기값으로
 * 쓰므로 이 저장소 변경의 영향을 받지 않는다.
 *
 * 비즈니스 플로우(신청 → 승인 → 편집) 도입으로 저장 값이 평문 `WeddingInvitation` 에서
 * 아래 `StoredInvitation` 레코드로 바뀐다. 키 접두사(`momozzang:invitation:`)는 유지하며,
 * 구 포맷 값은 읽는 시점에 `approved` 로 자동 승격(migration-on-read)하고 즉시 write-back 한다.
 * 승격이 없으면 마이그레이션 이전에 저장된 청첩장이 전부 열리지 않는다.
 */
const STORAGE_PREFIX = 'momozzang:invitation:';

/** 1회 조회당 최대 행 수. Supabase 구현의 `.limit(100)` 과 같은 상한을 로컬에도 적용한다. */
const LIST_LIMIT = 100;

/** 저장 전용 내부 타입. `editPasswordHash` 는 외부로 절대 반환하지 않는다. */
type StoredInvitation = {
  slug: string;
  status: InvitationStatus;
  editPasswordHash: string | null;
  data: WeddingInvitation;
  applicantContact: string;
  createdAt: string;
  approvedAt: string | null;
};

const DUPLICATE_SLUG_MESSAGE = '이미 사용 중인 슬러그입니다.';
const INVALID_CREDENTIALS_MESSAGE = '슬러그 또는 비밀번호가 올바르지 않습니다.';
const NO_STORAGE_MESSAGE = 'localStorage를 사용할 수 없어 저장에 실패했습니다.';

function storageKey(slug: string): string {
  return `${STORAGE_PREFIX}${slug}`;
}

function hasStorage(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

/** 신 포맷(레코드) 판별. 셋 중 하나라도 어긋나면 구 포맷으로 본다. */
function isStoredInvitation(value: unknown): value is StoredInvitation {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const candidate = value as Partial<StoredInvitation>;

  return (
    typeof candidate.slug === 'string' &&
    typeof candidate.status === 'string' &&
    candidate.data !== undefined
  );
}

/** 구 포맷(평문 `WeddingInvitation`) 값을 승인된 레코드로 승격한다. */
function promoteLegacy(slug: string, value: unknown): StoredInvitation | null {
  if (typeof value !== 'object' || value === null) {
    return null;
  }

  const now = new Date().toISOString();

  return {
    slug,
    status: 'approved',
    editPasswordHash: null,
    data: value as WeddingInvitation,
    applicantContact: '',
    createdAt: now,
    approvedAt: now,
  };
}

function writeStored(stored: StoredInvitation): void {
  if (!hasStorage()) {
    throw new Error(NO_STORAGE_MESSAGE);
  }
  window.localStorage.setItem(storageKey(stored.slug), JSON.stringify(stored));
}

/**
 * localStorage 를 읽는 **모든** 경로가 거치는 단일 진입점.
 * 구 포맷을 만나면 승격 결과를 같은 키에 write-back 해 `createdAt`/`approvedAt` 을 고정한다.
 */
function readStored(slug: string): StoredInvitation | null {
  if (!hasStorage()) {
    return null;
  }

  const raw = window.localStorage.getItem(storageKey(slug));
  if (!raw) {
    return null;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    // 파싱 불가 값은 없는 것으로 취급한다.
    return null;
  }

  if (isStoredInvitation(parsed)) {
    return parsed;
  }

  const promoted = promoteLegacy(slug, parsed);
  if (!promoted) {
    return null;
  }

  try {
    writeStored(promoted);
  } catch {
    // 쿼터 초과·프라이빗 모드에서 write-back 이 실패해도 승격 결과는 돌려준다.
    // 레거시 레코드 1건 때문에 목록/뷰어 전체가 죽지 않게 한다.
  }

  return promoted;
}

/** 저장된 모든 슬러그. write-back 으로 인덱스가 흔들리지 않게 키를 먼저 모은다. */
function listStoredSlugs(): string[] {
  if (!hasStorage()) {
    return [];
  }

  const slugs: string[] = [];
  for (let index = 0; index < window.localStorage.length; index += 1) {
    const key = window.localStorage.key(index);
    if (key && key.startsWith(STORAGE_PREFIX)) {
      slugs.push(key.slice(STORAGE_PREFIX.length));
    }
  }

  return slugs;
}

/** 외부 반환용 변환. `editPasswordHash` 를 제거한다. */
function toRecord(stored: StoredInvitation): InvitationRecord {
  return {
    slug: stored.slug,
    status: stored.status,
    data: stored.data,
    applicantContact: stored.applicantContact,
    createdAt: stored.createdAt,
    approvedAt: stored.approvedAt,
  };
}

/** 목록용 변환. `editPasswordHash` 와 본문 `data` 를 둘 다 제거한다. */
function toSummary(stored: StoredInvitation): InvitationSummary {
  return {
    slug: stored.slug,
    status: stored.status,
    applicantContact: stored.applicantContact,
    createdAt: stored.createdAt,
    approvedAt: stored.approvedAt,
  };
}

export class LocalInvitationRepository implements InvitationRepository {
  async getInvitation(id: string): Promise<WeddingInvitation | null> {
    // 기존 동작과 유사하게 약간의 비동기 지연을 둔다(로딩 표시 검증 호환).
    await new Promise((resolve) => setTimeout(resolve, 200));

    // 구 포맷도 readStored 가 승격해 주므로 기존 청첩장이 그대로 열린다.
    const stored = readStored(id);
    return stored ? stored.data : null;
  }

  async updateInvitation(id: string, data: WeddingInvitation): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 200));
    if (!hasStorage()) {
      throw new Error(NO_STORAGE_MESSAGE);
    }

    const stored = readStored(id);
    if (stored) {
      // status/createdAt/applicantContact/editPasswordHash/approvedAt 은 보존한다.
      writeStored({ ...stored, data });
      return;
    }

    // 레코드가 없으면 새로 만든다(관리자 전용 /admin/edit 경로 회귀 방지).
    const now = new Date().toISOString();
    writeStored({
      slug: id,
      status: 'approved',
      editPasswordHash: null,
      data,
      applicantContact: '',
      createdAt: now,
      approvedAt: now,
    });
  }

  async getInvitationRecord(slug: string): Promise<InvitationRecord | null> {
    const stored = readStored(slug);
    return stored ? toRecord(stored) : null;
  }

  async createInvitation(input: CreateInvitationInput): Promise<void> {
    if (!hasStorage()) {
      throw new Error(NO_STORAGE_MESSAGE);
    }

    if (readStored(input.slug)) {
      throw new Error(DUPLICATE_SLUG_MESSAGE);
    }

    writeStored({
      slug: input.slug,
      status: 'pending',
      editPasswordHash: await hashPassword(input.editPassword),
      data: input.data,
      applicantContact: input.applicantContact,
      createdAt: new Date().toISOString(),
      approvedAt: null,
    });
  }

  async listInvitations(status?: InvitationStatus): Promise<InvitationSummary[]> {
    const summaries = listStoredSlugs()
      .map((slug) => readStored(slug))
      .filter((stored): stored is StoredInvitation => stored !== null)
      .filter((stored) => (status ? stored.status === status : true))
      .map(toSummary);

    // 최신 신청이 위로 오도록 created_at 내림차순 정렬한 **뒤에** 상한을 적용한다.
    // 먼저 자르면 최신순 상위 100건이 아니라 임의 100건이 된다.
    return summaries.sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, LIST_LIMIT);
  }

  async setInvitationStatus(slug: string, status: InvitationStatus): Promise<void> {
    const stored = readStored(slug);
    if (!stored) {
      throw new Error('존재하지 않는 청첩장입니다.');
    }

    writeStored({
      ...stored,
      status,
      approvedAt: status === 'approved' ? new Date().toISOString() : null,
    });
  }

  async getInvitationForEdit(slug: string, editPassword: string): Promise<WeddingInvitation | null> {
    const stored = readStored(slug);
    // 슬러그 미존재와 비밀번호 불일치를 구분해 알려주지 않는다.
    if (!stored || !stored.editPasswordHash) {
      return null;
    }

    const hashed = await hashPassword(editPassword);
    return hashed === stored.editPasswordHash ? stored.data : null;
  }

  async updateInvitationWithPassword(
    slug: string,
    editPassword: string,
    data: WeddingInvitation,
  ): Promise<void> {
    const stored = readStored(slug);
    if (!stored || !stored.editPasswordHash) {
      throw new Error(INVALID_CREDENTIALS_MESSAGE);
    }

    const hashed = await hashPassword(editPassword);
    if (hashed !== stored.editPasswordHash) {
      throw new Error(INVALID_CREDENTIALS_MESSAGE);
    }

    writeStored({ ...stored, data });
  }
}
