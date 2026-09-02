'use client';

import type { ColumnsType } from 'antd/es/table';
import type { SheetRow } from '@/lib/sheet-types';
import DashboardDataTable, { createRowActionColumn } from './DashboardDataTable';

interface CrudTableProps {
  data: SheetRow[];
  onEdit: (record: SheetRow) => void;
  onRefresh?: () => void;
  loading?: boolean;
}

export default function CrudTable({ data, onEdit, onRefresh, loading }: CrudTableProps) {
  const columns: ColumnsType<SheetRow> = [
    { title: 'สาขา', dataIndex: 'ProvinceName', key: 'provinceName' },
    { title: 'ชื่อลูกค้า', dataIndex: 'CustomerName', key: 'customerName' },
    { title: 'คนตรวจสอบ', dataIndex: 'inspector', key: 'inspector' },
    { title: 'คนไปเคลม', dataIndex: 'claimSender', key: 'claimSender' },
    createRowActionColumn('เบิกอะไหล่', 'เพิ่มข้อมูล', onEdit),
  ];

  return (
    <DashboardDataTable
      title="📋 รายการใบเคลม"
      columns={columns}
      data={data}
      onRefresh={onRefresh}
      loading={loading}
      defaultPageSize={7}
    />
  );
}
