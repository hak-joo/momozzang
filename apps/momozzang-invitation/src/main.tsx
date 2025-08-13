import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import Invitation from './Invitation';
import '@momozzang/ui/index.css';
import Layout from './Layout';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Layout>
      <Invitation />
    </Layout>
  </StrictMode>,
);
