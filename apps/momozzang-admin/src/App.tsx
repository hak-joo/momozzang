import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AdminPage from './pages/AdminPage';
import ApplyPage from './pages/ApplyPage/ApplyPage';
import LoginPage from './pages/LoginPage/LoginPage';
import ApprovalsPage from './pages/ApprovalsPage/ApprovalsPage';
import EditPage from './pages/EditPage/EditPage';
import RequireAdmin from './widgets/RequireAdmin/RequireAdmin';
import { ControlVariantProvider } from '@momozzang/ui/src/shared/ui/ControlVariant';
import { AdminToastProvider } from './shared/ui/Toast';
import { AdminConfirmProvider } from './shared/ui/ConfirmDialog';

/**
 * 어드민 피드백 provider 는 **라우터 바깥의 최상단**에 둔다.
 * - `/apply`·`/admin` 양쪽에서 렌더되는 `GalleryManager` 가 한 번에 덮인다.
 * - `PhonePreview` 내부의 `PortalContainerProvider`(=폰 프레임 `.screen`) 바깥이므로
 *   확인 다이얼로그가 미리보기 안으로 빨려 들어가지 않는다(계약 4 §6 R7).
 * - 미리보기 안 뷰어 `ToastProvider` 는 그대로 둔다 — 별도 컨텍스트라 서로 간섭하지 않는다.
 *
 * `ControlVariantProvider value="admin"` 도 여기 둔다 — 어드민 앱의 폼 컨트롤 기본 언어는 어드민 크롬이다.
 * `/login`·`/admin`·`/edit` 처럼 자체 provider 가 없는 화면까지 한 번에 덮이고,
 * 폰 미리보기는 내부에서 다시 `invitation` 으로 되돌리므로 뷰어 렌더는 0 변화다.
 */
function App() {
  // 가드가 걸린 화면은 element 를 변수로 빼 라우트표 6줄이 한눈에 들어오게 한다.
  const approvalsRoute = (
    <RequireAdmin>
      <ApprovalsPage />
    </RequireAdmin>
  );
  const invitationEditRoute = (
    <RequireAdmin>
      <AdminPage />
    </RequireAdmin>
  );

  return (
    <ControlVariantProvider value="admin">
      <AdminToastProvider>
        <AdminConfirmProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Navigate to="/admin" replace />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/admin" element={approvalsRoute} />
              <Route path="/admin/edit" element={invitationEditRoute} />
              <Route path="/apply" element={<ApplyPage />} />
              {/* /edit 는 공개 라우트다. 신청자는 계정이 없고, 접근 통제는 편집 비밀번호 게이트가 한다. */}
              <Route path="/edit" element={<EditPage />} />
            </Routes>
          </BrowserRouter>
        </AdminConfirmProvider>
      </AdminToastProvider>
    </ControlVariantProvider>
  );
}

export default App;
