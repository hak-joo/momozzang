import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AdminPage from './pages/AdminPage';
import ApplyPage from './pages/ApplyPage/ApplyPage';
import { AdminToastProvider } from './shared/ui/Toast';
import { AdminConfirmProvider } from './shared/ui/ConfirmDialog';

/**
 * 어드민 피드백 provider 는 **라우터 바깥의 최상단**에 둔다.
 * - `/apply`·`/admin` 양쪽에서 렌더되는 `GalleryManager` 가 한 번에 덮인다.
 * - `PhonePreview` 내부의 `PortalContainerProvider`(=폰 프레임 `.screen`) 바깥이므로
 *   확인 다이얼로그가 미리보기 안으로 빨려 들어가지 않는다(계약 4 §6 R7).
 * - 미리보기 안 뷰어 `ToastProvider` 는 그대로 둔다 — 별도 컨텍스트라 서로 간섭하지 않는다.
 */
function App() {
  return (
    <AdminToastProvider>
      <AdminConfirmProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Navigate to="/admin" replace />} />
            <Route path="/admin" element={<AdminPage />} />
            <Route path="/apply" element={<ApplyPage />} />
          </Routes>
        </BrowserRouter>
      </AdminConfirmProvider>
    </AdminToastProvider>
  );
}

export default App;
