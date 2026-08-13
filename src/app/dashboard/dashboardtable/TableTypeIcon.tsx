'use client';

import { EditOutlined, ToolOutlined } from '@ant-design/icons';

export default function TableTypeIcon({ type }: { type: 'claim' | 'spare' }) {
  const className = 'text-5xl text-blue-500 transition-colors group-hover:text-white';
  return type === 'claim' ? (
    <EditOutlined className={className} />
  ) : (
    <ToolOutlined className={className} />
  );
}
