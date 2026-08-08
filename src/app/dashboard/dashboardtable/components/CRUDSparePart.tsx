'use client';

import { Table, Button, Space, Spin, Popconfirm, message, Modal } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useState } from 'react';
import { notification } from 'antd';
import utc from 'dayjs/plugin/utc';
import { formatClaimDateForDisplay } from '@/lib/claim-date';
import type { SheetRow } from '@/lib/sheet-types';
dayjs.extend(utc);

interface SparePartTableProps {
  data: SheetRow[];
  onEdit: (record: SheetRow) => void;
  onDelete: (record: SheetRow) => void;
  onRefresh?: () => void;
  loading?: boolean;
}

export default function CRUDSparePart({ data, onEdit, onRefresh, loading }: SparePartTableProps) {
  const [api, contextHolder] = notification.useNotification();
  const handleDeleteConfirmed = async () => {
    if (!deletingRow) return;
    setDeleting(true);

    try {
      const res = await fetch('/api/delete-part', {
        method: 'POST',
        body: JSON.stringify({ id: deletingRow.id, sheetName: 'เบิกอะไหล่' }),
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

  const [deletingRow, setDeletingRow] = useState<SheetRow | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

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
