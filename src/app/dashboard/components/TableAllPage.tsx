'use client';

import CrudTable from './CrudTable';
import SparePartFormFields from './SparePartFormFields';
import { Form, Input, Modal, Select, Typography, notification } from 'antd';
import dayjs from 'dayjs';
import { useEffect, useMemo, useState } from 'react';
import type { SheetFormValues, SheetRow } from '@/lib/sheet-types';
import { filterSheetRows, getSheetProvinceOptions } from '@/lib/sheet-row-utils';
import { fetchJsonArray } from '@/lib/client-fetch';

export default function TableAllPage() {
  const [claims, setClaims] = useState<SheetRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRow, setSelectedRow] = useState<SheetRow | null>(null);
  const [form] = Form.useForm();
  const [searchText, setSearchText] = useState('');
  const [committedSearchText, setCommittedSearchText] = useState('');
  const [api, contextHolder] = notification.useNotification();
  const [selectedProvince, setSelectedProvince] = useState<string | undefined>();

  const provinceOptions = useMemo(() => getSheetProvinceOptions(claims), [claims]);

  // Derived data stays in sync with source rows; typing only commits on Search/Enter.
  const filteredClaims = useMemo(
    () =>
      filterSheetRows(claims, {
        province: selectedProvince,
        search: committedSearchText,
      }),
    [claims, committedSearchText, selectedProvince]
  );

  const fetchClaims = async (signal?: AbortSignal) => {
    setLoading(true);
    try {
      const data = await fetchJsonArray<SheetRow>('/api/get-claim', { signal });

      const dataWithIds = data
        .filter((item: SheetRow): item is SheetRow & { id: string } => !!item.id)
        .map(item => ({
          ...item,
          id: item.id.trim(),
        }))
        .reverse();

      setClaims(dataWithIds);
      setSearchText('');
      setCommittedSearchText('');
      setSelectedProvince(undefined);
    } catch (error) {
      if (signal?.aborted) return;
      console.error('Error fetching parts:', error);
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    fetchClaims(controller.signal);
    return () => controller.abort();
  }, []);

  const handleSearch = (value: string) => {
    setSearchText(value);
    setCommittedSearchText(value);
  };

  const onProvinceChange = (val?: string) => {
    setSelectedProvince(val);
  };

  const resetFilters = () => {
    setSelectedProvince(undefined);
    setSearchText('');
    setCommittedSearchText('');
  };
  const handleRefreshAndReset = async () => {
    resetFilters();
    await fetchClaims();
  };

  const handleEdit = (record: SheetRow) => {
    const transformedRecord = {
      provinceName: record.ProvinceName,
      customerName: record.CustomerName,
      warranty:
        typeof record.Warranty === 'string'
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

          <SparePartFormFields mode="claim-request" loading={loading} />
        </Form>
      </Modal>
    </div>
  );
}
