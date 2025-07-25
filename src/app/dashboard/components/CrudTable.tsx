import { Table, Button, Space, Skeleton, Spin } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';


interface CrudTableProps {
  data: any[];
  title: string;
  onEdit: (record: any) => void;
  onDelete: (id: string) => void;
  onRefresh?: () => void;
  loading?: boolean;
}

export default function CrudTable({ data, title, onEdit, onDelete, onRefresh, loading }: CrudTableProps) {
  const columns = [
    
  { title: 'สาขา', dataIndex: 'ProvinceName', key: 'provinceName' },
  { title: 'ชื่อลูกค้า', dataIndex: 'CustomerName', key: 'customerName' },
  { title: 'เบอร์โทร', dataIndex: 'Phone', key: 'phone' },
  { title: 'ที่อยู่', dataIndex: 'Address', key: 'address' },
  { title: 'สินค้า', dataIndex: 'Product', key: 'product' },
  { title: 'รายละเอียดปัญหา', dataIndex: 'Problem', key: 'problem' },
  { title: 'สถานะประกัน', dataIndex: 'Warranty', key: 'warranty' },
  // { title: 'ผู้รับเคลม', dataIndex: 'receiver', key: 'receiver' },
  // { title: 'วันที่รับเคลม', dataIndex: 'receiverDate', key: 'receiverDate' },
  // { title: 'คนตรวจสอบ', dataIndex: 'inspector', key: 'inspector' },
  // { title: 'วันที่ตรวจสอบ', dataIndex: 'inspectionDate', key: 'inspectionDate' },
  // { title: 'คนไปเคลม', dataIndex: 'claimSender', key: 'claimSender' },
  // { title: 'วันที่เคลม/คืน/ส่ง', dataIndex: 'claimDate', key: 'claimDate' },
  { title: 'สถานะการเคลม', dataIndex: 'status', key: 'status' },
  { title: 'จำนวนเงิน', dataIndex: 'price', key: 'price' },
  { title: 'หมายเหตุ', dataIndex: 'note', key: 'note' },
    {
      title: 'Actions',
      render: (_: any, record: any) => (
        <Space>
          <Button onClick={() => onEdit(record)}>Edit</Button>
          <Button danger onClick={() => onDelete(record)}>Delete</Button>
        </Space>
      ),
    },
  ];

return (
    <div style={{ marginBottom: 48 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0rem' }}>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
          <Spin tip="กำลังโหลดข้อมูล..." />
        </div>
      ) : (
        
<Table
  title={() => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span>📋 รายการใบเคลมทั้งหมด</span>
      <Button
        type="primary"
        icon={<ReloadOutlined />}
        onClick={onRefresh}
        loading={loading}
      >
        รีเฟรชข้อมูล
      </Button>
    </div>
  )}
  columns={columns}
  dataSource={data}
  rowKey="id"
  pagination={{ pageSize: 4 }}
  scroll={{ x: 'max-content' }}
/>

      )}
    </div>
  );
}
