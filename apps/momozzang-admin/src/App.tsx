import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AdminPage from './pages/AdminPage';
import ApplyPage from './pages/ApplyPage/ApplyPage';
import LoginPage from './pages/LoginPage/LoginPage';
import ApprovalsPage from './pages/ApprovalsPage/ApprovalsPage';
import EditPage from './pages/EditPage/EditPage';
import RequireAdmin from './widgets/RequireAdmin/RequireAdmin';

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
  );
}

export default App;
