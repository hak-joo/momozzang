export type GuestBook = {
  id: number;
  contents: string;
  writer?: string;
  miniMeId: number;
  weddingInvitationId?: string;
  date?: string;
};

export interface SaveGuestBookPayload {
  invitationId?: string | null;
  miniMeId: number;
  nickname: string;
  message: string;
  password: string;
  isMock?: boolean;
}

export interface DeleteGuestBookPayload {
  id: number;
  password: string;
  isMock?: boolean;
}
