'use client';

import { useEffect } from 'react';
import CrudTable from '../components/CrudTable';
import { useClaim } from '@/app/context/ClaimContext';
import { useState } from 'react';
import { Modal, Form, Input, DatePicker, Button, Typography } from 'antd';
import { Divider } from 'antd';
import dayjs from 'dayjs';



export default function TableAllPage() {

  const { claims, deleteClaim, setClaims } = useClaim();
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRow, setSelectedRow] = useState(null);
  const [form] = Form.useForm();


  const fetchClaims = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/get-claims' , {cache: 'no-store'});
      const data = await response.json();
      setClaims(data);
    } catch (error) {
      console.error('Failed to fetch claims from Google Sheet:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClaims();
  }, [setClaims]);

  
const handleEdit = (record:any) => {

  const transformedRecord = {
    provinceName: record.ProvinceName,
    customerName: record.CustomerName,
    warranty: record.Warranty ? record.Warranty.split(',').map((item: string) => item.trim()) : [],
    product: record.Product,
    problem: record.Problem,
    part: record.part,
    requestDate: record.requestDate ? dayjs(record.requestDate, 'DD/MM/YYYY') : null,
    requester: record.requester,
    payer: record.payer,
    receiver: '',
    receiverDate: '',
    note: '',
  };

    setSelectedRow(record);
    form.setFieldsValue(transformedRecord);
    setIsModalOpen(true);
  };

  const handleSubmit = async (values:any) => {
    
  const fullData = {
  ...(selectedRow || {}),
  ...values,
  
    requestDate: values.requestDate?.format('DD/MM/YYYY') || '',
    receiverDate: values.receiverDate?.format('DD/MM/YYYY') || '',
  sheetName: 'เบิกอะไหล่',
};

    
await fetch('/api/part-request', {
      method: 'POST',
      body: JSON.stringify(fullData),
    });

    setIsModalOpen(false);
    form.resetFields();
  };

  console.log('TableAllPage claims:', claims);

  return (
    <div style={{ padding: '24px' }}>
      
    <CrudTable
      data={claims}
      title=""
      onEdit={handleEdit}
      onDelete={(id) => deleteClaim(id)}
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

          <Typography.Title style={{marginTop: '1rem'}} level={2}>🔧 เบิกอะไหล่</Typography.Title>
          
          <Divider />
          <Typography.Title level={3}>เครดิต</Typography.Title>
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
            <Input.TextArea disabled/>
          </Form.Item>

          <Divider />
          <Typography.Title level={3}>บัญชี / สต๊อค</Typography.Title>
          <Form.Item label="ชื่ออะไหล่" name="part">
            <Input />
          </Form.Item>
          <Form.Item label="วันที่เบิกอะไหล่" name="requestDate">
            <DatePicker style={{ width: '100%' }} />
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
          <Form.Item label="วันที่รับของ" name="receiverDate">
            <DatePicker style={{ width: '100%' }} />
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



  // OLD SOLUTION
  // useEffect(() => {
  //   const fetchClaims = async () => {
  //     try {
  //       const response = await fetch('/api/get-claims');
  //       const data = await response.json();
  //       setClaims(data);
  //     } catch (error) {
  //       console.error('Failed to fetch claims from Google Sheet:', error);
  //     }
  //   };

  //   fetchClaims();

  // const interval = setInterval(fetchClaims, 5000); // โหลดซ้ำทุก 5 วินาที
  // return () => clearInterval(interval); // เคลียร์เมื่อ unmount
  // }, [setClaims]);