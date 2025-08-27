'use client';

import { Layout } from 'antd';
import { usePathname } from 'next/navigation';
import Sidebar from './components/Sidebar';
import AppHeader from './components/Header';
import AppFooter from './components/Footer';
import { useMediaQuery } from 'react-responsive';

const { Content } = Layout;

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isMobile = useMediaQuery({ maxWidth: 767 });

  return (
    <Layout style={{ minHeight: '100vh' }}>
      {!isMobile && <Sidebar />} {/* ✅ ซ่อน Sidebar บนมือถือ */}
      <Layout>
        <AppHeader />
        <Content style={{ margin: '24px 16px', padding: 5 }}>{children}</Content>
        <AppFooter />
      </Layout>
    </Layout>
  );
}
