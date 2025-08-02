'use client';

import { Form, Input, Select, DatePicker, Button, Card, message } from 'antd';
import { useState } from 'react';
import dayjs from 'dayjs';
import { Divider , Checkbox} from 'antd';
import { Typography } from 'antd';
import { notification } from 'antd';

const { Option } = Select;

const { Title } = Typography;

const ClaimForm = () => {
  const [api, contextHolder] = notification.useNotification(); // ✅ สำคัญ!
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [selectedWarranty, setSelectedWarranty] = useState<string[]>([]);
  const [selectedVehicleClaim, setSelectedVehicleClaim] = useState<string[]>([]);
  const [selectedVehicleInspector, setSelectedVehicleInspector] = useState<string[]>([]);
  const [selectedServiceChargeStatus, setSelectedServiceChargeStatus] = useState<string[]>([]);
  
  const onFinish = async (values: any) => {
    setLoading(true);

  const formattedValues = {
    ...values,
    receiverClaimDate: values.receiverClaimDate
      ? dayjs(values.receiverClaimDate).format('YYYY-MM-DD')
      : '',
    inspectionDate: values.inspectionDate
      ? dayjs(values.inspectionDate).format('YYYY-MM-DD')
      : '',
    claimDate: values.claimDate
      ? dayjs(values.claimDate).format('YYYY-MM-DD')
      : '',
    reportDate: values.reportDate
      ? dayjs(values.reportDate).format('YYYY-MM-DD')
      : '',
  };

  try {
    const res = await fetch('/api/submit-claim', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(formattedValues),
    });


    if (res.status === 200) {
      // ✅ ถ้าเลือกสถานะเป็น "จบเคลม" → ส่ง LINE
      if (formattedValues.status === "จบเคลม") {
        await fetch('/api/notify-claim', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            customerName: values.customerName,
            product: values.product,
            problemDetail: values.problem,
            warrantyStatus: selectedWarranty[0] || '-',
            claimer: values.claimSender || '-',
            vehicle: selectedVehicleClaim[0] || '-',
            claimDate: formattedValues.claimDate || '-',
            amount: values.price || '0' + "บาท",
            serviceFeeDeducted: selectedServiceChargeStatus[0] === 'หักค่าบริการแล้ว',
          }),
        });
      }

      api.success({
        message: 'บันทึกข้อมูลสำเร็จ',
        description: 'ระบบได้บันทึกข้อมูลใบเคลมเรียบร้อยแล้ว',
        placement: 'topRight',
        duration: 5,
      });
      
      form.resetFields();
      setSelectedWarranty([]);
      setSelectedVehicleClaim([]);
      setSelectedVehicleInspector([]);
      setSelectedServiceChargeStatus([]);

    } else {
      throw new Error('ส่งข้อมูลไม่สำเร็จ');
    }
  } catch (error) {
    api.error({
      message: 'เกิดข้อผิดพลาด',
      description: 'ไม่สามารถบันทึกรายการเบิกอะไหล่ได้ กรุณาลองใหม่อีกครั้ง',
      placement: 'topRight',
      duration: 5,
    });
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

  const onVehicleClaimChange = (checkedValues: any[]) => {
    if (checkedValues.length > 1) {
      checkedValues = [checkedValues[checkedValues.length - 1]];
    }
    setSelectedVehicleClaim(checkedValues);
    form.setFieldsValue({ vehicleClaim: checkedValues });
  };

  const onVehicleInspectorChange = (checkedValues: any[]) => {
    if (checkedValues.length > 1) {
      checkedValues = [checkedValues[checkedValues.length - 1]];
    }
    setSelectedVehicleInspector(checkedValues);
    form.setFieldsValue({ vehicleInspector: checkedValues });
  };

  const onServiceChargeStatusChange = (checkedValues: any[]) => {
    if (checkedValues.length > 1) {
      checkedValues = [checkedValues[checkedValues.length - 1]];
    }
    setSelectedServiceChargeStatus(checkedValues);
    form.setFieldsValue({ serviceChargeStatus: checkedValues });
  }

  return (
    <Card title="📋 ใบเคลมสินค้า" style={{ maxWidth: 800, margin: 'auto' }}>
      {contextHolder}
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
        <Form.Item name="receiverClaimDate" label="วันที่รับเคลม" >
          <DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} />
        </Form.Item>
        <Form.Item name="inspector" label="คนตรวจสอบ" >
          <Input placeholder="ชื่อคนตรวจสอบ" />
        </Form.Item>
        <Form.Item name="vehicleInspector" label="ยานพาหนะของคนตรวจสอบ" rules={[{ required: true, message: 'กรุณาเลือกยานพาหนะของคนตรวจสอบ' }]}>
          <Checkbox.Group value={selectedVehicleInspector} onChange={onVehicleInspectorChange}>
            <Checkbox value="รถยนต์">รถยนต์</Checkbox>
            <Checkbox value="รถมอเตอร์ไซค์">รถมอเตอร์ไซค์</Checkbox>
          </Checkbox.Group>
        </Form.Item>
        <Form.Item name="inspectionDate" label="วันที่ตรวจสอบ" >
          <DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} />
        </Form.Item>
        <Form.Item name="claimSender" label="คนไปเคลม">
          <Input placeholder="ชื่อช่างหรือผู้รับเคลม" />
        </Form.Item>
        <Form.Item name="vehicleClaim" label="ยานพาหนะของคนไปเคลม" rules={[{ required: true, message: 'กรุณาเลือกยานพาหนะของคนไปเคลม' }]}>
          <Checkbox.Group value={selectedVehicleClaim} onChange={onVehicleClaimChange}>
            <Checkbox value="รถยนต์">รถยนต์</Checkbox>
            <Checkbox value="รถมอเตอร์ไซค์">รถมอเตอร์ไซค์</Checkbox>
          </Checkbox.Group>
        </Form.Item>
        <Form.Item name="claimDate" label="วันที่เคลม" >
          <DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} />
        </Form.Item>
        
        <Form.Item name="status" label="สถานะการเคลม" rules={[{ required: true, message: 'กรุณาเลือกสถานะการเคลม' }]}>
          <Select placeholder="เลือกสถานะการเคลม" style={{ width: '100%' }}>
            <Option value="ไปเอง">ไปเอง</Option>
            <Option value="รอเคลม">รอเคลม</Option>
            <Option value="จบเคลม">จบเคลม</Option>
            <Option value="ยกเลิกเคลม">ยกเลิกเคลม</Option>
          </Select>
        </Form.Item>
        <Form.Item name="price" label="จำนวนเงิน" rules={[{ required: true, message: 'กรุณากรอกจำนวนเงิน' }]}>
          <Input 
          placeholder="กรอกจำนวนเงิน"
          prefix="฿"
          type='number' />
        </Form.Item>
        
        <Form.Item name="serviceChargeStatus" label="ค่าบริการ" rules={[{ required: true, message: 'กรุณาเลือกสถานะค่าบริการ' }]}>
          <Checkbox.Group value={selectedServiceChargeStatus} onChange={onServiceChargeStatusChange}>
            <Checkbox value="หักค่าบริการแล้ว">หักค่าบริการแล้ว</Checkbox>
            <Checkbox value="ยังไม่หักค่าบริการ">ยังไม่หักค่าบริการ</Checkbox>
          </Checkbox.Group>
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