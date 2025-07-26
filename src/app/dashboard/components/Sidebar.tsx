'use client';

import { Layout, Menu } from 'antd';
import {
  UserOutlined,
  FileFilled,
  ToolFilled,
} from '@ant-design/icons';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
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
    key: '/dashboard/claimform',
    icon: <FileFilled />,
    label: <Link href="/dashboard/claimform">ใบเคลมสินค้า</Link>,
  },
  {
    key: '/dashboard/sparepartform',
    icon: <ToolFilled />,
    label: <Link href="/dashboard/sparepartform">เบิกอะไหล่</Link>,
  },
];

  return (
    
<Sider
      onCollapse={(value) => setCollapsed(value)}
      breakpoint="md" // ยุบอัตโนมัติเมื่อหน้าจอ < 768px
      collapsedWidth={80} // แสดงเป็น icon อย่างเดียว
      className="shadow-lg"
      style={{ background: '#001529', padding: '0 5px', minHeight: '100vh' }}
    >
      {!collapsed && (
        <div style={{ color: 'white', textAlign: 'center', padding: '24px' }}>
          Demo Dashboard
        </div>
      )}
      <Menu
        theme="dark"
        mode="inline"
        selectedKeys={[selectedKey]}
        items={items}
        style={{
          display : 'flex',
          flexDirection : 'column',
          justifyContent : 'flex-start',
          gap: collapsed ? 12 : 4,
          marginTop: collapsed ? 80 : 0,
        }}
      />
    </Sider>

  );
}
