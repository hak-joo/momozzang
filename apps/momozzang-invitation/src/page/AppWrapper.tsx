import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import Invitation from './Invitation';
import InvitationById from './InvitationById';
import Admin from './Admin';

function AppWrapper() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Invitation />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/:invitationId" element={<InvitationById />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default AppWrapper;
