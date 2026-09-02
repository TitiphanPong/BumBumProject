'use client';

import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  SyncOutlined,
} from '@ant-design/icons';
import { Tag } from 'antd';
import type { ReactNode } from 'react';

type StatusMeta = {
  color: string;
  icon?: ReactNode;
};

const CLAIM_STATUS_META: Record<string, StatusMeta> = {
  ไปตรวจสอบเอง: { color: 'blue', icon: <ClockCircleOutlined /> },
  ไปเคลมเอง: { color: 'blue', icon: <ClockCircleOutlined /> },
  รอตรวจสอบ: { color: 'yellow', icon: <SyncOutlined /> },
  รอเคลม: { color: 'yellow', icon: <SyncOutlined /> },
  จบการตรวจสอบ: { color: 'green', icon: <CheckCircleOutlined /> },
  จบเคลม: { color: 'green', icon: <CheckCircleOutlined /> },
  ยกเลิกการตรวจสอบ: { color: 'red', icon: <CloseCircleOutlined /> },
  ยกเลิกเคลม: { color: 'red', icon: <CloseCircleOutlined /> },
};

function inferStatusColor(value: string): string {
  if (value.startsWith('ไป')) return 'blue';
  if (value.startsWith('รอ')) return 'yellow';
  if (value.startsWith('จบ')) return 'green';
  if (value.startsWith('ยกเลิก')) return 'red';
  return 'default';
}

type ClaimStatusTagProps = {
  value?: string;
  inferUnknownColor?: boolean;
  emptyAsText?: boolean;
};

export default function ClaimStatusTag({
  value,
  inferUnknownColor = false,
  emptyAsText = false,
}: ClaimStatusTagProps) {
  const normalized = (value ?? '').toString().trim();

  if (!normalized) {
    return emptyAsText ? <span style={{ color: '#999' }}>-</span> : <Tag>-</Tag>;
  }

  const meta = CLAIM_STATUS_META[normalized] ?? {
    color: inferUnknownColor ? inferStatusColor(normalized) : 'default',
  };

  return (
    <Tag color={meta.color} icon={meta.icon}>
      {normalized}
    </Tag>
  );
}
