'use client';

import { useEffect, useState } from 'react';
import CrudTable from './CrudTable';
import { Modal, Form, Input, DatePicker, Button, Typography, Divider } from 'antd';
import dayjs from 'dayjs';
import { notification } from 'antd';

export default function TableAllPage() {
  const [claims, setClaims] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRow, setSelectedRow] = useState<Record<string, any> | null>(null);
  const [form] = Form.useForm();
  const [searchText, setSearchText] = useState('');
  const [filteredClaims, setFilteredClaims] = useState<any[]>([]);
  const [api, contextHolder] = notification.useNotification();

  const fetchClaims = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/get-claim', { cache: 'no-store' });
      const data = await response.json();

      const dataWithIds = data
        .filter((item: any) => !!item.id)
        .map((item: any) => ({
          ...item,
          id: item.id.trim(),
        }));

      setClaims(dataWithIds);
      setFilteredClaims(dataWithIds);
      setSearchText('');
    } catch (error) {
      console.error('Error fetching parts:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClaims();
  }, []);

  const handleSearch = (value: string) => {
    setSearchText(value);
    const lowerValue = value.toLowerCase();
    const filtered = claims.filter((item: any) =>
      Object.values(item).some(
        (field) => typeof field === 'string' && field.toLowerCase().includes(lowerValue)
      )
    );
    setFilteredClaims(filtered);
  };

  const handleEdit = (record: any) => {
    const transformedRecord = {
      provinceName: record.ProvinceName,
      customerName: record.CustomerName,
      warranty: record.Warranty ? record.Warranty.split(',').map((item: string) => item.trim()) : [],
      product: record.Product,
      problem: record.Problem,
      part: record.part,
      requestDate: record.requestDate ? dayjs(record.requestDate) : null,
      requester: record.requester,
      payer: record.payer,
      receiver: '',
      receiverItemDate: record.receiverItemDate ? dayjs(record.receiverItemDate) : null,
      note: '',
    };

    setSelectedRow(record);
    form.setFieldsValue(transformedRecord);
    setIsModalOpen(true);
  };

  const handleSubmit = async (values: any) => {
    setLoading(true);
    

    const fullData = {
      ...values,
      refId: selectedRow?.id || '', // ✅ เชื่อมกับ ID ของใบเคลม
      sheetName: 'เบิกอะไหล่',
      requestDate: values.requestDate?.format('YYYY-MM-DD') || '',
      receiverItemDate: values.receiverItemDate?.format('YYYY-MM-DD') || '',
    };

try {
    const res = await fetch('/api/submit-part', {
      method: 'POST',
      body: JSON.stringify(fullData),
    });

    if (res.ok) {
      api.success({
        message: 'บันทึกข้อมูลเรียบร้อย',
        description: 'รายการเบิกอะไหล่ถูกบันทึกสำเร็จแล้ว',
        placement: 'topRight',
        duration: 4,
      });
      setIsModalOpen(false);
      form.resetFields();
      fetchClaims();
    } else {
      throw new Error('บันทึกไม่สำเร็จ');
    }
  } catch (error) {
    api.error({
      message: 'เกิดข้อผิดพลาด',
      description: 'ไม่สามารถบันทึกรายการเบิกอะไหล่ได้ กรุณาลองใหม่อีกครั้ง',
      placement: 'topRight',
      duration: 5,
    });
    console.error('Error submitting part:', error);
  } finally {
    setLoading(false);
  }
};

  return (
    <div style={{ padding: '12px', maxWidth: 1400, margin: 'auto' }}>
      {contextHolder}
      <Input.Search
        placeholder="ค้นหาชื่อลูกค้า"
        enterButton
        value={searchText}
        onChange={(e) => setSearchText(e.target.value)}
        onSearch={handleSearch}
        style={{ marginBottom: 24 }}
        allowClear
      />

      <CrudTable
        data={filteredClaims}
        title=""
        onEdit={handleEdit}
        onRefresh={fetchClaims}
        loading={loading}
      />

      <Modal
        title=""
        open={isModalOpen}
        onCancel={() => {
          form.resetFields();
          setIsModalOpen(false);
        }}
        footer={null}
        width={800}
      >
        <Form form={form} onFinish={handleSubmit} layout="vertical">
          <Typography.Title style={{ marginTop: 16 }} level={3}>
            🔧 เบิกอะไหล่
          </Typography.Title>

          <Divider />
          <Typography.Title level={4}>เครดิต</Typography.Title>
          <Form.Item label="สาขาที่บริการ" name="provinceName">
            <Input disabled />
          </Form.Item>
          <Form.Item label="ชื่อ - นามสกุล" name="customerName">
            <Input disabled />
          </Form.Item>
          <Form.Item label="สินค้า / เอกสาร" name="product">
            <Input disabled />
          </Form.Item>
          <Form.Item label="ประเภทประกัน" name="warranty">
            <Input disabled />
          </Form.Item>
          <Form.Item label="รายละเอียดปัญหา" name="problem">
            <Input.TextArea disabled />
          </Form.Item>

          <Divider />
          <Typography.Title level={4}>บัญชี / สต๊อค</Typography.Title>
          <Form.Item label="ชื่ออะไหล่" name="part">
            <Input />
          </Form.Item>
          <Form.Item label="วันที่เบิกอะไหล่" name="requestDate">
            <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
          </Form.Item>
          <Form.Item label="ผู้เบิกของ" name="requester">
            <Input />
          </Form.Item>
          <Form.Item label="ผู้จ่ายของ" name="payer">
            <Input />
          </Form.Item>
          <Form.Item label="ผู้รับของ" name="receiver">
            <Input />
          </Form.Item>
          <Form.Item label="วันที่รับของ" name="receiverItemDate">
            <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
          </Form.Item>
          <Form.Item label="หมายเหตุ" name="note">
            <Input.TextArea />
          </Form.Item>
          <Button type="primary" htmlType="submit" loading={loading}>
            บันทึกข้อมูล
          </Button>
        </Form>
      </Modal>
    </div>
  );
}