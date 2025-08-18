import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import AppWrapper from './page/AppWrapper';
import '@momozzang/ui/index.css';
import Layout from './Layout';
import './styles/global.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Layout>
      <AppWrapper />
    </Layout>
  </StrictMode>,
);
