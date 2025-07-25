'use client';

import { Layout } from 'antd';
const { Header } = Layout;

export default function AppHeader() {
  return (
    <Header style={{ background: '#fff', padding: 0 }}>
      <h1 style={{ marginLeft: 16 }}></h1>
    </Header>
  );
}