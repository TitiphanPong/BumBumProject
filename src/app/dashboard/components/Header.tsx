'use client';

import {
  BarsOutlined,
  HomeOutlined,
  MenuOutlined,
  ProfileOutlined,
  SnippetsOutlined,
  ToolOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { Breadcrumb, Button, Drawer, Grid, Layout, Menu } from 'antd';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import {
  DASHBOARD_NAVIGATION,
  DASHBOARD_PATH_LABELS,
  type DashboardNavigationIcon,
} from './navigation';

const { Header } = Layout;
const { useBreakpoint } = Grid;

const ICONS: Record<DashboardNavigationIcon, React.ReactNode> = {
  home: <HomeOutlined />,
  claim: <SnippetsOutlined />,
  spare: <ToolOutlined />,
  table: <BarsOutlined />,
  parts: <ProfileOutlined />,
  person: <UserOutlined />,
};

const mobileItems = DASHBOARD_NAVIGATION.map(item => ({
  key: item.key,
  icon: ICONS[item.icon],
  label: <Link href={item.key}>{item.label}</Link>,
}));

export default function AppHeader() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const isMobile = !useBreakpoint().md;
  const pathname = usePathname();

  const generateBreadcrumb = () => {
    const parts = pathname.split('/').filter(Boolean);
    return parts.map((part, index) => {
      const url = '/' + parts.slice(0, index + 1).join('/');
      return {
        title: <Link href={url}>{DASHBOARD_PATH_LABELS[part] || part}</Link>,
      };
    });
  };

  return (
    <>
      <Header
        style={{
          background: 'rgba(255, 255, 255, 0.94)',
          padding: isMobile ? '0 16px' : '0 24px',
          height: 64,
          lineHeight: 'normal',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid #E2E8F0',
          position: 'sticky',
          top: 0,
          zIndex: 40,
          backdropFilter: 'blur(8px)',
        }}>
        <div style={{ display: 'flex', minWidth: 0, alignItems: 'center', gap: 12 }}>
          {isMobile && (
            <Button
              type="text"
              icon={<MenuOutlined />}
              onClick={() => setDrawerOpen(true)}
              style={{
                fontSize: 18,
                padding: 4,
                height: 32,
                width: 32,
                flexShrink: 0,
                borderRadius: 8,
                color: '#475569',
                background: 'transparent',
              }}
              aria-label="เปิดเมนู"
            />
          )}

          <Breadcrumb
            className="min-w-0 overflow-hidden [&>ol]:flex-nowrap [&>ol]:overflow-hidden [&_li]:whitespace-nowrap"
            separator="/"
            items={generateBreadcrumb()}
            style={{ minWidth: 0, fontSize: 14, fontWeight: 500, color: '#475569' }}
          />
        </div>
      </Header>

      {isMobile && (
        <Drawer
          title={<span style={{ color: '#0F172A', fontWeight: 600 }}>เมนูระบบ</span>}
          placement="left"
          onClose={() => setDrawerOpen(false)}
          open={drawerOpen}
          width={280}
          styles={{
            header: { borderBottom: '1px solid #E2E8F0', padding: '16px 20px' },
            body: { padding: '12px 8px' },
          }}
          style={{
            border: 'none',
            boxShadow: 'none',
          }}>
          <Menu
            mode="vertical"
            selectedKeys={[pathname]}
            items={mobileItems}
            onClick={() => setDrawerOpen(false)}
            style={{
              borderRight: 'none',
            }}
          />
        </Drawer>
      )}
    </>
  );
}
