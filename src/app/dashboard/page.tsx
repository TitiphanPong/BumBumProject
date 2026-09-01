'use client';

import DatePicker from '@/components/ThaiDatePicker';
import { fetchJsonArray, fetchJsonPage } from '@/lib/client-fetch';
import { formatClaimDateForDisplay } from '@/lib/claim-date';
import type { SheetRow } from '@/lib/sheet-types';
import { Card, Modal, Select, Spin, Table, message } from 'antd';
import dayjs, { Dayjs } from 'dayjs';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import dynamic from 'next/dynamic';
import { useEffect, useMemo, useRef, useState } from 'react';

const ClaimTrendChart = dynamic(() => import('./components/ClaimTrendChart'), {
  ssr: false,
  loading: () => (
    <div
      className="h-[300px] w-full animate-pulse rounded-2xl bg-slate-100"
      aria-label="กำลังโหลดแผนภูมิ"
    />
  ),
});

dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);

const { RangePicker } = DatePicker;
const { Option } = Select;
const DETAIL_PAGE_SIZE = 10;

type DashboardStats = {
  total: number;
  completed: number;
  pending: number;
  selfClaim: number;
};

type DashboardChartRow = { date: string } & Record<string, string | number>;

type DashboardAggregate = {
  aggregateApplied: 'dashboard';
  stats: DashboardStats;
  chartData: DashboardChartRow[];
  provinces: string[];
};

function isDashboardAggregate(value: unknown): value is DashboardAggregate {
  if (!value || typeof value !== 'object') return false;
  const aggregate = value as Partial<DashboardAggregate>;
  const stats = aggregate.stats as Partial<DashboardStats> | undefined;
  return (
    aggregate.aggregateApplied === 'dashboard' &&
    Boolean(stats) &&
    typeof stats?.total === 'number' &&
    typeof stats.completed === 'number' &&
    typeof stats.pending === 'number' &&
    typeof stats.selfClaim === 'number' &&
    Array.isArray(aggregate.chartData) &&
    Array.isArray(aggregate.provinces)
  );
}

export default function DashboardPage() {
  const [chartType, setChartType] = useState<'bar' | 'line'>('bar');
  const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null] | null>(null);
  const [selectedProvince, setSelectedProvince] = useState<string>('ทั้งหมด');
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [claimsRaw, setClaimsRaw] = useState<SheetRow[]>([]); // legacy fallback only
  const [dashboardAggregate, setDashboardAggregate] = useState<DashboardAggregate | null>(null);
  const [modalClaims, setModalClaims] = useState<SheetRow[]>([]);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalPage, setModalPage] = useState(1);
  const [modalTotal, setModalTotal] = useState(0);
  const aggregateSupportRef = useRef<boolean | null>(null);
  const legacyLoadedRef = useRef(false);

  const appendActiveFilters = (params: URLSearchParams) => {
    if (selectedProvince !== 'ทั้งหมด') params.set('provinceName', selectedProvince);
    if (dateRange?.[0] && dateRange[1]) {
      params.set('dateFrom', dateRange[0].format('YYYY-MM-DD'));
      params.set('dateTo', dateRange[1].format('YYYY-MM-DD'));
    }
  };

  const fetchDashboardData = async (signal?: AbortSignal) => {
    if (aggregateSupportRef.current === false && legacyLoadedRef.current) return;

    try {
      setLoading(true);

      if (aggregateSupportRef.current !== false) {
        const params = new URLSearchParams({ aggregate: 'dashboard', page: '1', limit: '1' });
        appendActiveFilters(params);
        const response = await fetch(`/api/get-claim?${params.toString()}`, {
          signal,
          cache: 'no-store',
        });
        if (!response.ok) throw new Error(`Dashboard aggregate failed: ${response.status}`);

        const payload: unknown = await response.json();
        if (isDashboardAggregate(payload)) {
          aggregateSupportRef.current = true;
          setDashboardAggregate(payload);
          setClaimsRaw([]);
          return;
        }

        aggregateSupportRef.current = false;
      }

      const data = await fetchJsonArray<SheetRow>('/api/get-claim', { signal });
      legacyLoadedRef.current = true;
      setDashboardAggregate(null);
      setClaimsRaw(data);
    } catch (err) {
      if (signal?.aborted) return;
      message.error('ดึงข้อมูลไม่สำเร็จ');
      console.error(err);
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    fetchDashboardData(controller.signal);
    return () => controller.abort();
  }, [selectedProvince, dateRange]);

  const provinceOptions = useMemo(() => {
    if (dashboardAggregate) return ['ทั้งหมด', ...dashboardAggregate.provinces];
    const allProvinces = new Set(claimsRaw.map(item => item.ProvinceName || 'อื่นๆ'));
    return ['ทั้งหมด', ...Array.from(allProvinces)];
  }, [claimsRaw, dashboardAggregate]);

  const localDashboard = useMemo(() => {
    const filteredForStats: SheetRow[] = [];
    const dateMap: Record<string, Record<string, number>> = {};
    const statsResult = { total: 0, completed: 0, pending: 0, selfClaim: 0 };
    const rangeStart = dateRange?.[0];
    const rangeEnd = dateRange?.[1];

    for (const item of claimsRaw) {
      const province = item.ProvinceName || 'อื่นๆ';
      const rawDate = item.receiverClaimDate;
      const parsedDate = rawDate ? dayjs(rawDate) : null;
      const isInProvince = selectedProvince === 'ทั้งหมด' || province === selectedProvince;
      const isInStatsRange =
        !dateRange ||
        Boolean(
          parsedDate &&
            rangeStart &&
            rangeEnd &&
            parsedDate.isSameOrAfter(rangeStart, 'day') &&
            parsedDate.isSameOrBefore(rangeEnd, 'day')
        );

      if (isInProvince && isInStatsRange) {
        filteredForStats.push(item);
        statsResult.total++;
        if (item.status === 'จบเคลม') statsResult.completed++;
        if (item.status === 'รอเคลม') statsResult.pending++;
        if (item.status === 'ไปเคลมเอง') statsResult.selfClaim++;
      }

      if (!parsedDate || !isInProvince) continue;

      const isInChartRange =
        !dateRange ||
        Boolean(
          rangeStart &&
            rangeEnd &&
            parsedDate.isSameOrAfter(rangeStart) &&
            parsedDate.isSameOrBefore(rangeEnd)
        );
      if (!isInChartRange) continue;

      const date = parsedDate.format('YYYY-MM-DD');
      const provinceMap = (dateMap[date] ??= {});
      provinceMap[province] = (provinceMap[province] ?? 0) + 1;
    }

    const resultChart = Object.entries(dateMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, provinceMap]) => ({
        date,
        ...provinceMap,
      }));

    return {
      stats: statsResult,
      chartData: resultChart,
      filteredClaimsForStatus: filteredForStats,
    };
  }, [claimsRaw, selectedProvince, dateRange]);

  const stats = dashboardAggregate?.stats ?? localDashboard.stats;
  const chartData = dashboardAggregate?.chartData ?? localDashboard.chartData;
  const filteredClaimsForStatus = localDashboard.filteredClaimsForStatus;
  const isAggregateMode = dashboardAggregate?.aggregateApplied === 'dashboard';

  const loadStatusDetails = async (status: string, page: number) => {
    if (!isAggregateMode) return;

    try {
      setModalLoading(true);
      const params = new URLSearchParams({
        page: String(page),
        limit: String(DETAIL_PAGE_SIZE),
        status,
      });
      appendActiveFilters(params);
      const response = await fetchJsonPage<SheetRow>(`/api/get-claim?${params.toString()}`);
      setModalClaims(response.items);
      setModalPage(response.page);
      setModalTotal(response.total);
    } catch (error) {
      console.error(error);
      message.error('โหลดรายละเอียดเคลมไม่สำเร็จ');
    } finally {
      setModalLoading(false);
    }
  };

  const filteredClaims = useMemo(() => {
    if (isAggregateMode) return modalClaims;
    if (!selectedStatus) return [];
    return filteredClaimsForStatus.filter(item => item.status === selectedStatus);
  }, [isAggregateMode, modalClaims, selectedStatus, filteredClaimsForStatus]);

  const allProvincesFromChartData = useMemo(
    () =>
      Array.from(
        new Set(chartData.flatMap(item => Object.keys(item).filter(key => key !== 'date')))
      ),
    [chartData]
  );

  const chartProvinces = useMemo(
    () => (selectedProvince === 'ทั้งหมด' ? allProvincesFromChartData : [selectedProvince]),
    [allProvincesFromChartData, selectedProvince]
  );

  return (
    <main className="bg-gradient-to-br from-gray-50 to-white px-5 py-8 md:px-6 lg:px-10 lg:py-10 rounded-xl pb-8 mb-0">
      <header
        className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-8 mt-4">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 text-center md:text-left mb-2">
          📊 แดชบอร์ดสรุปผลการเคลม ({selectedProvince})
        </h1>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <Select
            value={selectedProvince}
            onChange={setSelectedProvince}
            className="w-full sm:w-64"
            size="middle">
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
            className="w-full sm:w-64"
            size="middle"
            disabledDate={currentDate => {
              if (!dateRange || !dateRange[0]) return false;

              const selectedMonth = dateRange[0].month();
              return currentDate.month() !== selectedMonth;
            }}
          />
        </div>
      </header>

      <Spin spinning={loading} delay={300}>
        <section
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-10">
          {[
            {
              title: 'จำนวนเคลมทั้งหมด',
              value: stats.total,
              color: 'text-blue-500',
            },
            {
              title: 'เคลมที่จบแล้ว',
              value: stats.completed,
              color: 'text-green-500',
              key: 'จบเคลม',
            },
            {
              title: 'รอเคลม',
              value: stats.pending,
              color: 'text-yellow-500',
              key: 'รอเคลม',
            },
            {
              title: 'ไปเคลมเอง',
              value: stats.selfClaim,
              color: 'text-orange-500',
              key: 'ไปเคลมเอง',
            },
          ].map((item, i) => (
            <Card
              key={i}
              className="rounded-2xl shadow-sm hover:shadow-md transition duration-300 text-center bg-white"
              onClick={() => {
                if (item.key) {
                  setSelectedStatus(item.key);
                  setModalOpen(true);
                  setModalPage(1);
                  if (isAggregateMode) void loadStatusDetails(item.key, 1);
                }
              }}>
              <p className="text-sm text-gray-500 mb-1">{item.title}</p>
              <p className={`text-3xl font-bold ${item.color}`}>{item.value}</p>
            </Card>
          ))}
        </section>

        <section
          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div className="space-x-2">
            <span className="text-gray-600 font-medium">ประเภทแผนภูมิ:</span>
            <Select value={chartType} onChange={v => setChartType(v)} style={{ width: 120 }}>
              <Option value="bar">Bar</Option>
              <Option value="line">Line</Option>
            </Select>
          </div>
        </section>

        <section
          className="bg-white p-6 rounded-3xl shadow-md">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">
            🏙️ แนวโน้มการเคลมแยกตามจังหวัด
          </h2>
          <ClaimTrendChart chartType={chartType} data={chartData} provinces={chartProvinces} />
        </section>
      </Spin>

      <Modal
        open={modalOpen}
        title={`รายการสถานะ : ${selectedStatus ?? '-'}`}
        onCancel={() => setModalOpen(false)}
        footer={null}
        width={900}>
        <Table
          dataSource={filteredClaims}
          rowKey="id"
          columns={[
            { title: 'สาขา', dataIndex: 'ProvinceName', key: 'ProvinceName' },
            { title: 'ชื่อลูกค้า', dataIndex: 'CustomerName', key: 'CustomerName' },
            { title: 'เบอร์โทร', dataIndex: 'Phone', key: 'Phone' },
            { title: 'ที่อยู่', dataIndex: 'Address', key: 'Address' },
            { title: 'สินค้า', dataIndex: 'Product', key: 'Product' },
            {
              title: 'วันที่ซื้อ',
              dataIndex: 'buyProductDate',
              key: 'buyProductDate',
              render: formatClaimDateForDisplay,
            },
            { title: 'รายละเอียดปัญหา', dataIndex: 'Problem', key: 'Problem' },
            { title: 'สถานะประกัน', dataIndex: 'Warranty', key: 'Warranty' },
            {
              title: 'คนไปเคลม',
              dataIndex: 'claimSender',
              key: 'claimSender',
              render: (text: string) => text || '-',
            },
            {
              title: 'วันที่รับเคลม',
              dataIndex: 'receiverClaimDate',
              key: 'receiverClaimDate',
              render: (value: string) => formatClaimDateForDisplay(value),
            },
            {
              title: 'หมายเหตุ',
              dataIndex: 'note',
              key: 'note',
              render: (text: string) => text || '-',
            },
          ]}
          loading={isAggregateMode ? modalLoading : false}
          pagination={
            isAggregateMode
              ? {
                  current: modalPage,
                  pageSize: DETAIL_PAGE_SIZE,
                  total: modalTotal,
                  showSizeChanger: false,
                  onChange: page => {
                    if (selectedStatus) void loadStatusDetails(selectedStatus, page);
                  },
                }
              : { pageSize: DETAIL_PAGE_SIZE }
          }
          scroll={{ x: 'max-content' }}
        />
      </Modal>
    </main>
  );
}
