'use client';

import { Layout } from 'antd';
import Image from 'next/image';
import Link from 'next/link';
const { Footer } = Layout;

export default function AppFooter() {
  return (
    <Footer
      style={{
        backgroundColor: '#FFFFFF',
        borderTop: '1px solid #E2E8F0',
        padding: '20px 24px',
      }}>
      <div className="mx-auto flex w-full max-w-7xl flex-col items-center gap-3 text-center sm:flex-row sm:justify-between sm:text-left">
        <Link
          href="/"
          className="flex items-center gap-2 rounded-lg focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-100">
          <Image
            src="/favicon.ico"
            alt="ClaimSN Progress"
            width={28}
            height={28}
            className="rounded-md"
          />
          <div>
            <p className="text-sm font-semibold leading-5 text-slate-900">ClaimSN Progress</p>
            <p className="text-xs leading-4 text-slate-500">ระบบจัดการเคลมสินค้า</p>
          </div>
        </Link>
        <div className="text-xs leading-5 text-slate-400 sm:text-right">
          <p>© 2569 ClaimSN Progress</p>
          <p>Developed by Titiphan Pongsuwan</p>
        </div>
      </div>
    </Footer>
  );
}
