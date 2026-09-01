'use client';

import { Grid } from 'antd';
import dynamic from 'next/dynamic';

const DesktopSidebar = dynamic(() => import('./Sidebar'), { ssr: false });

export default function DesktopSidebarGate() {
  const screens = Grid.useBreakpoint();

  if (screens.md !== true) return null;
  return <DesktopSidebar />;
}
