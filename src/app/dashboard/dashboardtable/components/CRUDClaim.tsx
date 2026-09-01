'use client';

import { Button, Space, Spin, Table, Tag } from 'antd';
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  ReloadOutlined,
  SyncOutlined,
} from '@ant-design/icons';
import { formatClaimDateForDisplay } from '@/lib/claim-date';
import type { SheetRow } from '@/lib/sheet-types';
import type { TablePaginationConfig } from 'antd/es/table';

interface CRUDClaimProps {
  data: SheetRow[];
  title?: string;
  onEdit: (record: SheetRow) => void;
  onRefresh?: () => void;
  loading?: boolean;
  pagination?: TablePaginationConfig;
}

export default function CRUDClaim({
  data,
  onEdit,
  onRefresh,
  loading,
  pagination,
}: CRUDClaimProps) {
  const renderStatusTag = (value: string) => {
    const statusMap: Record<string, { label: string; color: string; icon?: React.ReactNode }> = {
      ไปตรวจสอบเอง: { label: 'ไปตรวจสอบเอง', color: 'blue', icon: <ClockCircleOutlined /> },
      ไปเคลมเอง: { label: 'ไปเคลมเอง', color: 'blue', icon: <ClockCircleOutlined /> },
      รอตรวจสอบ: { label: 'รอตรวจสอบ', color: 'yellow', icon: <SyncOutlined /> },
      จบการตรวจสอบ: { label: 'จบการตรวจสอบ', color: 'green', icon: <CheckCircleOutlined /> },
      ยกเลิกการตรวจสอบ: { label: 'ยกเลิกการตรวจสอบ', color: 'red', icon: <CloseCircleOutlined /> },
      รอเคลม: { label: 'รอเคลม', color: 'yellow', icon: <SyncOutlined /> },
      จบเคลม: { label: 'จบเคลม', color: 'green', icon: <CheckCircleOutlined /> },
      ยกเลิกเคลม: { label: 'ยกเลิกเคลม', color: 'red', icon: <CloseCircleOutlined /> },
    };

    const tag = statusMap[value] || { label: value || '-', color: 'default' };
    return (
      <Tag color={tag.color} icon={tag.icon}>
        {tag.label}
      </Tag>
    );
  };

  const columns = [
    { title: 'สาขา', dataIndex: 'ProvinceName', key: 'provinceName' },
    { title: 'ชื่อลูกค้า', dataIndex: 'CustomerName', key: 'customerName' },
    {
      title: 'วันที่ซื้อ',
      dataIndex: 'buyProductDate',
      key: 'buyProductDate',
      render: formatClaimDateForDisplay,
    },
    // { title: 'เบอร์โทร', dataIndex: 'Phone', key: 'phone' },
    // { title: 'ที่อยู่', dataIndex: 'Address', key: 'address' },
    // { title: 'สินค้า', dataIndex: 'Product', key: 'product' },
    // { title: 'รายละเอียดปัญหา', dataIndex: 'Problem', key: 'problem' },
    // { title: 'สถานะประกัน', dataIndex: 'Warranty', key: 'warranty' },
    // { title: 'ผู้รับเคลม', dataIndex: 'receiver', key: 'receiver' },
    // {
    //   title: 'วันที่รับเคลม',
    //   dataIndex: 'receiverClaimDate',
    //   key: 'receiverClaimDate',
    //   render: formatDate,
    // },
    { title: 'คนตรวจสอบ', dataIndex: 'inspector', key: 'inspector' },
    // { title: 'ยานพาหนะของคนเคลม', dataIndex: 'vehicleInspector', key: 'vehicleInspector' },
    // {
    //   title: 'วันที่ตรวจสอบ',
    //   dataIndex: 'inspectionDate',
    //   key: 'inspectionDate',
    //   render: formatDate,
    // },

    {
      title: 'สถานะการตรวจสอบ',
      dataIndex: 'inspectstatus',
      key: 'inspectstatus',
      render: renderStatusTag, // ✅ ใส่ tag
    },
    { title: 'คนไปเคลม', dataIndex: 'claimSender', key: 'claimSender' },
    // { title: 'ยานพาหนะของคนเคลม', dataIndex: 'vehicleClaim', key: 'vehicleClaim' },
    // {
    //   title: 'วันที่เคลม',
    //   dataIndex: 'claimDate',
    //   key: 'claimDate',
    //   render: formatDate,
    // },
    {
      title: 'สถานะการเคลม',
      dataIndex: 'status',
      key: 'status',
      render: renderStatusTag, // ✅ ใส่ tag
    },
    // { title: 'จำนวนเงิน', dataIndex: 'price', key: 'price' },
    // { title: 'ค่าบริการ', dataIndex: 'serviceChargeStatus', key: 'serviceChargeStatus' },
    // { title: 'หมายเหตุ', dataIndex: 'note', key: 'note' },
    {
      title: 'จัดการ',
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
              <span>📋 รายการใบเคลม</span>
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
