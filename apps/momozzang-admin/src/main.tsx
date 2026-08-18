import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import 'dayjs/locale/ko';
import dayjs from 'dayjs';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

/**
 * dayjs 전역 로케일은 **앱 엔트리별** 설정이다.
 * invitation 엔트리(`apps/momozzang-invitation/src/main.tsx`)에는 이 한 줄이 있고 admin 에는
 * 없었기 때문에, 같은 공유 위젯(`packages/ui` 의 `WeddingDay`)이 뷰어에서는 `화요일`,
 * 어드민 폰 미리보기에서는 `Thursday` 로 갈렸다(계약 4 §0.3 실측).
 * 뷰어와 `packages/ui` 는 0줄도 건드리지 않고 이 한 줄로 닫는다.
 */
dayjs.locale('ko');

const queryClient = new QueryClient();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
);
