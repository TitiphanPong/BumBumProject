'use client';

import { Layout, Menu } from 'antd';
import {
  HomeOutlined,
  UserOutlined,
  FileFilled,
  ToolFilled,
  SnippetsOutlined,
  DashboardOutlined,
  BarsOutlined,
} from '@ant-design/icons';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { useEffect } from 'react';

const { Sider } = Layout;

export default function Sidebar () {
  const pathname = usePathname();
  const [selectedKey, setSelectedKey] = useState<string>('');
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    setSelectedKey(pathname);
  }, [pathname]);

  const items = [
    {
    key: '/dashboard',
    icon: <HomeOutlined />,
    label: <Link href="/dashboard">หน้าหลัก</Link>,
  },
    {
    key: '/dashboard/claimform',
    icon: <SnippetsOutlined />,
    label: <Link href="/dashboard/claimform">ใบเคลมสินค้า</Link>,
  },
  {
    key: '/dashboard/sparepartform',
    icon: <ToolFilled />,
    label: <Link href="/dashboard/sparepartform">เบิกอะไหล่</Link>,
  },
  {
    key: '/dashboard/dashboardtable',
    icon: <BarsOutlined />,
    label: <Link href="/dashboard/dashboardtable">แก้ไขรายการ</Link>,
  },
];
  return (
<Sider
      onCollapse={(value) => setCollapsed(value)}
      breakpoint="md" // ยุบอัตโนมัติเมื่อหน้าจอ < 768px
      collapsedWidth={70} // แสดงเป็น icon อย่างเดียว
      className="shadow-lg"
      style={{ background: '#001529', padding: '0 10px', minHeight: '100vh' }}
    >
      {!collapsed && (
        <Link href="/dashboard">
    <div
      style={{
              color: 'white',
              textAlign: 'center',
              padding: '24px 12px 12px',
              fontSize: '20px',
              fontWeight: 'bold',
              letterSpacing: '0.5px',
              cursor: 'pointer',
      }}
    >
      <DashboardOutlined style={{ marginRight: 8 }} />
      Dashboard
    </div>
  </Link>
      )}
      <Menu
        theme="dark"
        mode="inline"
        selectedKeys={[selectedKey]}
        defaultOpenKeys={collapsed ? [] : ['edit-data']}
        items={items}
        style={{
          display : 'flex',
          flexDirection : 'column',
          justifyContent : 'flex-start',
          gap: collapsed ? 4 : 4,
          marginTop: collapsed ? 65 : 0,
        }}
      />
    </Sider>
  );
}
