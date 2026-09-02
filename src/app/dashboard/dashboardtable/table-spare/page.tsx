'use client';

import { useEffect, useMemo, useState } from 'react';
import { Form, Modal, message, notification } from 'antd';
import PaginatedListToolbar from '../../components/PaginatedListToolbar';
import SparePartFormFields from '../../components/SparePartFormFields';
import dayjs from 'dayjs';
import CRUDSparePart from '../components/CRUDSparePart';
import type { SheetFormValues, SheetRow } from '@/lib/sheet-types';
import { replaceEmptySheetValuesWithDash } from '@/lib/sheet-form';
import {
  filterSheetRows,
  getSheetProvinceOptions,
  withFallbackSheetRowIds,
} from '@/lib/sheet-row-utils';
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

  const provinceOptions = useMemo(
    () => (serverPagination === true ? serverProvinceOptions : getSheetProvinceOptions(parts)),
    [parts, serverPagination, serverProvinceOptions]
  );

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

          const withId = withFallbackSheetRowIds(paged.items, (page - 1) * PAGE_SIZE);
          setServerPagination(true);
          setParts(withId);
          setFilteredParts(withId);
          setTotal(paged.total);
          setServerProvinceOptions(paged.facets?.provinces || []);
          return;
        }
      }

      const data = await fetchJsonArray<SheetRow>('/api/get-spare', { signal });
      const withId = withFallbackSheetRowIds(data);
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

    const data = filterSheetRows(parts, {
      province: selectedProvince,
      search: searchText,
    });
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

  const handleSubmit = async (values: SheetFormValues) => {
    setLoading(true);

    const cleanValues = replaceEmptySheetValuesWithDash(values);

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
      {contextHolder}
      <PaginatedListToolbar
        title="🔧 ตารางเบิกอะไหล่"
        provinceOptions={provinceOptions}
        selectedProvince={selectedProvince}
        onProvinceChange={onProvinceChange}
        searchValue={searchInput}
        onSearchValueChange={value => {
          setSearchInput(value);
          if (!value) {
            setSearchText('');
            setPage(1);
          }
        }}
        onSearch={handleSearch}
      />

      <CRUDSparePart
        data={filteredParts}
        loading={loading}
        onEdit={handleEdit}
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
          <SparePartFormFields mode="edit" loading={loading} />
        </Form>
      </Modal>
    </div>
  );
}
