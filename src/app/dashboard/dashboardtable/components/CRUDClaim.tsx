'use client';

import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import { formatClaimDateForDisplay } from '@/lib/claim-date';
import type { SheetRow } from '@/lib/sheet-types';
import ClaimStatusTag from '../../components/ClaimStatusTag';
import DashboardDataTable, { createRowActionColumn } from '../../components/DashboardDataTable';

interface CRUDClaimProps {
  data: SheetRow[];
  onEdit: (record: SheetRow) => void;
  onRefresh?: () => void;
  loading?: boolean;
  pagination?: TablePaginationConfig;
}

const renderStatusTag = (value: string) => <ClaimStatusTag value={value} />;

export default function CRUDClaim({
  data,
  onEdit,
  onRefresh,
  loading,
  pagination,
}: CRUDClaimProps) {
  const columns: ColumnsType<SheetRow> = [
    { title: 'สาขา', dataIndex: 'ProvinceName', key: 'provinceName' },
    { title: 'ชื่อลูกค้า', dataIndex: 'CustomerName', key: 'customerName' },
    {
      title: 'วันที่ซื้อ',
      dataIndex: 'buyProductDate',
      key: 'buyProductDate',
      render: formatClaimDateForDisplay,
    },
    { title: 'คนตรวจสอบ', dataIndex: 'inspector', key: 'inspector' },
    {
      title: 'สถานะการตรวจสอบ',
      dataIndex: 'inspectstatus',
      key: 'inspectstatus',
      render: renderStatusTag,
    },
    { title: 'คนไปเคลม', dataIndex: 'claimSender', key: 'claimSender' },
    {
      title: 'สถานะการเคลม',
      dataIndex: 'status',
      key: 'status',
      render: renderStatusTag,
    },
    createRowActionColumn('จัดการ', 'แก้ไขข้อมูล', onEdit),
  ];

  return (
    <DashboardDataTable
      title="📋 รายการใบเคลม"
      columns={columns}
      data={data}
      onRefresh={onRefresh}
      loading={loading}
      pagination={pagination}
    />
  );
}
