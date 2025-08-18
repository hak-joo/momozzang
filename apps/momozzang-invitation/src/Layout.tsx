import type { PropsWithChildren } from 'react';

function Layout({ children }: PropsWithChildren) {
  return <div className="app-frame">{children}</div>;
}

export default Layout;
