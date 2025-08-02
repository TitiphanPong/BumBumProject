'use client';

import { useEffect, useState } from 'react';
import { Form, Modal, Input, DatePicker, Button, Typography, Divider, message, Select, Checkbox, notification } from 'antd';
import dayjs from 'dayjs';
import CRUDSparePart from '../components/CRUDSparePart';

export default function SparePartPage() {
  const [parts, setParts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRow, setSelectedRow] = useState<any>(null);
  const [searchText, setSearchText] = useState('');
  const [form] = Form.useForm();
  const [filteredParts, setFilteredParts] = useState<any[]>([]);
  const [api, contextHolder] = notification.useNotification();

  const fetchParts = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/get-spare', {cache: 'no-store'});
      const data = await res.json();

      const dataWithIds = data
        .filter((item: any) => !!item.id)
        .map((item: any) => ({
          ...item,
          id: item.id.trim(),
        }));

      const withIds = data.map((d: any, index: number) => ({
        ...d,
        id: d.id?.trim() || `row-${index}`,
      }));
      setParts(withIds);
      setFilteredParts(dataWithIds);
      setSearchText('');
    } catch (err) {
      message.error('โหลดข้อมูลไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchParts();
  }, []);

    const handleSearch = (value: string) => {
    setSearchText(value);
    const lowerValue = value.toLowerCase();
    const filtered = parts.filter((item: any) =>
      Object.values(item).some(
        (field) => typeof field === 'string' && field.toLowerCase().includes(lowerValue)
      )
    );
    setFilteredParts(filtered);
  };

const handleEdit = (record: any) => {
  
const parseDate = (dateStr: any) => {
  const parsed = dayjs(dateStr, ['D/M/YYYY', 'DD/MM/YYYY'], true);
  return parsed.isValid() ? parsed : null;
};

  form.setFieldsValue({
    provinceName: record.ProvinceName,
    customerName: record.CustomerName,
    product: record.Product,
    warranty: Array.isArray(record.Warranty)
      ? record.Warranty
      : typeof record.Warranty === 'string'
        ? record.Warranty.split(', ').map((w: string) => w.trim())
        : [],
    problem: record.Problem,
    part: record.part,
    requestDate: record.requestDate ? dayjs(record.requestDate) : null,
    requester: record.requester,
    payer: record.payer,
    receiver: record.receiver,
    receiverItemDate: record.receiverItemDate ? dayjs(record.receiverItemDate) : null,
    note: record.note,
  });

  setSelectedRow(record);
  setIsModalOpen(true);
};


  const handleDelete = async (record: any) => {
    try {
      const res = await fetch('/api/delete-part', {
        method: 'POST',
        body: JSON.stringify({
          id: record.id,
          sheetName: 'เบิกอะไหล่',
        }),
      });
      const result = await res.json();
      if (result.result === 'success') {
        message.success('ลบข้อมูลแล้ว');
        fetchParts();
      } else {
        throw new Error(result.message);
      }
    } catch (err) {
      console.error(err);
      message.error('ลบข้อมูลไม่สำเร็จ');
    }
  };

  const handleSubmit = async (values: any) => {
    setLoading(true);

    const fullData = {
      id: selectedRow?.id,
      ...values,
      sheetName: 'เบิกอะไหล่',

      requestDate: values.requestDate?.isValid?.() 
        ? values.requestDate.format('YYYY-MM-DD')
        : '',
      
      receiverItemDate: values.receiverItemDate?.isValid?.() 
        ? values.receiverItemDate.format('YYYY-MM-DD')
        : '',
    };

    try {
      const res = await fetch('/api/update-part', {
        method: 'POST',
        body: JSON.stringify({ ...fullData, action: 'update' }),
      });
      const result = await res.json();
      if (result.result === 'success') {
        api.success({
        message: 'อัปเดตข้อมูลสำเร็จ',
        description: 'ระบบได้อัปเดตรายการเบิกอะไหล่เรียบร้อยแล้ว',
        placement: 'topRight',
      });
        setIsModalOpen(false);
        form.resetFields();
        fetchParts();
      } else {
        throw new Error(result.message);
      }
    } catch (err) {
      api.error({
      message: 'เกิดข้อผิดพลาด',
      description: 'อัปเดตข้อมูลไม่สำเร็จ กรุณาลองใหม่',
      placement: 'topRight',
    });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: 24, maxWidth: 1400, margin: 'auto' }}>
      {contextHolder}
      <Typography.Title level={3}>🔧 รายการเบิกอะไหล่</Typography.Title>

      <Input.Search
        placeholder="ค้นหาชื่อลูกค้า"
        enterButton
        value={searchText}
        onChange={(e) => setSearchText(e.target.value)}
        onSearch={handleSearch}
        style={{ marginBottom: 24 }}
        allowClear
      />

      <CRUDSparePart
        data={filteredParts}
        loading={loading}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onRefresh={fetchParts}
      />

      <Modal
        title={
         <div style={{ fontSize: 22, fontWeight: 'bold', color: '#000000ff', marginTop : 16 }}>
            🛠️ แก้ไขรายการเบิกอะไหล่
          </div>
        }
        open={isModalOpen}
        onCancel={() => {
          form.resetFields();
          setIsModalOpen(false);
        }}
        footer={null}
        width={800}
      >
        <Form form={form} onFinish={handleSubmit} layout="vertical">
          <Divider />
          <Typography.Title level={4}>เครดิต</Typography.Title>
          <Form.Item name="provinceName" label="สาขา">
            <Select>
              <Select.Option value="กรุงเทพฯ">กรุงเทพฯ</Select.Option>
              <Select.Option value="อำนาจเจริญ">อำนาจเจริญ</Select.Option>
              <Select.Option value="โคราช">โคราช</Select.Option>
              <Select.Option value="อื่นๆ">อื่นๆ</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="customerName" label="ชื่อลูกค้า"><Input /></Form.Item>
          <Form.Item name="product" label="สินค้า"><Input /></Form.Item>
          <Form.Item name="warranty" label="ประเภทประกัน">
            <Checkbox.Group>
              <Checkbox value="อยู่ในประกัน">อยู่ในประกัน</Checkbox>
              <Checkbox value="หมดประกัน">หมดประกัน</Checkbox>
            </Checkbox.Group>
          </Form.Item>
          <Form.Item name="problem" label="รายละเอียดปัญหา"><Input.TextArea /></Form.Item>

          <Divider />
          <Typography.Title level={4}>บัญชี / สต็อค</Typography.Title>
          <Form.Item name="part" label="ชื่ออะไหล่"><Input /></Form.Item>
          <Form.Item name="requestDate" label="วันที่เบิก"><DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" /></Form.Item>
          <Form.Item name="requester" label="ผู้เบิกของ"><Input /></Form.Item>
          <Form.Item name="payer" label="ผู้จ่ายของ"><Input /></Form.Item>
          <Form.Item name="receiver" label="ผู้รับของ"><Input /></Form.Item>
          <Form.Item name="receiverItemDate" label="วันที่รับของ"><DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" /></Form.Item>
          <Form.Item name="note" label="หมายเหตุ"><Input.TextArea /></Form.Item>

          <Button type="primary" htmlType="submit" loading={loading}>
            บันทึกข้อมูล
          </Button>
        </Form>
      </Modal>
    </div>
  );
}