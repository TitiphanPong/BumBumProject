'use client';

import { Layout } from 'antd';
import Sidebar from './components/Sidebar';
import AppHeader from './components/Header';
import AppFooter from './components/Footer';

const { Content } = Layout;

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <Layout style={{ minHeight: '100vh' }}>
      <div className="hidden md:block">
        <Sidebar />
      </div>
      <Layout>
        <AppHeader />
        <Content className="mx-4 my-6 p-[5px]">{children}</Content>
        <AppFooter />
      </Layout>
    </Layout>
  );
}
