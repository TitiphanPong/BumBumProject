import { Table, Button, Space, Spin } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import type { SheetRow } from '@/lib/sheet-types';

interface CrudTableProps {
  data: SheetRow[];
  title: string;
  onEdit: (record: SheetRow) => void;
  onRefresh?: () => void;
  loading?: boolean;
}

export default function CrudTable({ data, onEdit, onRefresh, loading }: CrudTableProps) {
  const columns = [
    { title: 'สาขา', dataIndex: 'ProvinceName', key: 'provinceName' },
    { title: 'ชื่อลูกค้า', dataIndex: 'CustomerName', key: 'customerName' },
    // { title: 'เบอร์โทร', dataIndex: 'Phone', key: 'phone' },
    // { title: 'ที่อยู่', dataIndex: 'Address', key: 'address' },
    // { title: 'สินค้า', dataIndex: 'Product', key: 'product' },
    // { title: 'รายละเอียดปัญหา', dataIndex: 'Problem', key: 'problem' },
    // { title: 'สถานะประกัน', dataIndex: 'Warranty', key: 'warranty' },
    // { title: 'ผู้รับเคลม', dataIndex: 'receiver', key: 'receiver' },
    // { title: 'วันที่รับเคลม', dataIndex: 'receiverClaimDate', key: 'receiverClaimDate' },
    { title: 'คนตรวจสอบ', dataIndex: 'inspector', key: 'inspector' },
    // { title: 'วันที่ตรวจสอบ', dataIndex: 'inspectionDate', key: 'inspectionDate' },
    { title: 'คนไปเคลม', dataIndex: 'claimSender', key: 'claimSender' },
    // { title: 'วันที่เคลม/คืน/ส่ง', dataIndex: 'claimDate', key: 'claimDate' },
    // { title: 'สถานะการเคลม', dataIndex: 'status', key: 'status' },
    // { title: 'จำนวนเงิน', dataIndex: 'price', key: 'price' },
    // { title: 'หมายเหตุ', dataIndex: 'note', key: 'note' },
    {
      title: 'เบิกอะไหล่',
      render: (_: unknown, record: SheetRow) => (
        <Space>
          <Button icon="✏️" onClick={() => onEdit(record)}>
            เพิ่มข้อมูล
          </Button>
        </Space>
      ),
    },
  ];

  return (
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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
          pagination={{ pageSize: 7 }}
          scroll={{ x: 'max-content' }}
        />
      )}
    </div>
  );
}
