'use client';

import { Layout, Button, Drawer, Menu, Breadcrumb } from 'antd';
import {
  MenuOutlined,
  HomeOutlined,
  SnippetsOutlined,
  ToolFilled,
  BarsOutlined,
} from '@ant-design/icons';
import { useState } from 'react';
import { useMediaQuery } from 'react-responsive';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const { Header } = Layout;

export default function AppHeader() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const isMobile = useMediaQuery({ maxWidth: 767 });
  const pathname = usePathname();

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

  const pathLabelMap: Record<string, string> = {
    dashboard: 'หน้าหลัก',
    claimform: 'ใบเคลมสินค้า',
    sparepartform: 'เบิกอะไหล่',
    dashboardtable: 'แก้ไขรายการ',
    'table-claim': 'แก้ไขตารางใบเคลม',
    'table-spare': 'แก้ไขตารางเบิกอะไหล่',
  };

  const generateBreadcrumb = () => {
    const parts = pathname.split('/').filter(Boolean);
    return parts.map((part, index) => {
      const url = '/' + parts.slice(0, index + 1).join('/');
      return {
        title: <Link href={url}>{pathLabelMap[part] || part}</Link>,
      };
    });
  };

  return (
    <>
      <Header
          style={{
            background: '#fff',
            padding: '0 24px',
            height: 64,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          }}
        >
          {/* ✅ ซ้าย: Hamburger (เฉพาะ mobile) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
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
                  borderRadius: 6,
                  background: 'transparent',
                }}
              />
            )}

            {/* ✅ Breadcrumb */}
            <Breadcrumb
              separator=">"
              items={generateBreadcrumb()}
              style={{ fontSize: 14 }}
            />
          </div>

          {/* ขวา: โปรไฟล์ ฯลฯ (ถ้ามี) */}
        </Header>


      {/* Drawer สำหรับ Mobile */}
      {isMobile && (
        <Drawer
          title="เมนู"
          placement="left"
          onClose={() => setDrawerOpen(false)}
          open={drawerOpen}
          width={280}
          style={{
            border: 'none',
            boxShadow: 'none',
          }}
        >
          <Menu
            mode="vertical"
            selectedKeys={[pathname]}
            items={items}
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
