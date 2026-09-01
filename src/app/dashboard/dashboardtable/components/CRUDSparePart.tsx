'use client';

import { Button, Space, Spin, Table } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import { formatClaimDateForDisplay } from '@/lib/claim-date';
import type { SheetRow } from '@/lib/sheet-types';
import type { TablePaginationConfig } from 'antd/es/table';
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
  const formatDate = formatClaimDateForDisplay;

  const columns = [
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
      render: formatDate,
    },
    { title: 'ผู้เบิกของ', dataIndex: 'requester', key: 'requester' },
    { title: 'ผู้จ่ายของ', dataIndex: 'payer', key: 'payer' },
    { title: 'ผู้รับของ', dataIndex: 'receiver', key: 'receiver' },
    {
      title: 'วันที่รับของ',
      dataIndex: 'receiverItemDate',
      key: 'receiverItemDate',
      render: formatDate,
    },
    { title: 'หมายเหตุ', dataIndex: 'note', key: 'note' },
    {
      title: 'การจัดการ',
      key: 'actions',
      render: (_: unknown, record: SheetRow) => (
        <Space>
          <Button icon="✏️" onClick={() => onEdit(record)}>
            แก้ไขข้อมูล
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ marginBottom: 48 }}>
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
          <Spin tip="กำลังโหลดข้อมูล..." />
        </div>
      ) : (
        <Table
          title={() => (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span>📋 รายการเบิกอะไหล่</span>
              <Button
                type="primary"
                icon={<ReloadOutlined />}
                onClick={onRefresh}
                loading={loading}
                className="refresh-button">
                <span className="refresh-text">รีเฟรชข้อมูล</span>
              </Button>
            </div>
          )}
          columns={columns}
          dataSource={data}
          rowKey="id"
          pagination={pagination ?? { pageSize: 8 }}
          scroll={{ x: 'max-content' }}
        />
      )}
    </div>
  );
}
