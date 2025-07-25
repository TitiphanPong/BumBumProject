// components/ClaimForm.tsx

'use client';

import { Form, Input, Select, DatePicker, Button, Card, message } from 'antd';
import { useState } from 'react';
import dayjs from 'dayjs';
import { Divider , Checkbox} from 'antd';
import { Typography } from 'antd';
import { useClaim } from '@/app/context/ClaimContext';

const { Option } = Select;

const { Title } = Typography;

const ClaimForm = () => {
  const { addClaim } = useClaim();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [selectedWarranty, setSelectedWarranty] = useState<string[]>([]);


// เชื่อมกับ Google App Script เอาลง Google Sheet
  
  const onFinish = async (values: any) => {
    console.log('Form values:', values);
    setLoading(true);

    
  const formattedValues = {
    ...values,
    receiverDate: values.receiverDate ? dayjs(values.receiverDate).format('DD/MM/YYYY') : '',
    inspectionDate: values.inspectionDate ? dayjs(values.inspectionDate).format('DD/MM/YYYY') : '',
    claimDate: values.claimDate ? dayjs(values.claimDate).format('DD/MM/YYYY') : '',
    reportDate: values.reportDate ? dayjs(values.reportDate).format('DD/MM/YYYY') : '',
  };

  addClaim(formattedValues);
  message.success('บันทึกข้อมูลเรียบร้อยแล้ว');
  form.resetFields();
  setSelectedWarranty([]);

  try {
    await fetch('/api/submit-claim', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(formattedValues),
    });

    message.success('บันทึกข้อมูลเรียบร้อยแล้ว');
    form.resetFields();
    setSelectedWarranty([]);
  } catch (error) {
    message.error('ส่งข้อมูลผิดพลาด');
  } finally {
    setLoading(false);
  }
  };

  

  const onWarrantyChange = (checkedValues: any[]) => {
    if (checkedValues.length > 1) {
      checkedValues = [checkedValues[checkedValues.length - 1]];
    }
    setSelectedWarranty(checkedValues);
    form.setFieldsValue({ warranty: checkedValues });
  };

  return (
    <Card title="📋 ใบเคลมสินค้า" style={{ maxWidth: 800, margin: 'auto' }}>
      <Form
        form={form}
        layout="vertical"
        onFinish={onFinish}
        initialValues={{ reportDate: dayjs() }}
        validateTrigger="onSubmit"
        style={{ marginTop: 0 }}
      >
        <Title level={4}>เครดิต</Title>
        <Form.Item name="provinceName" label="สาขาที่ทำการ" rules={[{ required: true , message: 'กรุณาเลือกสาขาที่ทำการ' }]}>
        <Select placeholder="เลือกจังหวัด">
            <Option value="กรุงเทพฯ">กรุงเทพฯ</Option>
            <Option value="อำนาจเจริญ">อำนาจเจริญ</Option>
            <Option value="โคราช">โคราช</Option>
            <Option value="อื่น ๆ">อื่น ๆ</Option>
          </Select>
        </Form.Item>

        <Form.Item name="customerName" label="ชื่อลูกค้า" rules={[{ required: true , message: 'กรุณากรอกชื่อ' }]}>
          <Input placeholder="กรอกชื่อ-นามสกุล" />
        </Form.Item>

        <Form.Item name="phone" label="เบอร์โทร" rules={[{ required: true , message: 'กรุณากรอกเบอร์โทร' }]}>
          <Input placeholder="เช่น 081-234-5678" />
        </Form.Item>

        <Form.Item name="address" label="ที่อยู่" rules={[{ required: true , message: 'กรุณากรอกที่อยู่' }]}>
          <Input.TextArea rows={2} placeholder="ที่อยู่ลูกค้า" />
        </Form.Item>

        <Form.Item name="product" label="สินค้า" rules={[{ required: true , message: 'กรุณากรอกชื่อสินค้า' }]}>
          <Input placeholder="กรอกชื่อสินค้า" />
        </Form.Item>

        <Form.Item name="problem" label="รายละเอียดปัญหา" rules={[{ required: true , message: 'กรุณากรอกรายละเอียดปัญหา' }]}>
          <Input.TextArea rows={3} placeholder="เช่น เปิดไม่ติด, เสียงช็อต ฯลฯ" />
        </Form.Item>


        <Form.Item name="warranty" label="สถานะประกัน" rules={[{ required: true, message: 'กรุณาเลือกสถานะประกัน' }]}>
          <Checkbox.Group value={selectedWarranty} onChange={onWarrantyChange}>
            <Checkbox value="อยู่ในประกัน">อยู่ในประกัน</Checkbox>
            <Checkbox value="หมดประกัน">หมดประกัน</Checkbox>
          </Checkbox.Group>
        </Form.Item>

        {/* แยกส่วนของพนักงาน */}
        <Divider />

        <Title level={4}>🧑‍🔧  ส่วนของพนักงาน</Title>


        <Form.Item name="receiver" label="ผู้รับเคลม" >
          <Input placeholder="ผู้รับเคลม" />
        </Form.Item>
        <Form.Item name="receiverDate" label="วันที่รับเคลม" >
          <DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} />
        </Form.Item>
        <Form.Item name="inspector" label="คนตรวจสอบ" >
          <Input placeholder="ชื่อคนตรวจสอบ" />
        </Form.Item>
        <Form.Item name="inspectionDate" label="วันที่ตรวจสอบ" >
          <DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} />
        </Form.Item>
        <Form.Item name="claimSender" label="คนไปเคลม">
          <Input placeholder="ชื่อช่างหรือผู้รับเคลม" />
        </Form.Item>
        <Form.Item name="claimDate" label="วันที่ เคลม/คืน/ส่ง" >
          <DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} />
        </Form.Item>
        
        <Form.Item name="status" label="สถานะการเคลม" rules={[{ required: true, message: 'กรุณาเลือกสถานะการเคลม' }]}>
          <Select placeholder="เลือกสถานะการเคลม" style={{ width: '100%' }}>
            <Option value="กำลังดำเนินการ">กำลังดำเนินการ</Option>
            <Option value="เสร็จสิ้น">เสร็จสิ้น</Option>
          </Select>
        </Form.Item>
        <Form.Item name="price" label="จำนวนเงิน" rules={[{ required: true, message: 'กรุณากรอกจำนวนเงิน' }]}>
          <Input 
          placeholder="กรอกจำนวนเงิน"
          prefix="฿"
          type='number' />
        </Form.Item>
        <Form.Item name="note" label="หมายเหตุ">
          <Input.TextArea rows={2} />
        </Form.Item>
        
          <Button type="primary" htmlType="submit" loading={loading}>
            บันทึกข้อมูล
          </Button>
      </Form>
    </Card>
    
  );
};

export default ClaimForm;