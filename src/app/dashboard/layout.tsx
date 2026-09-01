'use client';

import { Grid, Layout } from 'antd';
import dynamic from 'next/dynamic';
import AppHeader from './components/Header';
import AppFooter from './components/Footer';
import Providers from '../providers';

const { Content } = Layout;
const { useBreakpoint } = Grid;
const DesktopSidebar = dynamic(() => import('./components/Sidebar'), { ssr: false });

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const screens = useBreakpoint();
  const showDesktopSidebar = screens.md === true;

  return (
    <Providers>
      <Layout style={{ minHeight: '100vh' }}>
        {showDesktopSidebar && <DesktopSidebar />}
        <Layout>
          <AppHeader />
          <Content className="mx-4 my-6 p-[5px]">{children}</Content>
          <AppFooter />
        </Layout>
      </Layout>
    </Providers>
  );
}
