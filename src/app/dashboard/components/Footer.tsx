'use client';

import { Layout } from 'antd';
const { Footer } = Layout;

export default function AppFooter() {
  return (
    <Footer
      style={{
        fontSize: 16,
        textAlign: 'center',
        backgroundColor: '#ffffffff',
        color: 'black',
        padding: '25px 0',
      }}>
      S.N. Progress Co.,LTD
    </Footer>
  );
}
