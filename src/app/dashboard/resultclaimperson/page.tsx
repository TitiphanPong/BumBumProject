'use client';

import {
  Card,
  DatePicker,
  Select,
  message,
  Table,
  Typography,
  Grid,
  Statistic,
  Spin,
  Modal,
} from 'antd';
import { motion } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';
import type { ColumnsType } from 'antd/es/table';
import dayjs, { Dayjs } from 'dayjs';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import { Tag } from 'antd';
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
};

// ---------- Utils ----------
const normalize = (x?: string | null) => (x ?? '').toString().trim();

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
function getCustomerName(item: any): string {
  for (const k of CUSTOMER_KEYS) {
    const v = normalize(item?.[k]);
    if (v) return v;
  }
  return normalize(item?.customer?.name) || normalize(item?.customerInfo?.name) || '';
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
function getClaimerName(item: any): string {
  for (const k of CLAIMER_KEYS) {
    const v = normalize(item?.[k]);
    if (v) return v;
  }
  return (
    normalize(item?.claimer?.name) ||
    normalize(item?.assignee?.name) ||
    normalize(item?.handler?.name) ||
    ''
  );
}

function getProvince(item: any) {
  return item?.ProvinceName || item?.provinceName || item?.['สาขา'] || 'อื่นๆ';
}

function pickVehicle(it: ClaimItem) {
  return normalize(it.vehicleClaim) || normalize(it.vehicle) || normalize(it.vehicleType);
}
function isMotorcycle(v?: string) {
  const s = normalize(v);
  return /มอ|มอเตอร์|motor/i.test(s);
}
function getServiceFeeFlag(item: any) {
  return item?.serviceFeeStatus ?? item?.serviceChargeStatus ?? item?.['สถานะค่าบริการ'] ?? null;
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

function getFinishDate(it: any): string {
  const c =
    it.claimCompletedDate ||
    it.completedDate ||
    it.closeClaimDate ||
    it.finishDate ||
    it.claimEndDate ||
    it.receiverClaimDate ||
    it.claimDate;
  return c ? dayjs(c).format('DD/MM/YYYY') : '-';
}

// ---------- Component ----------
export default function DashboardPage() {
  const screens = useBreakpoint();
  const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null] | null>(null);
  const [selectedProvince, setSelectedProvince] = useState<string>('ทั้งหมด');

  const [provinceOptions, setProvinceOptions] = useState<string[]>(['ทั้งหมด']);
  const [loading, setLoading] = useState(false);
  const [raw, setRaw] = useState<ClaimItem[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPerson, setSelectedPerson] = useState<string | null>(null);

  const DATA_URL = '/api/get-claim';

  // fetch
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const res = await fetch(DATA_URL, { cache: 'no-store' });
        const data = await res.json();
        const rows: ClaimItem[] = Array.isArray(data?.data) ? data.data : data;
        setRaw(rows || []);
        const allProvinces = new Set<string>(['ทั้งหมด']);
        rows.forEach(it => allProvinces.add(getProvince(it)));
        setProvinceOptions(Array.from(allProvinces));
      } catch (err) {
        console.error(err);
        message.error('ดึงข้อมูลไม่สำเร็จ');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // filter by province & date
  const filteredForFilters = useMemo(() => {
    return raw.filter(item => {
      const isInProvince = selectedProvince === 'ทั้งหมด' || getProvince(item) === selectedProvince;
      if (!isInProvince) return false;

      if (!dateRange) return true;
      const rawDate = item.receiverClaimDate;
      if (!rawDate || !dateRange[0] || !dateRange[1]) return false;

      return (
        dayjs(rawDate).isSameOrAfter(dateRange[0], 'day') &&
        dayjs(rawDate).isSameOrBefore(dateRange[1], 'day')
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

  // เคสเข้าเกณฑ์คิดเงิน
  const eligible = useMemo(() => {
    return filteredForFilters.filter(isCountable);
  }, [filteredForFilters]);

  // แหล่งข้อมูลร่วม
  const shared = useMemo(
    () => ({
      allCases: filteredForFilters,
      eligibleCases: eligible,
    }),
    [filteredForFilters, eligible]
  );

  // Metrics กลาง (ใช้ทั้งการ์ด/สรุป/กราฟ)
  const metrics = useMemo(() => {
    const totalCasesAll = shared.allCases.length; // ทุกเคส
    const totalEligible = shared.eligibleCases.length; // เคสที่นับได้
    const totalAmount = totalEligible * FEE_PER_CASE; // เงินรวม
    const peopleEligible = new Set(
      shared.eligibleCases.map(it => getClaimerName(it) || '(ไม่ระบุผู้เคลม)')
    ).size;
    return { totalCasesAll, totalEligible, totalAmount, peopleEligible };
  }, [shared]);

  type PersonRow = { key: string; person: string; cases: number; amount: number };

  // อันนี้เป็นแบบเก่า (โชว์ทุกคน)
  //   const personRows: PersonRow[] = useMemo(() => {
  //     const list: PersonRow[] = [];
  //     for (const [person, itemsAll] of personToItemsAll.entries()) {
  //       const eligibleCount = itemsAll.filter(isCountable).length;
  //       list.push({
  //         key: person,
  //         person,
  //         cases: itemsAll.length,
  //         amount: eligibleCount * FEE_PER_CASE,
  //       });
  //     }
  //     list.sort((a, b) => b.cases - a.cases || a.person.localeCompare(b.person, 'th'));
  //     return list;
  //   }, [personToItemsAll]);

  //แบบใหม่ โชว์แค่เฉพาะคนคิดตัง
  const personRows: PersonRow[] = useMemo(() => {
    const m = new Map<string, ClaimItem[]>();
    // เก็บเฉพาะเคสที่คิดตัง
    for (const it of shared.eligibleCases) {
      const name = getClaimerName(it) || '(ไม่ระบุผู้เคลม)';
      if (!m.has(name)) m.set(name, []);
      m.get(name)!.push(it);
    }

    const list: PersonRow[] = [];
    for (const [person, eligibleItems] of m.entries()) {
      list.push({
        key: person,
        person,
        cases: eligibleItems.length, // จำนวนเคสที่คิดตัง
        amount: eligibleItems.length * FEE_PER_CASE,
      });
    }
    //   list.sort((a, b) => b.cases - a.cases || a.person.localeCompare(b.person, 'th'));
    return list;
  }, [shared.eligibleCases]);

  const sortedPersonRows = [...personRows].sort((a, b) => b.cases - a.cases);

  // table columns (summary)
  const columns: ColumnsType<PersonRow> = [
    {
      title: 'คนไปเคลม',
      dataIndex: 'person',
      key: 'person',
      ellipsis: true,
      //   sorter: (a, b) => a.person.localeCompare(b.person, 'th'),
      render: (text: string) => (
        <a
          onClick={() => {
            setSelectedPerson(text);
            setIsModalOpen(true);
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
      //   sorter: (a, b) => a.cases - b.cases,
      render: v => <Statistic value={v} />,
    },
    {
      title: 'จำนวนเงินที่ได้',
      dataIndex: 'amount',
      key: 'amount',
      align: 'center',
      width: 120,
      ellipsis: true,
      //   sorter: (a, b) => a.amount - b.amount,
      render: v => <Statistic value={v} />,
    },
  ];

  // modal columns (รายละเอียดเคสทั้งหมดของคนนั้น)
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

    // ✅ ใช้ Tag แบบเดียวกับ CLAIMcrud
    //   { title: 'สถานะการตรวจสอบ', dataIndex: 'inspectstatus', key: 'inspectstatus', width: 180,
    //     render: (v) => renderClaimTag(v) },

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
      <motion.header
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
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
      </motion.header>

      <Spin spinning={loading} delay={300}>
        {/* Cards */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
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
        </motion.section>

        {/* Modal */}
        <Modal
          title={selectedPerson ? `รายละเอียดเคสของ: ${selectedPerson}` : 'รายละเอียดเคส'}
          open={isModalOpen}
          onCancel={() => setIsModalOpen(false)}
          footer={null}
          width={screens.md ? 1000 : '95%'}
          destroyOnClose>
          <Table
            rowKey={r => r.id || r.claimNo || Math.random().toString(36)}
            columns={detailColumns}
            dataSource={selectedPerson ? personToItemsAll.get(selectedPerson) || [] : []}
            pagination={{ pageSize: screens.sm ? 10 : 6, showSizeChanger: false }}
            scroll={{ x: screens.md ? undefined : true }}
            size={screens.sm ? 'middle' : 'small'}
          />
        </Modal>

        {/* Summary table */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
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
        </motion.section>
      </Spin>
    </main>
  );
}
