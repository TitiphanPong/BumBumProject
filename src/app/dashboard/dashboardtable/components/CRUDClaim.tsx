'use client';

import { Table, Button, Space, Spin, message, Modal } from 'antd';
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  ReloadOutlined,
  SyncOutlined,
} from '@ant-design/icons';
import { useState } from 'react';
import { notification } from 'antd';
import { Tag } from 'antd';
import { formatClaimDateForDisplay } from '@/lib/claim-date';
import type { SheetRow } from '@/lib/sheet-types';

interface CRUDClaimProps {
  data: SheetRow[];
  title?: string;
  onEdit: (record: SheetRow) => void;
  onDelete: (record: SheetRow) => void;
  onRefresh?: () => void;
  loading?: boolean;
}

export default function CRUDClaim({ data, onEdit, onRefresh, loading }: CRUDClaimProps) {
  const [api, contextHolder] = notification.useNotification();
  const [deletingRow, setDeletingRow] = useState<SheetRow | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDeleteConfirmed = async () => {
    if (!deletingRow) return;
    setDeleting(true);

    try {
      const res = await fetch('/api/delete-claim', {
        method: 'POST',
        body: JSON.stringify({ id: deletingRow.id, sheetName: 'ใบเคลม' }),
      });

      const result = await res.json();
      if (result.result === 'success') {
        api.success({
          message: 'สำเร็จ',
          description: 'ลบข้อมูลเรียบร้อยแล้ว',
        });
        onRefresh?.(); // ✅ รีโหลดข้อมูล
      } else {
        throw new Error(result.message);
      }
    } catch (err) {
      console.error(err);
      api.error({
        message: 'เกิดข้อผิดพลาด',
        description: 'ลบข้อมูลไม่สำเร็จ',
      });
    } finally {
      setIsDeleteModalOpen(false);
      setDeletingRow(null);
      setDeleting(false);
    }
  };

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
          {/* <Button danger type="primary" onClick={() => {
                setDeletingRow(record);
                setIsDeleteModalOpen(true);
              }}>
                🗑️ ลบข้อมูล
          </Button> */}
        </Space>
      ),
    },
  ];

  return (
    <>
      {contextHolder}

      <div style={{ marginBottom: 48 }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '0rem',
          }}></div>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
            <Spin tip="กำลังโหลดข้อมูล..." />
          </div>
        ) : (
          <Table
            title={() => (
              <div
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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
            pagination={{ pageSize: 8 }}
            scroll={{ x: 'max-content' }}
          />
        )}
        <Modal
          open={isDeleteModalOpen}
          title={
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 18, color: '#faad14' }}>⚠️</span>
              <span style={{ fontSize: 20, fontWeight: 600 }}>ยืนยันการลบข้อมูล</span>
            </div>
          }
          onOk={handleDeleteConfirmed}
          onCancel={() => {
            setIsDeleteModalOpen(false);
            setDeletingRow(null);
            setDeleting(false);
          }}
          confirmLoading={deleting}
          okText="ลบข้อมูล"
          cancelText="ยกเลิก"
          okButtonProps={{ danger: true }}
          centered // ✅ เด้งกลางหน้าจอ
          width={350} // ✅ ขนาดกลาง กำลังดี
        >
          <div style={{ display: 'flex', gap: 24 }}>
            <div>
              <h1 style={{ marginBottom: 16 }}>คุณต้องการลบข้อมูลนี้ใช่หรือไม่?</h1>
            </div>
          </div>
        </Modal>
      </div>
    </>
  );
}
