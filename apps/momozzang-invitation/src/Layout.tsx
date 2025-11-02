import type { PropsWithChildren } from 'react';
import { ToastProvider } from '@shared/ui/Toast';

function Layout({ children }: PropsWithChildren) {
  return (
    <ToastProvider>
      <div className="app-frame">{children}</div>
    </ToastProvider>
  );
}

export default Layout;
