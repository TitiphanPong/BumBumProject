'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Form,
  Modal,
  Input,
  Button,
  Typography,
  Divider,
  message,
  Select,
  Checkbox,
  notification,
} from 'antd';
import DatePicker from '@/components/ThaiDatePicker';
import dayjs from 'dayjs';
import CRUDSparePart from '../components/CRUDSparePart';
import type { SheetFormValues, SheetRow } from '@/lib/sheet-types';
import { fetchJsonArray, fetchJsonPage } from '@/lib/client-fetch';

const PAGE_SIZE = 8;

export default function SparePartPage() {
  const [parts, setParts] = useState<SheetRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRow, setSelectedRow] = useState<SheetRow | null>(null);
  const [searchText, setSearchText] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [form] = Form.useForm();
  const [filteredParts, setFilteredParts] = useState<SheetRow[]>([]);
  const [api, contextHolder] = notification.useNotification();
  const [selectedProvince, setSelectedProvince] = useState<string | undefined>();
  const [serverPagination, setServerPagination] = useState<boolean | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [serverProvinceOptions, setServerProvinceOptions] = useState<string[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);

  const provinceOptions = useMemo(() => {
    if (serverPagination === true) return serverProvinceOptions;

    const set = new Set<string>();
    parts.forEach(c => {
      const p = c.ProvinceName || c.provinceName;
      if (p && typeof p === 'string') set.add(p.trim());
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'th'));
  }, [parts, serverPagination, serverProvinceOptions]);

  const fetchParts = async (signal?: AbortSignal, forceLegacy = false) => {
    setLoading(true);
    try {
      if (!forceLegacy && serverPagination !== false) {
        const params = new URLSearchParams({
          page: String(page),
          limit: String(PAGE_SIZE),
          direction: 'desc',
        });
        if (searchText) params.set('search', searchText);
        if (selectedProvince && selectedProvince !== 'ทั้งหมด') {
          params.set('provinceName', selectedProvince);
        }

        const paged = await fetchJsonPage<SheetRow>(`/api/get-spare?${params.toString()}`, {
          signal,
        });

        // New Apps Script returns this marker. Older deployed scripts omit it,
        // so we safely fall back to the original full-list behavior.
        if (paged.directionApplied === 'desc') {
          if (paged.items.length === 0 && paged.total > 0 && page > 1) {
            setPage(Math.max(1, paged.totalPages));
            return;
          }

          const withId = paged.items.map((d, index) => ({
            ...d,
            id: d.id?.trim() || `row-${(page - 1) * PAGE_SIZE + index}`,
          }));
          setServerPagination(true);
          setParts(withId);
          setFilteredParts(withId);
          setTotal(paged.total);
          setServerProvinceOptions(paged.facets?.provinces || []);
          return;
        }
      }

      const data = await fetchJsonArray<SheetRow>('/api/get-spare', { signal });
      const withId = data.map((d, index) => ({
        ...d,
        id: d.id?.trim() || `row-${index}`,
      }));
      const baseFilter = withId.slice().reverse();

      setServerPagination(false);
      setParts(baseFilter);
      setFilteredParts(baseFilter);
      setTotal(baseFilter.length);
    } catch (err) {
      if (signal?.aborted) return;
      message.error('โหลดข้อมูลไม่สำเร็จ');
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  };

  useEffect(() => {
    if (serverPagination === false) return;
    const controller = new AbortController();
    fetchParts(controller.signal);
    return () => controller.abort();
  }, [page, searchText, selectedProvince, refreshKey]);

  useEffect(() => {
    if (serverPagination !== false) return;

    const text = searchText.toLowerCase().trim();
    let data = [...parts];

    if (selectedProvince && selectedProvince !== 'ทั้งหมด') {
      data = data.filter(i => {
        const p = i.ProvinceName || i.provinceName;
        return typeof p === 'string' && p.trim() === selectedProvince;
      });
    }

    if (text) {
      data = data.filter(item =>
        Object.values(item).some(
          field => typeof field === 'string' && field.toLowerCase().includes(text)
        )
      );
    }

    setFilteredParts(data);
    setTotal(data.length);
  }, [parts, searchText, selectedProvince, serverPagination]);

  const handleSearch = (value: string) => {
    const normalized = value.trim();
    setSearchInput(value);
    setSearchText(normalized);
    setPage(1);
  };

  const handleEdit = (record: SheetRow) => {
    const parseDate = (dateStr?: string) => {
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

  const onProvinceChange = (val?: string) => {
    setSelectedProvince(val);
    setPage(1);
  };

  const resetFilters = () => {
    setSelectedProvince(undefined);
    setSearchInput('');
    setSearchText('');
    setPage(1);
  };

  const handleRefreshAndReset = async () => {
    resetFilters();
    if (serverPagination === false) {
      await fetchParts(undefined, true);
    } else {
      setRefreshKey(key => key + 1);
    }
  };

  const handleDelete = async (record: SheetRow) => {
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

  const replaceEmptyWithDash = (obj: SheetFormValues) => {
    const newObj: SheetFormValues = {};
    for (const key in obj) {
      if (obj[key] === '' || obj[key] === null || obj[key] === undefined) {
        newObj[key] = '-';
      } else if (Array.isArray(obj[key]) && obj[key].length === 0) {
        newObj[key] = '-';
      } else {
        newObj[key] = obj[key];
      }
    }
    return newObj;
  };

  const handleSubmit = async (values: SheetFormValues) => {
    setLoading(true);

    const cleanValues = replaceEmptyWithDash(values);

    const fullData = {
      id: selectedRow?.id,
      ...cleanValues,
      sheetName: 'เบิกอะไหล่',

      requestDate: values.requestDate?.isValid?.() ? values.requestDate.format('YYYY-MM-DD') : '-',

      receiverItemDate: values.receiverItemDate?.isValid?.()
        ? values.receiverItemDate.format('YYYY-MM-DD')
        : '-',
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
    <div className="mx-auto w-full max-w-[1400px] px-3 py-4 sm:px-4 md:px-6">
      <div className="mb-4 flex w-full justify-stretch sm:justify-end">
        <Select
          allowClear
          placeholder="เลือกจังหวัด"
          value={selectedProvince}
          onChange={onProvinceChange}
          options={[
            { label: 'ทั้งหมด', value: 'ทั้งหมด' },
            ...provinceOptions.map(p => ({ label: p, value: p })),
          ]}
          className="w-full sm:w-[200px]"
        />
      </div>
      {contextHolder}
      <Typography.Title level={3}>🔧 ตารางเบิกอะไหล่</Typography.Title>

      <Input.Search
        placeholder="ค้นหา..."
        enterButton
        value={searchInput}
        onChange={e => {
          const value = e.target.value;
          setSearchInput(value);
          if (!value) {
            setSearchText('');
            setPage(1);
          }
        }}
        onSearch={handleSearch}
        className="mb-6"
        allowClear
      />

      <CRUDSparePart
        data={filteredParts}
        loading={loading}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onRefresh={handleRefreshAndReset}
        pagination={{
          current: page,
          pageSize: PAGE_SIZE,
          total,
          showSizeChanger: false,
          responsive: true,
          showLessItems: true,
          onChange: nextPage => setPage(nextPage),
        }}
      />

      <Modal
        title={
          <div style={{ fontSize: 22, fontWeight: 'bold', color: '#000000ff', marginTop: 16 }}>
            🛠️ แก้ไขรายการเบิกอะไหล่
          </div>
        }
        open={isModalOpen}
        onCancel={() => {
          form.resetFields();
          setIsModalOpen(false);
        }}
        footer={null}
        width={800}>
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
          <Form.Item name="customerName" label="ชื่อลูกค้า">
            <Input />
          </Form.Item>
          <Form.Item name="product" label="สินค้า">
            <Input />
          </Form.Item>
          <Form.Item name="warranty" label="ประเภทประกัน">
            <Checkbox.Group>
              <Checkbox value="อยู่ในประกัน">อยู่ในประกัน</Checkbox>
              <Checkbox value="หมดประกัน">หมดประกัน</Checkbox>
            </Checkbox.Group>
          </Form.Item>
          <Form.Item name="problem" label="รายละเอียดปัญหา">
            <Input.TextArea />
          </Form.Item>

          <Divider />
          <Typography.Title level={4}>บัญชี / สต็อค</Typography.Title>
          <Form.Item name="part" label="ชื่ออะไหล่">
            <Input />
          </Form.Item>
          <Form.Item name="requestDate" label="วันที่เบิก">
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
          <Form.Item name="receiverItemDate" label="วันที่รับของ">
            <DatePicker style={{ width: '100%' }} format="DD/MM/BBBB" />
          </Form.Item>
          <Form.Item name="note" label="หมายเหตุ">
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
