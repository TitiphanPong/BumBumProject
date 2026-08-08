'use client';

import { ConfigProvider } from 'antd';
import thTH from 'antd/locale/th_TH';
import dayjs from 'dayjs';
import buddhistEra from 'dayjs/plugin/buddhistEra';

dayjs.extend(buddhistEra);

export default function Providers({ children }: { children: React.ReactNode }) {
  return <ConfigProvider locale={thTH}>{children}</ConfigProvider>;
}
