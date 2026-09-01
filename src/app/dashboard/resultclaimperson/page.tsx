'use client';

import { Card, Select, message, Table, Typography, Grid, Statistic, Spin, Modal, Tag } from 'antd';
import DatePicker from '@/components/ThaiDatePicker';
import { useEffect, useMemo, useRef, useState } from 'react';
import { fetchJsonArray, fetchJsonPage } from '@/lib/client-fetch';
import type { ColumnsType } from 'antd/es/table';
import dayjs, { Dayjs } from 'dayjs';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import { formatClaimDateForDisplay } from '@/lib/claim-date';
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  SyncOutlined,
} from '@ant-design/icons';

dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);

const { RangePicker } = DatePicker;
const { Option } = Select;
const { Text } = Typography;
const { useBreakpoint } = Grid;

const FEE_PER_CASE = 30;

// ---------- Types ----------
type ClaimItem = {
  id: string;
  claimNo?: string;

  // ตัวกรอง
  ProvinceName?: string; // บางแหล่งใช้คีย์นี้
  provinceName?: string; // บางแหล่งใช้คีย์นี้
  receiverClaimDate?: string;

  // ใช้คิดค่าบริการ
  vehicleClaim?: string;
  vehicle?: string;
  vehicleType?: string;
  status?: string; // "จบเคลม" เท่านั้นที่นับ
  serviceFeeStatus?: string | boolean | null;
  serviceChargeStatus?: string | boolean | null;

  // คนไปเคลม (ลองหลายคีย์)
  claimSender?: string;
  claimerName?: string;
  คนไปเคลม?: string;
  ผู้เคลม?: string;
  assignedTo?: string;
  assignee?: string;
  technician?: string;
  employeeName?: string;
  handlerName?: string;
  staff?: string;

  // อื่น ๆ ที่โชว์ในโมดัล
  customerName?: string;
  product?: string;
  claimDate?: string;
  [key: string]: unknown;
};

type PersonRow = { key: string; person: string; cases: number; amount: number };

type ClaimPersonMetrics = {
  totalCasesAll: number;
  totalEligible: number;
  totalAmount: number;
};

type ClaimPersonAggregate = {
  aggregateApplied: 'claimPerson';
  metrics: ClaimPersonMetrics;
  personRows: PersonRow[];
  provinces: string[];
};

// ---------- Utils ----------
const normalize = (x: unknown) => String(x ?? '').trim();

const nestedName = (value: unknown) =>
  value && typeof value === 'object' && 'name' in value ? normalize(value.name) : '';

const CUSTOMER_KEYS = [
  'customerName',
  'customer',
  'CustomerName',
  'Customer',
  'customer_name',
  'customerTH',
  'customer_th',
  'ชื่อลูกค้า',
  'ลูกค้า',
  'ชื่อ',
];
function getCustomerName(item: ClaimItem): string {
  for (const k of CUSTOMER_KEYS) {
    const v = normalize(item?.[k]);
    if (v) return v;
  }
  return nestedName(item.customer) || nestedName(item.customerInfo) || '';
}

const CLAIMER_KEYS = [
  'claimSender',
  'claimerName',
  'คนไปเคลม',
  'ผู้เคลม',
  'assignedTo',
  'assignee',
  'technician',
  'employeeName',
  'handlerName',
  'staff',
];
function getClaimerName(item: ClaimItem): string {
  for (const k of CLAIMER_KEYS) {
    const v = normalize(item?.[k]);
    if (v) return v;
  }
  return nestedName(item.claimer) || nestedName(item.assignee) || nestedName(item.handler) || '';
}

function getProvince(item: ClaimItem) {
  return normalize(item.ProvinceName || item.provinceName || item['สาขา']) || 'อื่นๆ';
}

function pickVehicle(it: ClaimItem) {
  return normalize(it.vehicleClaim) || normalize(it.vehicle) || normalize(it.vehicleType);
}
function isMotorcycle(v?: string) {
  const s = normalize(v);
  return /มอ|มอเตอร์|motor/i.test(s);
}
function getServiceFeeFlag(item: ClaimItem) {
  const value = item.serviceFeeStatus ?? item.serviceChargeStatus ?? item['สถานะค่าบริการ'];
  return typeof value === 'string' || typeof value === 'boolean' ? value : null;
}
// เข้มงวด: ต้องมีคำว่า "ยังไม่หัก" เท่านั้น (ค่าว่าง/อย่างอื่น = ไม่นับ)
function isNotDeductedStrict(flag?: string | boolean | null) {
  if (typeof flag === 'boolean') return flag === false; // false = ยังไม่หัก (กรณี boolean)
  const s = normalize(flag);
  if (!s) return false;
  return s.includes('ยังไม่หัก');
}
// กฎคิดเงินตัวเดียวที่ทุกที่ต้องใช้
const isCountable = (it: ClaimItem) =>
  isMotorcycle(pickVehicle(it)) &&
  normalize(it.status) === 'จบเคลม' &&
  isNotDeductedStrict(getServiceFeeFlag(it));

function renderClaimTag(value?: string) {
  const v = (value ?? '').toString().trim();
  if (!v) return <span style={{ color: '#999' }}>-</span>;

  const map: Record<string, { color: string; icon?: React.ReactNode }> = {
    ไปตรวจสอบเอง: { color: 'blue', icon: <ClockCircleOutlined /> },
    ไปเคลมเอง: { color: 'blue', icon: <ClockCircleOutlined /> },
    รอตรวจสอบ: { color: 'yellow', icon: <SyncOutlined /> },
    รอเคลม: { color: 'yellow', icon: <SyncOutlined /> },
    จบการตรวจสอบ: { color: 'green', icon: <CheckCircleOutlined /> },
    จบเคลม: { color: 'green', icon: <CheckCircleOutlined /> },
    ยกเลิกการตรวจสอบ: { color: 'red', icon: <CloseCircleOutlined /> },
    ยกเลิกเคลม: { color: 'red', icon: <CloseCircleOutlined /> },
  };

  const byPrefix = (p: string) =>
    p === 'ไป'
      ? 'blue'
      : p === 'รอ'
        ? 'yellow'
        : p === 'จบ'
          ? 'green'
          : p === 'ยกเลิก'
            ? 'red'
            : 'default';

  const meta = map[v] ?? { color: byPrefix(v[0] || ''), icon: undefined };
  return (
    <Tag color={meta.color} icon={meta.icon}>
      {v}
    </Tag>
  );
}

function getFinishDate(it: ClaimItem): string {
  if (!it.claimDate || it.claimDate === '-') {
    return '-';
  }

  return formatClaimDateForDisplay(it.claimDate);
}

function getClaimRowKey(item: ClaimItem, index?: number) {
  if (item.id) return item.id;
  if (item.claimNo) return item.claimNo;

  const fallback = [
    getProvince(item),
    getCustomerName(item),
    getClaimerName(item),
    normalize(item.product),
    normalize(item.receiverClaimDate),
    normalize(item.claimDate),
  ].join('|');

  return `${fallback}|${index ?? 0}`;
}

function isClaimPersonAggregate(value: unknown): value is ClaimPersonAggregate {
  if (!value || typeof value !== 'object') return false;
  const aggregate = value as Partial<ClaimPersonAggregate>;
  const metrics = aggregate.metrics as Partial<ClaimPersonMetrics> | undefined;
  return (
    aggregate.aggregateApplied === 'claimPerson' &&
    Boolean(metrics) &&
    typeof metrics?.totalCasesAll === 'number' &&
    typeof metrics.totalEligible === 'number' &&
    typeof metrics.totalAmount === 'number' &&
    Array.isArray(aggregate.personRows) &&
    Array.isArray(aggregate.provinces)
  );
}

// ---------- Component ----------
export default function DashboardPage() {
  const screens = useBreakpoint();
  const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null] | null>(null);
  const [selectedProvince, setSelectedProvince] = useState<string>('ทั้งหมด');
  const [loading, setLoading] = useState(false);
  const [raw, setRaw] = useState<ClaimItem[]>([]); // legacy fallback only
  const [claimPersonAggregate, setClaimPersonAggregate] = useState<ClaimPersonAggregate | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPerson, setSelectedPerson] = useState<string | null>(null);
  const [modalClaims, setModalClaims] = useState<ClaimItem[]>([]);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalPage, setModalPage] = useState(1);
  const [modalTotal, setModalTotal] = useState(0);
  const aggregateSupportRef = useRef<boolean | null>(null);
  const legacyLoadedRef = useRef(false);

  const DATA_URL = '/api/get-claim';
  const detailPageSize = screens.sm ? 10 : 6;

  const appendActiveFilters = (params: URLSearchParams) => {
    if (selectedProvince !== 'ทั้งหมด') params.set('provinceName', selectedProvince);
    if (dateRange?.[0] && dateRange[1]) {
      params.set('dateFrom', dateRange[0].format('YYYY-MM-DD'));
      params.set('dateTo', dateRange[1].format('YYYY-MM-DD'));
    }
  };

  const fetchSummaryData = async (signal?: AbortSignal) => {
    if (aggregateSupportRef.current === false && legacyLoadedRef.current) return;

    try {
      setLoading(true);

      if (aggregateSupportRef.current !== false) {
        const params = new URLSearchParams({ aggregate: 'claimPerson', page: '1', limit: '1' });
        appendActiveFilters(params);
        const response = await fetch(`${DATA_URL}?${params.toString()}`, {
          signal,
          cache: 'no-store',
        });
        if (!response.ok) throw new Error(`Claim person aggregate failed: ${response.status}`);

        const payload: unknown = await response.json();
        if (isClaimPersonAggregate(payload)) {
          aggregateSupportRef.current = true;
          setClaimPersonAggregate(payload);
          setRaw([]);
          return;
        }

        aggregateSupportRef.current = false;
      }

      const rows = await fetchJsonArray<ClaimItem>(DATA_URL, { signal });
      legacyLoadedRef.current = true;
      setClaimPersonAggregate(null);
      setRaw(rows);
    } catch (err) {
      if (signal?.aborted) return;
      console.error(err);
      message.error('ดึงข้อมูลไม่สำเร็จ');
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    void fetchSummaryData(controller.signal);
    return () => controller.abort();
  }, [selectedProvince, dateRange]);

  const provinceOptions = useMemo(() => {
    if (claimPersonAggregate) return ['ทั้งหมด', ...claimPersonAggregate.provinces];
    const allProvinces = new Set<string>(['ทั้งหมด']);
    for (const item of raw) allProvinces.add(getProvince(item));
    return Array.from(allProvinces);
  }, [raw, claimPersonAggregate]);

  // filter by province & date
  const filteredForFilters = useMemo(() => {
    return raw.filter(item => {
      const isInProvince = selectedProvince === 'ทั้งหมด' || getProvince(item) === selectedProvince;
      if (!isInProvince) return false;

      if (!dateRange) return true;
      const rawDate = item.receiverClaimDate;
      if (!rawDate || !dateRange[0] || !dateRange[1]) return false;

      const claimDate = dayjs(rawDate);
      return (
        claimDate.isSameOrAfter(dateRange[0], 'day') &&
        claimDate.isSameOrBefore(dateRange[1], 'day')
      );
    });
  }, [raw, selectedProvince, dateRange]);

  // group: ทุกเคสตามตัวกรองต่อคน (จำนวนเคสทั้งหมด)
  const personToItemsAll = useMemo(() => {
    const m = new Map<string, ClaimItem[]>();
    for (const it of filteredForFilters) {
      const name = getClaimerName(it) || '(ไม่ระบุผู้เคลม)';
      if (!m.has(name)) m.set(name, []);
      m.get(name)!.push(it);
    }
    return m;
  }, [filteredForFilters]);

  // legacy summary fallback when the live Apps Script does not support claim-person aggregates yet
  const localSummary = useMemo(() => {
    const countsByPerson = new Map<string, number>();
    let totalEligible = 0;

    for (const item of filteredForFilters) {
      if (!isCountable(item)) continue;

      totalEligible += 1;
      const person = getClaimerName(item) || '(ไม่ระบุผู้เคลม)';
      countsByPerson.set(person, (countsByPerson.get(person) ?? 0) + 1);
    }

    const rows: PersonRow[] = Array.from(countsByPerson, ([person, cases]) => ({
      key: person,
      person,
      cases,
      amount: cases * FEE_PER_CASE,
    }));

    return {
      metrics: {
        totalCasesAll: filteredForFilters.length,
        totalEligible,
        totalAmount: totalEligible * FEE_PER_CASE,
      },
      personRows: rows,
    };
  }, [filteredForFilters]);

  const metrics = claimPersonAggregate?.metrics ?? localSummary.metrics;
  const personRows = claimPersonAggregate?.personRows ?? localSummary.personRows;
  const isAggregateMode = claimPersonAggregate?.aggregateApplied === 'claimPerson';

  const loadPersonDetails = async (person: string, page: number, signal?: AbortSignal) => {
    if (!isAggregateMode) return;

    try {
      setModalLoading(true);
      const params = new URLSearchParams({
        page: String(page),
        limit: String(detailPageSize),
        claimerName: person,
      });
      appendActiveFilters(params);
      const response = await fetchJsonPage<ClaimItem>(`${DATA_URL}?${params.toString()}`, { signal });
      setModalClaims(response.items);
      setModalPage(response.page);
      setModalTotal(response.total);
    } catch (error) {
      if (signal?.aborted) return;
      console.error(error);
      message.error('โหลดรายละเอียดเคลมไม่สำเร็จ');
    } finally {
      if (!signal?.aborted) setModalLoading(false);
    }
  };

  useEffect(() => {
    if (!isAggregateMode || !isModalOpen || !selectedPerson) return;

    const controller = new AbortController();
    setModalPage(1);
    void loadPersonDetails(selectedPerson, 1, controller.signal);
    return () => controller.abort();
  }, [isAggregateMode, isModalOpen, selectedPerson, selectedProvince, dateRange, detailPageSize]);

  const sortedPersonRows = useMemo(
    () => [...personRows].sort((a, b) => b.cases - a.cases),
    [personRows]
  );

  const columns: ColumnsType<PersonRow> = [
    {
      title: 'คนไปเคลม',
      dataIndex: 'person',
      key: 'person',
      ellipsis: true,
      render: (text: string) => (
        <a
          onClick={() => {
            setSelectedPerson(text);
            setIsModalOpen(true);
            setModalPage(1);
          }}>
          {text}
        </a>
      ),
    },
    {
      title: 'จำนวนเคส',
      dataIndex: 'cases',
      key: 'cases',
      align: 'center',
      width: 120,
      ellipsis: true,
      render: v => <Statistic value={v} />,
    },
    {
      title: 'จำนวนเงินที่ได้',
      dataIndex: 'amount',
      key: 'amount',
      align: 'center',
      width: 120,
      ellipsis: true,
      render: v => <Statistic value={v} />,
    },
  ];

  const detailColumns: ColumnsType<ClaimItem> = [
    {
      title: 'ชื่อลูกค้า',
      key: 'customer',
      ellipsis: true,
      render: (_, r) => getCustomerName(r) || '-',
    },
    {
      title: 'คนไปเคลม',
      key: 'claimer',
      width: 120,
      ellipsis: true,
      render: (_, r) => getClaimerName(r) || '-',
    },

    {
      title: 'สถานะการเคลม',
      dataIndex: 'status',
      key: 'status',
      ellipsis: true,
      width: 150,
      render: v => renderClaimTag(v),
    },

    {
      title: 'สถานะค่าบริการ',
      key: 'service',
      ellipsis: true,
      render: (_, r) => getServiceFeeFlag(r) || '-',
    },

    {
      title: 'ยานพาหนะ',
      dataIndex: 'vehicleClaim',
      key: 'vehicleClaim',
      ellipsis: true,
      render: v => (v && v.toString().trim() ? v : <span style={{ color: '#999' }}>-</span>),
    },

    {
      title: 'วันที่จบเคลม',
      key: 'finish',
      width: 120,
      ellipsis: true,
      render: (_, r) => getFinishDate(r),
    },

    {
      title: 'นับค่าบริการ?',
      key: 'countable',
      width: 120,
      align: 'center',
      render: (_, r) =>
        isCountable(r) ? <Tag color="green">✅ นับ</Tag> : <Tag color="red">❌ ไม่นับ</Tag>,
    },
  ];

  return (
    <main className="bg-gradient-to-br from-gray-50 to-white px-5 py-8 md:px-6 lg:px-10 lg:py-10 rounded-xl pb-8 mb-0">
      <header
        className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-8 mt-4">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 text-center md:text-left mb-2">
          🧑‍🔧 สรุปผลการเคลมรายคน ({selectedProvince})
        </h1>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <Select
            value={selectedProvince}
            onChange={setSelectedProvince}
            style={{ width: screens.xs ? '100%' : 200 }}>
            {provinceOptions.map(prov => (
              <Option key={prov} value={prov}>
                {prov}
              </Option>
            ))}
          </Select>
          <RangePicker
            format="DD/MM/BBBB"
            onChange={val => setDateRange(val)}
            allowClear
            className="w-full sm:w-auto"
            disabledDate={currentDate => {
              if (!dateRange || !dateRange[0]) return false;
              const selectedMonth = dateRange[0].month();
              return currentDate.month() !== selectedMonth;
            }}
          />
        </div>
      </header>

      <Spin spinning={loading} delay={300}>
        {/* Cards */}
        <section
          className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 mb-10">
          {[
            { title: 'จำนวนเคสทั้งหมด', value: metrics.totalCasesAll, color: 'text-blue-500' },
            { title: 'จำนวนเคสที่คิดเงิน', value: metrics.totalEligible, color: 'text-orange-500' },
            {
              title: 'จำนวนเงินทั้งหมด (บาท)',
              value: metrics.totalAmount,
              color: 'text-green-500',
            },
          ].map((item, i) => (
            <Card
              key={i}
              className="rounded-2xl shadow-sm hover:shadow-md transition duration-300 text-center bg-white">
              <p className="text-sm text-gray-500 mb-1">{item.title}</p>
              <p className={`text-3xl font-bold ${item.color}`}>
                {typeof item.value === 'number' ? item.value.toLocaleString() : item.value}
              </p>
            </Card>
          ))}
        </section>

        {/* Modal */}
        <Modal
          title={selectedPerson ? `รายละเอียดเคสของ: ${selectedPerson}` : 'รายละเอียดเคส'}
          open={isModalOpen}
          onCancel={() => setIsModalOpen(false)}
          footer={null}
          width={screens.md ? 1000 : '95%'}
          destroyOnClose>
          <Table
            rowKey={getClaimRowKey}
            columns={detailColumns}
            dataSource={
              isAggregateMode
                ? modalClaims
                : selectedPerson
                  ? personToItemsAll.get(selectedPerson) || []
                  : []
            }
            loading={isAggregateMode ? modalLoading : false}
            pagination={
              isAggregateMode
                ? {
                    current: modalPage,
                    pageSize: detailPageSize,
                    total: modalTotal,
                    showSizeChanger: false,
                    onChange: page => {
                      if (selectedPerson) void loadPersonDetails(selectedPerson, page);
                    },
                  }
                : { pageSize: detailPageSize, showSizeChanger: false }
            }
            scroll={{ x: screens.md ? undefined : true }}
            size={screens.sm ? 'middle' : 'small'}
          />
        </Modal>

        {/* Summary table */}
        <section
          className="bg-white p-6 rounded-3xl shadow-md">
          <h2 className="text-lg font-semibold text-gray-800 mb-4 pb-2 pt-2">
            🧑‍🤝‍🧑 ตารางสรุปค่าบริการรายคน (ตามตัวกรองด้านบน)
          </h2>

          <Table<PersonRow>
            rowKey="key"
            columns={columns}
            dataSource={sortedPersonRows}
            showSorterTooltip={false}
            pagination={{ pageSize: 20, showSizeChanger: false }}
            scroll={{ x: screens.md ? undefined : true }}
            size={screens.sm ? 'middle' : 'small'}
          />
          <Text type="secondary">
            เกณฑ์นับเงิน: ใช้มอเตอร์ไซค์ & สถานะ “จบเคลม” และ ยังไม่หักค่าบริการ | อัตราค่าบริการ{' '}
            {FEE_PER_CASE} บาทต่อเคส
          </Text>
        </section>
      </Spin>
    </main>
  );
}
