import type {
  InvitationRecord,
  InvitationStatus,
  InvitationSummary,
  WeddingInvitation,
} from '../model';

/** `/apply` 신청 저장에 필요한 입력. `editPassword`는 평문이며 저장 시 반드시 해시된다. */
export interface CreateInvitationInput {
  slug: string;
  data: WeddingInvitation;
  editPassword: string;
  applicantContact: string;
}

export interface InvitationRepository {
  getInvitation(id: string): Promise<WeddingInvitation | null>;
  updateInvitation(id: string, data: WeddingInvitation): Promise<void>;

  getInvitationRecord(slug: string): Promise<InvitationRecord | null>;
  createInvitation(input: CreateInvitationInput): Promise<void>;
  listInvitations(status?: InvitationStatus): Promise<InvitationSummary[]>;
  setInvitationStatus(slug: string, status: InvitationStatus): Promise<void>;
  getInvitationForEdit(slug: string, editPassword: string): Promise<WeddingInvitation | null>;
  updateInvitationWithPassword(
    slug: string,
    editPassword: string,
    data: WeddingInvitation,
  ): Promise<void>;
}
