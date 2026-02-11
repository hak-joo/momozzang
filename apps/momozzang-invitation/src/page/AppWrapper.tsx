import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import Invitation from './Invitation';
import InvitationById from './InvitationById';

function AppWrapper() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Invitation />} />
        <Route path="/:invitationId" element={<InvitationById />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default AppWrapper;
