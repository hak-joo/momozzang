import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import OnboardingPage from './OnboardingPage';
import InvitationById from './InvitationById';

function AppWrapper() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<OnboardingPage />} />
        <Route path="/:invitationId" element={<InvitationById />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default AppWrapper;
