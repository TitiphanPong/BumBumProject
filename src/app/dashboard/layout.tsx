'use client';

import { App, Layout, Menu } from 'antd';
import { usePathname } from 'next/navigation';
import Sidebar from './components/Sidebar';
import AppHeader from './components/Header';
import AppFooter from './components/Footer';
import { ClaimProvider } from '../context/ClaimContext';


const { Content } = Layout;

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const selectedKey = pathname.split('/').pop() || 'claimform';

  return (
      <ClaimProvider>
        <Layout style={{ minHeight: '100vh' }}>
          <Sidebar />
          <Layout>
            <AppHeader />
          <Content style={{ margin: '24px 16px', padding: 5}}>
          {children}
        </Content>
        <AppFooter />
      </Layout>
    </Layout>
    </ClaimProvider>
  );
}
