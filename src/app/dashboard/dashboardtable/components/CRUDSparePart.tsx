'use client';

import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import { formatClaimDateForDisplay } from '@/lib/claim-date';
import type { SheetRow } from '@/lib/sheet-types';
import DashboardDataTable, { createRowActionColumn } from '../../components/DashboardDataTable';

interface SparePartTableProps {
  data: SheetRow[];
  onEdit: (record: SheetRow) => void;
  onRefresh?: () => void;
  loading?: boolean;
  pagination?: TablePaginationConfig;
}

export default function CRUDSparePart({
  data,
  onEdit,
  onRefresh,
  loading,
  pagination,
}: SparePartTableProps) {
  const columns: ColumnsType<SheetRow> = [
    { title: 'สาขา', dataIndex: 'ProvinceName', key: 'provinceName' },
    { title: 'ชื่อลูกค้า', dataIndex: 'CustomerName', key: 'customerName' },
    { title: 'สินค้า', dataIndex: 'Product', key: 'product' },
    { title: 'ประเภทประกัน', dataIndex: 'Warranty', key: 'warranty' },
    { title: 'รายละเอียดปัญหา', dataIndex: 'Problem', key: 'problem' },
    { title: 'ชื่ออะไหล่', dataIndex: 'part', key: 'part' },
    {
      title: 'วันที่เบิก',
      dataIndex: 'requestDate',
      key: 'requestDate',
      render: formatClaimDateForDisplay,
    },
    { title: 'ผู้เบิกของ', dataIndex: 'requester', key: 'requester' },
    { title: 'ผู้จ่ายของ', dataIndex: 'payer', key: 'payer' },
    { title: 'ผู้รับของ', dataIndex: 'receiver', key: 'receiver' },
    {
      title: 'วันที่รับของ',
      dataIndex: 'receiverItemDate',
      key: 'receiverItemDate',
      render: formatClaimDateForDisplay,
    },
    { title: 'หมายเหตุ', dataIndex: 'note', key: 'note' },
    createRowActionColumn('การจัดการ', 'แก้ไขข้อมูล', onEdit),
  ];

  return (
    <DashboardDataTable
      title="📋 รายการเบิกอะไหล่"
      columns={columns}
      data={data}
      onRefresh={onRefresh}
      loading={loading}
      pagination={pagination}
    />
  );
}
