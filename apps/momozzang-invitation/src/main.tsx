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

/**
 * 뷰어는 하객 한 명이 한 청첩장을 여러 번 여닫는 read-heavy 패턴이다.
 * 기본값(staleTime 0 + 포커스 복귀마다 재조회)이면 같은 데이터를 계속 다시 받아
 * Supabase Free 한도(egress·요청 수)를 헛되이 소모한다.
 *
 * 새 글 반영은 뮤테이션 쪽 invalidateQueries 가 담당하므로, 여기서 캐시를 길게 잡아도
 * 본인이 방금 쓴 방명록이 늦게 보이는 일은 없다.
 *
 * 모듈 레벨 상수인 이유: JSX 안에서 만들면 루트가 다시 렌더될 때 캐시가 통째로 날아간다.
 */
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      refetchOnWindowFocus: false,
    },
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <Layout>
        <AppWrapper />
      </Layout>
    </QueryClientProvider>
  </StrictMode>,
);
