'use client';

import CrudTable from './CrudTable';
import { Modal, Form, Input, DatePicker, Button, Typography, Divider, Select } from 'antd';
import dayjs from 'dayjs';
import { notification } from 'antd';
import { useEffect, useMemo, useState } from 'react';
import type { SheetFormValues, SheetRow } from '@/lib/sheet-types';

export default function TableAllPage() {
  const [claims, setClaims] = useState<SheetRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRow, setSelectedRow] = useState<SheetRow | null>(null);
  const [form] = Form.useForm();
  const [searchText, setSearchText] = useState('');
  const [filteredClaims, setFilteredClaims] = useState<SheetRow[]>([]);
  const [api, contextHolder] = notification.useNotification();
  const [selectedProvince, setSelectedProvince] = useState<string | undefined>();

  // ✅ รายการจังหวัด (unique) จากข้อมูล
  const provinceOptions = useMemo(() => {
    const set = new Set<string>();
    claims.forEach(c => {
      const p = c.ProvinceName || c.provinceName;
      if (p && typeof p === 'string') set.add(p.trim());
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'th'));
  }, [claims]);

  // ✅ ฟังก์ชันรวมสำหรับกรองตามจังหวัด + ข้อความค้นหา
  const applyFilters = (args?: { text?: string; province?: string }) => {
    const text = (args?.text ?? searchText).toLowerCase().trim();
    const province = args?.province ?? selectedProvince;

    let data = [...claims];

    if (province && province !== 'ทั้งหมด') {
      data = data.filter(i => {
        const p = i.ProvinceName || i.provinceName;
        return typeof p === 'string' && p.trim() === province;
      });
    }

    if (text) {
      data = data.filter(item =>
        Object.values(item).some(
          field => typeof field === 'string' && field.toLowerCase().includes(text)
        )
      );
    }

    setFilteredClaims(data);
  };

  const fetchClaims = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/get-claim', { cache: 'no-store' });
      const data: SheetRow[] = await response.json();

      const dataWithIds = data
        .filter((item: SheetRow): item is SheetRow & { id: string } => !!item.id)
        .map(item => ({
          ...item,
          id: item.id.trim(),
        }))
        .reverse();

      setClaims(dataWithIds);
      setFilteredClaims(dataWithIds);
      setSearchText('');
      setSelectedProvince(undefined);
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
    const filtered = claims.filter(item =>
      Object.values(item).some(
        field => typeof field === 'string' && field.toLowerCase().includes(lowerValue)
      )
    );
    setFilteredClaims(filtered.reverse());
    setSearchText(value);
    applyFilters({ text: value });
  };

  const onProvinceChange = (val?: string) => {
    setSelectedProvince(val);
    applyFilters({ province: val });
  };

  const resetFilters = () => {
    setSelectedProvince(undefined);
    setSearchText('');
    setFilteredClaims(claims);
  };
  const handleRefreshAndReset = async () => {
    resetFilters();
    await fetchClaims();
  };

  const handleEdit = (record: SheetRow) => {
    const transformedRecord = {
      provinceName: record.ProvinceName,
      customerName: record.CustomerName,
      warranty: typeof record.Warranty === 'string'
        ? record.Warranty.split(',').map((item: string) => item.trim())
        : record.Warranty || [],
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

  const handleSubmit = async (values: SheetFormValues) => {
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
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <Select
          allowClear
          placeholder="เลือกจังหวัด"
          value={selectedProvince}
          onChange={onProvinceChange}
          options={[
            { label: 'ทั้งหมด', value: 'ทั้งหมด' },
            ...provinceOptions.map(p => ({ label: p, value: p })),
          ]}
          style={{ width: 200 }}
        />
      </div>
      {contextHolder}
      <Input.Search
        placeholder="ค้นหา..."
        enterButton
        value={searchText}
        onChange={e => setSearchText(e.target.value)}
        onSearch={handleSearch}
        style={{ marginBottom: 24 }}
        allowClear
      />

      <CrudTable
        data={filteredClaims}
        title=""
        onEdit={handleEdit}
        onRefresh={handleRefreshAndReset}
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
        width={800}>
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
            <DatePicker style={{ width: '100%' }} format="DD/MM/BBBB" />
          </Form.Item>
          <Form.Item label="ผู้เบิกของ" name="requester">
            <Input placeholder="ชื่อฝ่ายเครดิต" />
          </Form.Item>
          <Form.Item label="ผู้จ่ายของ" name="payer">
            <Input placeholder="ชื่อฝ่ายสต็อค" />
          </Form.Item>
          <Form.Item label="ผู้รับของ " name="receiver">
            <Input placeholder="ชื่อฝ่ายสต็อค ⚠️ *กรอกข้อมูลเมื่อได้รับอะไหล่คืน*" />
          </Form.Item>
          <Form.Item label="วันที่รับของ" name="receiverItemDate">
            <DatePicker style={{ width: '100%' }} format="DD/MM/BBBB" />
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
