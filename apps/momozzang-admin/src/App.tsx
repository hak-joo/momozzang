import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import AdminPage from './pages/AdminPage';
import ApplyPage from './pages/ApplyPage/ApplyPage';
import LoginPage from './pages/LoginPage/LoginPage';
import ApprovalsPage from './pages/ApprovalsPage/ApprovalsPage';
import EditPage from './pages/EditPage/EditPage';
import RequireAdmin from './widgets/RequireAdmin/RequireAdmin';
import { ControlVariantProvider } from '@momozzang/ui/src/shared/ui/ControlVariant';
import { AdminToastProvider } from './shared/ui/Toast';
import { AdminConfirmProvider } from './shared/ui/ConfirmDialog';

const router = createBrowserRouter([
  { path: '/', element: <Navigate to="/admin" replace /> },
  { path: '/login', element: <LoginPage /> },
  {
    path: '/admin',
    element: (
      <RequireAdmin>
        <ApprovalsPage />
      </RequireAdmin>
    ),
  },
  {
    path: '/admin/edit',
    element: (
      <RequireAdmin>
        <AdminPage />
      </RequireAdmin>
    ),
  },
  { path: '/apply', element: <ApplyPage /> },
  { path: '/edit', element: <EditPage /> },
]);

function App() {
  return (
    <ControlVariantProvider value="admin">
      <AdminToastProvider>
        <AdminConfirmProvider>
          <RouterProvider router={router} />
        </AdminConfirmProvider>
      </AdminToastProvider>
    </ControlVariantProvider>
  );
}

export default App;
