import { createContext, useContext, useEffect, useMemo } from 'react';
import type { WeddingInvitation } from './model';

const InvitationContext = createContext<WeddingInvitation | null>(null);

/**
 * 미리보기(신청 폼 좌측 폰 프레임) 여부를 나타내는 컨텍스트.
 * - `Gallery`는 라우트 파라미터(`invitationId`) 없이도 폼의 `album`을 실제로 렌더해야 하므로
 *   이 플래그가 true면 MOCK 갤러리 대신 실제 `album`을 그린다(G1 해소).
 * - `Direction`은 이 플래그가 true면 tel:/외부 지도 앱 이동 같은 부작용을 차단한다(D1 처리).
 */
const PreviewModeContext = createContext<boolean>(false);

export function InvitationProvider({
  data,
  previewMode = false,
  children,
}: {
  data: WeddingInvitation;
  /** 신청 폼 미리보기 모드. true면 album을 실제 렌더하고 외부 이동 부작용을 차단한다. */
  previewMode?: boolean;
  children: React.ReactNode;
}) {
  const value = useMemo(() => data, [data]);

  useEffect(() => {
    // 미리보기 모드에서는 폼 입력이 브라우저 탭 제목을 덮어쓰지 않도록 한다.
    if (!previewMode && data.invitationInfo.title) {
      document.title = data.invitationInfo.title;
    }
  }, [data.invitationInfo.title, previewMode]);

  return (
    <InvitationContext.Provider value={value}>
      <PreviewModeContext.Provider value={previewMode}>{children}</PreviewModeContext.Provider>
    </InvitationContext.Provider>
  );
}

export function useInvitation(): WeddingInvitation {
  const ctx = useContext(InvitationContext);
  if (!ctx) throw new Error('InvitationContext not found: wrap with <InvitationProvider>.');
  return ctx;
}

/** 신청 폼 미리보기 모드 여부. 위젯이 mock/부작용 분기를 결정할 때 사용한다. */
export function useIsPreviewMode(): boolean {
  return useContext(PreviewModeContext);
}
