// components/ClaimForm.tsx

'use client';

import { Form, Input, Select, DatePicker, Button, Card, message } from 'antd';
import { useState } from 'react';
import dayjs from 'dayjs';
import { Divider, Checkbox } from 'antd';
import { Typography } from 'antd';

interface SparePartFormValues {
  receiverItemDate?: string | dayjs.Dayjs;
  requestDate?: string | dayjs.Dayjs;
  warranty?: string[];
  [key: string]: any;
}

const { Title } = Typography;
const { Option } = Select;
const SparePartForm = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [selectedWarranty, setSelectedWarranty] = useState<string[]>([]);

  // เชื่อมกับ Google App Script เอาลง Google Sheet

  const onFinish = async (values: SparePartFormValues) => {
    setLoading(true);

    const formattedValues = {
      ...values,
      receiverItemDate: values.receiverItemDate
        ? dayjs(values.receiverItemDate).format('DD/MM/YYYY')
        : '',
      requestDate: values.requestDate ? dayjs(values.requestDate).format('DD/MM/YYYY') : '',
    };

    try {
      const response = await fetch('/api/part-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formattedValues),
      });

      if (!response.ok) throw new Error('Spare-part request was rejected');

      message.success('บันทึกข้อมูลเรียบร้อยแล้ว');
      form.resetFields();
      setSelectedWarranty([]);
    } catch (error) {
      message.error('ส่งข้อมูลผิดพลาด');
    } finally {
      setLoading(false);
    }
  };

  const onWarrantyChange = (checkedValues: string[]) => {
    if (checkedValues.length > 1) {
      checkedValues = [checkedValues[checkedValues.length - 1]];
    }
    setSelectedWarranty(checkedValues);
    form.setFieldsValue({ warranty: checkedValues });
  };

  return (
    <Card title="📋 เบิกอะไหล่" style={{ maxWidth: 800, margin: 'auto' }}>
      <Form
        form={form}
        layout="vertical"
        onFinish={onFinish}
        initialValues={{ reportDate: dayjs() }}
        validateTrigger="onSubmit"
        style={{ marginTop: 0 }}>
        <Title level={4}>เครดิต</Title>
        <Form.Item
          name="provinceName"
          label="สาขาที่ทำการ"
          rules={[{ required: true, message: 'กรุณาเลือกสาขาที่ทำการ' }]}>
          <Select placeholder="เลือกจังหวัด">
            <Option value="กรุงเทพฯ">กรุงเทพฯ</Option>
            <Option value="อำนาจเจริญ">อำนาจเจริญ</Option>
            <Option value="โคราช">โคราช</Option>
            <Option value="อื่น ๆ">อื่น ๆ</Option>
          </Select>
        </Form.Item>

        <Form.Item
          name="customerName"
          label="ชื่อลูกค้า"
          rules={[{ required: true, message: 'กรุณากรอกชื่อ' }]}>
          <Input placeholder="กรอกชื่อ-นามสกุล" />
        </Form.Item>

        <Form.Item
          name="warranty"
          label="สถานะประกัน"
          rules={[{ required: true, message: 'กรุณาเลือกสถานะประกัน' }]}>
          <Checkbox.Group value={selectedWarranty} onChange={onWarrantyChange}>
            <Checkbox value="อยู่ในประกัน">อยู่ในประกัน</Checkbox>
            <Checkbox value="หมดประกัน">หมดประกัน</Checkbox>
          </Checkbox.Group>
        </Form.Item>

        <Form.Item
          name="product"
          label="สินค้า"
          rules={[{ required: true, message: 'กรุณากรอกชื่อสินค้า' }]}>
          <Input placeholder="กรอกชื่อสินค้า" />
        </Form.Item>

        <Form.Item
          name="problem"
          label="รายละเอียดปัญหา"
          rules={[{ required: true, message: 'กรุณากรอกรายละเอียดปัญหา' }]}>
          <Input.TextArea rows={3} placeholder="เช่น เปิดไม่ติด, เสียงช็อต ฯลฯ" />
        </Form.Item>

        {/* แยกส่วนของพนักงาน */}
        <Divider />

        <Title level={4}>บัญชี / สต๊อค</Title>

        <Form.Item name="part" label="ชื่ออะไหล่">
          <Input placeholder="กรอกชื่ออะไหล่" />
        </Form.Item>
        <Form.Item name="requestDate" label="วันที่เบิกอะไหล่">
          <DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} />
        </Form.Item>
        <Form.Item name="requester" label="ผู้เบิกของ">
          <Input placeholder="ชื่อผู้เบิก" />
        </Form.Item>
        <Form.Item name="payer" label="ผู้จ่ายของ">
          <Input placeholder="ชื่อผู้จ่ายของ" />
        </Form.Item>
        <Form.Item name="receiver" label="ผู้รับของ">
          <Input placeholder="ชื่อผู้รับของ" />
        </Form.Item>

        <Form.Item name="receiverItemDate" label="วันที่รับของ">
          <DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} />
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

export default SparePartForm;
