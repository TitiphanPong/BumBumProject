'use client';

import { Layout, Menu } from 'antd';
import {
  UserOutlined,
  FileFilled,
  ToolFilled,
} from '@ant-design/icons';
import Link from 'next/link';
// import '/globals.css';

const { Sider } = Layout;

const items = [
  {
    key: '1',
    icon: <FileFilled />,
    label: <Link href="/dashboard/claimform">ใบเคลมสินค้า</Link>,
  },
  {
    key: '2',
    icon: <ToolFilled />,
    label: <Link href="/dashboard/sparepartform">เบิกอะไหล่</Link>,
  },
  {
    key: '3',
    icon: <UserOutlined />,
    label: <Link href="/dashboard/tableAll">ตารางรวม</Link>,
  },
];

export default function Sidebar() {
  return (
    <Sider collapsedWidth="0" breakpoint="lg" className="bg-white shadow-lg" style={{ background: '#001529' , padding: '0 5px'}}>    
      <div className="logo" style={{ color: 'white', textAlign: 'center', padding: '22px' }}>
        Demo Dashboard
      </div>
      <Menu theme="dark" mode="inline" defaultSelectedKeys={['1']} items={items} />
    </Sider>
  );
}
