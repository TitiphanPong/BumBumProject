'use client';

import { Layout, Menu, Avatar, Divider } from 'antd';
import {
  HomeOutlined,
  SnippetsOutlined,
  ToolOutlined,
  InsertRowAboveOutlined,
  ProfileOutlined,
  UserOutlined,
} from '@ant-design/icons';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';

const { Sider } = Layout;

export default function Sidebar() {
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
      icon: <ToolOutlined />,
      label: <Link href="/dashboard/sparepartform">เบิกอะไหล่</Link>,
    },
    {
      key: '/dashboard/dashboardtable',
      icon: <InsertRowAboveOutlined />,
      label: <Link href="/dashboard/dashboardtable">ตารางแก้ไข</Link>,
      children: [
        {
          key: '/dashboard/dashboardtable/table-claim',
          label: <Link href="/dashboard/dashboardtable/table-claim">แก้ไขตารางใบเคลม</Link>,
        },
        {
          key: '/dashboard/dashboardtable/table-spare',
          label: <Link href="/dashboard/dashboardtable/table-spare">แก้ไขตารางเบิกอะไหล่</Link>,
        },
      ],
    },
    {
      key: '/dashboard/partsprice',
      icon: <ProfileOutlined />,
      label: <Link href="/dashboard/partsprice">ราคาอะไหล่และมอเตอร์</Link>,
    },
    {
      key: '/dashboard/resultclaimperson',
      icon: <UserOutlined />,
      label: <Link href="/dashboard/resultclaimperson">สรุปผลการเคลม</Link>,
    },
  ];

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

      {/* ✅ Divider แยกระหว่างเมนูกับ footer */}
      {/* <Divider style={{ margin: '1px 0', borderColor: '#eaeaea' }} /> */}

      <Menu
        mode="inline"
        selectedKeys={[selectedKey]}
        defaultOpenKeys={['tasks']}
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
