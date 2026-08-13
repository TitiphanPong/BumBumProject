'use client';

import {
  Form,
  Input,
  Select,
  Button,
  Card,
  Upload,
  Divider,
  Checkbox,
  Typography,
  notification,
} from 'antd';
import DatePicker from '@/components/ThaiDatePicker';
import { useState, useEffect } from 'react';
import dayjs from 'dayjs';
import { PlusOutlined } from '@ant-design/icons';
import { formatClaimDateForApi, isSupportedGregorianDate } from '@/lib/claim-date';
import { ClaimMediaItem, mediaItemFromCloudinary } from '@/lib/claim-media';
import type { SheetFormValues } from '@/lib/sheet-types';

const { Option } = Select;

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
  const [productOptions, setProductOptions] = useState<string[]>([]);
  const imageUrls = mediaItems.map(item => item.url);

  const sendNotification = async (payload: Record<string, unknown>) => {
    try {
      const response = await fetch('/api/notify-claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const result = await response.json().catch(() => null);
        throw new Error(result?.message || result?.error || 'Notification request failed');
      }
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

  useEffect(() => {
    const controller = new AbortController();
    const fetchProducts = async () => {
      try {
        const res = await fetch('/api/get-productlist', { signal: controller.signal });
        const data: Array<{ name: string }> = await res.json();
        const names = data.map(product => product.name);
        setProductOptions(names);
      } catch (err) {
        if (controller.signal.aborted) return;
        console.error('โหลดรายการสินค้าไม่สำเร็จ:', err);
      }
    };
    fetchProducts();
    return () => controller.abort();
  }, []);

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

        await sendNotification({
          provinceName: values.provinceName,
          customerName: values.customerName,
          product: values.product,
          buyProductDate: formattedValues.buyProductDate,
          problemDetail: values.problem,
          address: values.address,
          phone: values.phone,
          warrantyStatus: selectedWarranty[0] || '-',
          image: imageUrls,
          notifyType: 'แจ้งเคลมสินค้า',
        });

        if (claimStatus === 'จบเคลม') {
          await sendNotification({
            provinceName: values.provinceName,
            customerName: values.customerName,
            product: values.product,
            problemDetail: values.problem,
            warrantyStatus: selectedWarranty[0] || '-',
            claimer: values.claimSender || '-',
            vehicle: selectedVehicleClaim[0] || '-',
            claimDate: formattedValues.claimDate || '-',
            serviceFeeDeducted: selectedServiceChargeStatus[0] === 'หักค่าบริการแล้ว',
            image: imageUrls,
            notifyType: 'จบเคลม',
          });
        } else if (inspectStatus === 'จบการตรวจสอบ' && claimStatus !== 'จบเคลม') {
          await sendNotification({
            provinceName: values.provinceName,
            customerName: values.customerName,
            product: values.product,
            problemDetail: values.problem,
            warrantyStatus: selectedWarranty[0] || '-',
            inspector: values.inspector || '-',
            vehicle: selectedVehicleInspector[0] || '-',
            inspectionDate: formattedValues.inspectionDate || '-',
            image: imageUrls,
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

  const onWarrantyChange = (checkedValues: string[]) => {
    if (checkedValues.length > 1) {
      checkedValues = [checkedValues[checkedValues.length - 1]];
    }
    setSelectedWarranty(checkedValues);
    form.setFieldsValue({ warranty: checkedValues });
  };

  const onVehicleClaimChange = (checkedValues: string[]) => {
    if (checkedValues.length > 1) {
      checkedValues = [checkedValues[checkedValues.length - 1]];
    }
    setSelectedVehicleClaim(checkedValues);
    form.setFieldsValue({ vehicleClaim: checkedValues });
  };

  const onVehicleInspectorChange = (checkedValues: string[]) => {
    if (checkedValues.length > 1) {
      checkedValues = [checkedValues[checkedValues.length - 1]];
    }
    setSelectedVehicleInspector(checkedValues);
    form.setFieldsValue({ vehicleInspector: checkedValues });
  };

  const onServiceChargeStatusChange = (checkedValues: string[]) => {
    if (checkedValues.length > 1) {
      checkedValues = [checkedValues[checkedValues.length - 1]];
    }
    setSelectedServiceChargeStatus(checkedValues);
    form.setFieldsValue({ serviceChargeStatus: checkedValues });
  };

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
          <Select placeholder="เลือกจังหวัด">
            <Option value="กรุงเทพฯ">กรุงเทพฯ</Option>
            <Option value="อำนาจเจริญ">อำนาจเจริญ</Option>
            <Option value="โคราช">โคราช</Option>
          </Select>
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
          <Select
            placeholder="เลือกหรือพิมพ์ชื่อสินค้า"
            style={{ width: '100%' }}
            tokenSeparators={[',']}>
            {productOptions.map(product => (
              <Select.Option key={product} value={product}>
                {product}
              </Select.Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item
          name="buyProductDate"
          label="วันที่ซื้อ"
          rules={[
            {
              validator: (_, value) =>
                isSupportedGregorianDate(value)
                  ? Promise.resolve()
                  : Promise.reject(new Error('กรุณากรอกปี ค.ศ. เช่น 2026 ไม่ใช่ปี พ.ศ. 2569')),
            },
          ]}>
          <DatePicker format="DD/MM/BBBB" style={{ width: '100%' }} />
        </Form.Item>

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
          <Checkbox.Group value={selectedWarranty} onChange={onWarrantyChange}>
            <Checkbox value="อยู่ในประกัน">อยู่ในประกัน</Checkbox>
            <Checkbox value="หมดประกัน">หมดประกัน</Checkbox>
          </Checkbox.Group>
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
          <Checkbox.Group value={selectedVehicleInspector} onChange={onVehicleInspectorChange}>
            <Checkbox value="รถยนต์">รถยนต์</Checkbox>
            <Checkbox value="รถมอเตอร์ไซค์">รถมอเตอร์ไซค์</Checkbox>
          </Checkbox.Group>
        </Form.Item>
        <Form.Item name="inspectionDate" label="วันที่ตรวจสอบ">
          <DatePicker format="DD/MM/BBBB" style={{ width: '100%' }} />
        </Form.Item>

        <Form.Item
          name="inspectstatus"
          label="สถานะการตรวจสอบ"
          rules={[{ required: true, message: 'กรุณาเลือกสถานะการตรวจสอบ' }]}>
          <Select placeholder="เลือกสถานะการตรวจสอบ" style={{ width: '100%' }}>
            <Option value="ไปตรวจสอบเอง">ไปตรวจสอบเอง</Option>
            <Option value="รอตรวจสอบ">รอตรวจสอบ</Option>
            <Option value="จบการตรวจสอบ">จบการตรวจสอบ</Option>
            <Option value="ยกเลิกการตรวจสอบ">ยกเลิกการตรวจสอบ</Option>
          </Select>
        </Form.Item>

        <Form.Item name="claimSender" label="คนไปเคลม">
          <Input placeholder="ชื่อช่างหรือผู้รับเคลม" />
        </Form.Item>
        <Form.Item name="vehicleClaim" label="ยานพาหนะของคนไปเคลม">
          <Checkbox.Group value={selectedVehicleClaim} onChange={onVehicleClaimChange}>
            <Checkbox value="รถยนต์">รถยนต์</Checkbox>
            <Checkbox value="รถมอเตอร์ไซค์">รถมอเตอร์ไซค์</Checkbox>
          </Checkbox.Group>
        </Form.Item>
        <Form.Item name="claimDate" label="วันที่เคลม">
          <DatePicker format="DD/MM/BBBB" style={{ width: '100%' }} />
        </Form.Item>

        <Form.Item
          name="status"
          label="สถานะการเคลม"
          rules={[{ required: true, message: 'กรุณาเลือกสถานะการเคลม' }]}>
          <Select placeholder="เลือกสถานะการเคลม" style={{ width: '100%' }}>
            <Option value="ไปเคลมเอง">ไปเคลมเอง</Option>
            <Option value="รอเคลม">รอเคลม</Option>
            <Option value="จบเคลม">จบเคลม</Option>
            <Option value="ยกเลิกเคลม">ยกเลิกเคลม</Option>
          </Select>
        </Form.Item>

        {/* <Form.Item name="price" label="จำนวนเงิน">
          <Input 
          placeholder="กรอกจำนวนเงิน"
          prefix="฿"
          type='number' />
        </Form.Item> */}

        <Form.Item name="serviceChargeStatus" label="ค่าบริการ">
          <Checkbox.Group
            value={selectedServiceChargeStatus}
            onChange={onServiceChargeStatusChange}>
            <Checkbox value="หักค่าบริการแล้ว">หักค่าบริการแล้ว</Checkbox>
            <Checkbox value="ยังไม่หักค่าบริการ">ยังไม่หักค่าบริการ</Checkbox>
          </Checkbox.Group>
        </Form.Item>

        <Form.Item name="image" label="แนบรูปภาพ / วิดีโอ">
          <Upload
            name="file"
            listType="picture-card"
            accept="image/*,video/*"
            showUploadList={true}
            maxCount={4}
            customRequest={async ({ file, onSuccess, onError }) => {
              try {
                const formData = new FormData();
                formData.append('file', file as Blob);
                formData.append('upload_preset', process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET!);

                const res = await fetch(
                  `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/auto/upload`,
                  {
                    method: 'POST',
                    body: formData,
                  }
                );

                const data = await res.json();
                if (!res.ok) throw new Error(data?.error?.message || 'Cloudinary upload failed');
                const item = mediaItemFromCloudinary(data, (file as File).name);
                setMediaItems(prev => [...prev, item]);
                onSuccess && onSuccess(data, new XMLHttpRequest());
              } catch (err) {
                api.error({
                  message: 'อัปโหลดไฟล์ไม่สำเร็จ',
                  description:
                    err instanceof Error ? err.message : 'ไฟล์ไม่รองรับหรืออัปโหลดไม่ได้',
                });
                onError?.(err instanceof Error ? err : new Error(String(err)));
              }
            }}
            fileList={mediaItems.map((item, idx) => ({
              uid: String(idx),
              name: item.name,
              status: 'done',
              url: item.url,
              type:
                item.resourceType === 'video'
                  ? `video/${item.format || 'mp4'}`
                  : `image/${item.format || 'jpeg'}`,
            }))}
            itemRender={(originNode, file, _fileList, actions) =>
              file.type?.startsWith('video/') ? (
                <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                  <video
                    src={file.url}
                    muted
                    controls
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                  <Button
                    danger
                    size="small"
                    style={{ position: 'absolute', right: 4, top: 4 }}
                    onClick={() => actions.remove()}>
                    ×
                  </Button>
                </div>
              ) : (
                originNode
              )
            }
            onRemove={file => {
              setMediaItems(items => items.filter(item => item.url !== file.url));
              return true;
            }}>
            {mediaItems.length < 4 && (
              <div>
                <PlusOutlined />
                <div style={{ marginTop: 8 }}>อัปโหลด</div>
              </div>
            )}
          </Upload>
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
