'use client';

import {
  Form,
  Input,
  Select,
  Button,
  Card,
  Divider,
  Checkbox,
  Typography,
  notification,
} from 'antd';
import DatePicker from '@/components/ThaiDatePicker';
import { useState } from 'react';
import dayjs from 'dayjs';
import { formatClaimDateForApi } from '@/lib/claim-date';
import type { ClaimMediaItem } from '@/lib/claim-media';
import {
  CLAIM_STATUS_OPTIONS,
  INSPECTION_STATUS_OPTIONS,
  PROVINCE_OPTIONS,
  SERVICE_CHARGE_OPTIONS,
  VEHICLE_OPTIONS,
  WARRANTY_OPTIONS,
} from '@/lib/claim-options';
import ClaimBuyProductDateField from './ClaimBuyProductDateField';
import ClaimMediaUpload from './ClaimMediaUpload';
import ProductSelect from './ProductSelect';
import { useProductOptions } from '@/hooks/useProductOptions';
import { sendClaimNotification } from '@/lib/claim-notification-client';
import type { SheetFormValues } from '@/lib/sheet-types';

const { Title } = Typography;

const ClaimForm = () => {
  const [api, contextHolder] = notification.useNotification();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [selectedWarranty, setSelectedWarranty] = useState<string[]>([]);
  const [selectedVehicleClaim, setSelectedVehicleClaim] = useState<string[]>([]);
  const [selectedVehicleInspector, setSelectedVehicleInspector] = useState<string[]>([]);
  const [selectedServiceChargeStatus, setSelectedServiceChargeStatus] = useState<string[]>([]);
  const [mediaItems, setMediaItems] = useState<ClaimMediaItem[]>([]);
  const productOptions = useProductOptions();
  const imageUrls = mediaItems.map(item => item.url);

  const sendNotification = async (payload: Record<string, unknown>) => {
    try {
      await sendClaimNotification(payload);
    } catch (error) {
      api.warning({
        message: 'บันทึกข้อมูลแล้ว แต่แจ้งเตือนไม่สำเร็จ',
        description:
          error instanceof Error
            ? error.message
            : 'ข้อมูลถูกบันทึกแล้ว กรุณาแจ้งผู้ดูแลให้ตรวจสอบ Telegram',
        placement: 'topRight',
      });
    }
  };

  const onFinish = async (values: SheetFormValues) => {
    setLoading(true);

    const formattedValues = {
      ...values,
      image: imageUrls,
      receiverClaimDate: values.receiverClaimDate
        ? dayjs(values.receiverClaimDate).format('YYYY-MM-DD')
        : '',
      inspectionDate: values.inspectionDate
        ? dayjs(values.inspectionDate).format('YYYY-MM-DD')
        : '',
      claimDate: values.claimDate ? dayjs(values.claimDate).format('YYYY-MM-DD') : '',
      reportDate: values.reportDate ? dayjs(values.reportDate).format('YYYY-MM-DD') : '',
      buyProductDate: formatClaimDateForApi(values.buyProductDate),
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
        const inspectStatus = formattedValues.inspectstatus;
        const claimStatus = formattedValues.status;

        const notifyBase = {
          provinceName: values.provinceName,
          customerName: values.customerName,
          product: values.product,
          problemDetail: values.problem,
          warrantyStatus: selectedWarranty[0] || '-',
          image: imageUrls,
        };

        await sendNotification({
          ...notifyBase,
          buyProductDate: formattedValues.buyProductDate,
          address: values.address,
          phone: values.phone,
          notifyType: 'แจ้งเคลมสินค้า',
        });

        if (claimStatus === 'จบเคลม') {
          await sendNotification({
            ...notifyBase,
            claimer: values.claimSender || '-',
            vehicle: selectedVehicleClaim[0] || '-',
            claimDate: formattedValues.claimDate || '-',
            serviceFeeDeducted: selectedServiceChargeStatus[0] === 'หักค่าบริการแล้ว',
            notifyType: 'จบเคลม',
          });
        } else if (inspectStatus === 'จบการตรวจสอบ' && claimStatus !== 'จบเคลม') {
          await sendNotification({
            ...notifyBase,
            inspector: values.inspector || '-',
            vehicle: selectedVehicleInspector[0] || '-',
            inspectionDate: formattedValues.inspectionDate || '-',
            notifyType: 'จบการตรวจสอบ',
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
        setMediaItems([]);
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

  const applySingleChoice = (
    field: 'warranty' | 'vehicleClaim' | 'vehicleInspector' | 'serviceChargeStatus',
    setter: (values: string[]) => void,
    checkedValues: string[]
  ) => {
    const selected = checkedValues.length > 1 ? checkedValues.slice(-1) : checkedValues;
    setter(selected);
    form.setFieldValue(field, selected);
  };

  const onWarrantyChange = (values: string[]) =>
    applySingleChoice('warranty', setSelectedWarranty, values);
  const onVehicleClaimChange = (values: string[]) =>
    applySingleChoice('vehicleClaim', setSelectedVehicleClaim, values);
  const onVehicleInspectorChange = (values: string[]) =>
    applySingleChoice('vehicleInspector', setSelectedVehicleInspector, values);
  const onServiceChargeStatusChange = (values: string[]) =>
    applySingleChoice('serviceChargeStatus', setSelectedServiceChargeStatus, values);

  return (
    <Card title="📋 ใบเคลมสินค้า" style={{ maxWidth: 800, margin: 'auto' }}>
      {contextHolder}
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
          <Select placeholder="เลือกจังหวัด" options={PROVINCE_OPTIONS} />
        </Form.Item>

        <Form.Item
          name="customerName"
          label="ชื่อลูกค้า"
          rules={[{ required: true, message: 'กรุณากรอกชื่อ' }]}>
          <Input placeholder="กรอกชื่อ-นามสกุล" />
        </Form.Item>

        <Form.Item
          name="phone"
          label="เบอร์โทร"
          rules={[{ required: true, message: 'กรุณากรอกเบอร์โทร' }]}>
          <Input placeholder="เช่น 081-234-5678" />
        </Form.Item>

        <Form.Item
          name="address"
          label="ที่อยู่"
          rules={[{ required: true, message: 'กรุณากรอกที่อยู่' }]}>
          <Input.TextArea rows={2} placeholder="ที่อยู่ลูกค้า" />
        </Form.Item>

        <Form.Item name="product" label="สินค้า">
          <ProductSelect
            products={productOptions}
            placeholder="เลือกหรือพิมพ์ชื่อสินค้า"
            tokenSeparators={[',']}
          />
        </Form.Item>

        <ClaimBuyProductDateField />

        <Form.Item
          name="problem"
          label="รายละเอียดปัญหา"
          rules={[{ required: true, message: 'กรุณากรอกรายละเอียดปัญหา' }]}>
          <Input.TextArea rows={3} placeholder="เช่น เปิดไม่ติด, เสียงช็อต ฯลฯ" />
        </Form.Item>

        <Form.Item
          name="warranty"
          label="สถานะประกัน"
          rules={[{ required: true, message: 'กรุณาเลือกสถานะประกัน' }]}>
          <Checkbox.Group
            value={selectedWarranty}
            options={WARRANTY_OPTIONS}
            onChange={onWarrantyChange}
          />
        </Form.Item>

        {/* แยกส่วนของพนักงาน */}
        <Divider />

        <Title level={4}>🧑‍🔧 ส่วนของพนักงาน</Title>

        <Form.Item name="receiver" label="ผู้รับเคลม">
          <Input placeholder="ผู้รับเคลม" />
        </Form.Item>
        <Form.Item name="receiverClaimDate" label="วันที่รับเคลม">
          <DatePicker format="DD/MM/BBBB" style={{ width: '100%' }} />
        </Form.Item>
        <Form.Item name="inspector" label="คนตรวจสอบ">
          <Input placeholder="ชื่อคนตรวจสอบ" />
        </Form.Item>
        <Form.Item name="vehicleInspector" label="ยานพาหนะของคนตรวจสอบ">
          <Checkbox.Group
            value={selectedVehicleInspector}
            options={VEHICLE_OPTIONS}
            onChange={onVehicleInspectorChange}
          />
        </Form.Item>
        <Form.Item name="inspectionDate" label="วันที่ตรวจสอบ">
          <DatePicker format="DD/MM/BBBB" style={{ width: '100%' }} />
        </Form.Item>

        <Form.Item
          name="inspectstatus"
          label="สถานะการตรวจสอบ"
          rules={[{ required: true, message: 'กรุณาเลือกสถานะการตรวจสอบ' }]}>
          <Select
            placeholder="เลือกสถานะการตรวจสอบ"
            style={{ width: '100%' }}
            options={INSPECTION_STATUS_OPTIONS}
          />
        </Form.Item>

        <Form.Item name="claimSender" label="คนไปเคลม">
          <Input placeholder="ชื่อช่างหรือผู้รับเคลม" />
        </Form.Item>
        <Form.Item name="vehicleClaim" label="ยานพาหนะของคนไปเคลม">
          <Checkbox.Group
            value={selectedVehicleClaim}
            options={VEHICLE_OPTIONS}
            onChange={onVehicleClaimChange}
          />
        </Form.Item>
        <Form.Item name="claimDate" label="วันที่เคลม">
          <DatePicker format="DD/MM/BBBB" style={{ width: '100%' }} />
        </Form.Item>

        <Form.Item
          name="status"
          label="สถานะการเคลม"
          rules={[{ required: true, message: 'กรุณาเลือกสถานะการเคลม' }]}>
          <Select
            placeholder="เลือกสถานะการเคลม"
            style={{ width: '100%' }}
            options={CLAIM_STATUS_OPTIONS}
          />
        </Form.Item>

        <Form.Item name="serviceChargeStatus" label="ค่าบริการ">
          <Checkbox.Group
            value={selectedServiceChargeStatus}
            options={SERVICE_CHARGE_OPTIONS}
            onChange={onServiceChargeStatusChange}
          />
        </Form.Item>

        <Form.Item name="image" label="แนบรูปภาพ / วิดีโอ">
          <ClaimMediaUpload
            items={mediaItems}
            setItems={setMediaItems}
            maxCount={4}
            videoMode="controls"
            onUploadError={error =>
              api.error({
                message: 'อัปโหลดไฟล์ไม่สำเร็จ',
                description: error.message,
              })
            }
          />
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
