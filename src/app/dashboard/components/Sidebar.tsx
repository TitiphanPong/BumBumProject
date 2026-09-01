'use client';

import {
  HomeOutlined,
  InsertRowAboveOutlined,
  ProfileOutlined,
  SnippetsOutlined,
  ToolOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { Avatar, Layout, Menu } from 'antd';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import {
  DASHBOARD_NAVIGATION,
  type DashboardNavigationIcon,
} from './navigation';

const { Sider } = Layout;

const ICONS: Record<DashboardNavigationIcon, React.ReactNode> = {
  home: <HomeOutlined />,
  claim: <SnippetsOutlined />,
  spare: <ToolOutlined />,
  table: <InsertRowAboveOutlined />,
  parts: <ProfileOutlined />,
  person: <UserOutlined />,
};

const items = DASHBOARD_NAVIGATION.map(item => ({
  key: item.key,
  icon: ICONS[item.icon],
  label: <Link href={item.key}>{item.label}</Link>,
  children: item.children?.map(child => ({
    key: child.key,
    label: <Link href={child.key}>{child.label}</Link>,
  })),
}));

export default function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <Sider
      collapsible
      collapsed={collapsed}
      onCollapse={value => setCollapsed(value)}
      trigger={null}
      width={240}
      style={{
        background: '#f9f9f9',
        borderRight: '1px solid #eaeaea',
        minHeight: '100vh',
        position: 'relative',
      }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 5,
          padding: '16px',
          textAlign: 'center',
          marginTop: 5,
        }}>
        <Avatar shape="circle" size={48} src="/Logo LINE -แจ้งเคลม.png" />
        {!collapsed && (
          <div style={{ fontSize: 18, fontWeight: 'bold', color: '#333' }}>ClaimSNProgress</div>
        )}
      </div>

      <Menu
        mode="inline"
        selectedKeys={[pathname]}
        defaultOpenKeys={['/dashboard/dashboardtable']}
        items={items}
        style={{
          background: '#f9f9f9',
          fontSize: 15,
          fontWeight: 500,
          borderRight: 'none',
        }}
      />
    </Sider>
  );
}
