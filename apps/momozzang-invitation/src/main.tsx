import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import AppWrapper from './page/AppWrapper';
import Layout from './Layout';
import '@momozzang/ui/src/index.css';
import './styles/global.css';
import 'dayjs/locale/ko';
import dayjs from 'dayjs';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
dayjs.locale('ko');

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={new QueryClient()}>
      <Layout>
        <AppWrapper />
      </Layout>
    </QueryClientProvider>
  </StrictMode>,
);
