'use client';

import { Button, Card, DatePicker, Select, message } from 'antd';
import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import dayjs, { Dayjs } from 'dayjs';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import { Spin } from 'antd';

dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);

const { RangePicker } = DatePicker;
const { Option } = Select;



export default function DashboardPage() {
  const [chartType, setChartType] = useState<'bar' | 'line'>('bar');
  const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null] | null>(null);
  const [selectedProvince, setSelectedProvince] = useState<string>('ทั้งหมด');
  const [stats, setStats] = useState({ total: 0, completed: 0, pending: 0, inspection: 0 });
  const [chartData, setChartData] = useState<any[]>([]);
  const [provinceOptions, setProvinceOptions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const calculateStats = (data: any[]) => {
  let total = 0, completed = 0, pending = 0, inspection = 0;

  data.forEach((item: any) => {
      
    total++;
    if (item.status === 'จบเคลม') completed++;
    else if (item.status === 'รอเคลม') pending++;

    if (item.inspectstatus === 'รอตรวจสอบ') inspection++;
  });

  return { total, completed, pending, inspection };
};

  

const fetchClaims = async () => {
  try {
    setLoading(true);
    const res = await fetch('/api/get-claim', { cache: 'no-store' });
    const data = await res.json();

    // ✅ กรองตามจังหวัดและช่วงวันก่อน
    const filteredForStats = data.filter((item: any) => {
    const province = item.ProvinceName || 'อื่นๆ';
    const dateToCheck = item.receiverClaimDate;

    const isInProvince = selectedProvince === 'ทั้งหมด' || province === selectedProvince;
    const isInRange = !dateRange || (
      dateToCheck &&
      dateRange[0] &&
      dateRange[1] &&
      dayjs(dateToCheck).isSameOrAfter(dateRange[0], 'day') &&
      dayjs(dateToCheck).isSameOrBefore(dateRange[1], 'day')
    );

    return isInProvince && isInRange;
  });

    // ✅ นำมาใช้คำนวณสถิติ
    const statsResult = calculateStats(filteredForStats);
    setStats(statsResult);

    // 📊 ส่วนของกราฟเหมือนเดิม
    const filteredForChart = data.filter((item: any) => !!item.receiverClaimDate);
    const dateMap: Record<string, Record<string, number>> = {};
    const allProvinces = new Set<string>();

    filteredForChart.forEach((item: any) => {
      const rawDate = item.receiverClaimDate;
      if (!rawDate) return;

      const date = dayjs(rawDate).format('YYYY-MM-DD');
      const province = item.ProvinceName || 'อื่นๆ';
      allProvinces.add(province);

      const isInProvince = selectedProvince === 'ทั้งหมด' || province === selectedProvince;
      const isInRange = !dateRange || (
        dateRange[0] &&
        dateRange[1] &&
        dayjs(rawDate).isSameOrAfter(dateRange[0]) &&
        dayjs(rawDate).isSameOrBefore(dateRange[1])
      );

      if (!isInProvince || !isInRange) return;

      if (!dateMap[date]) dateMap[date] = {};
      if (!dateMap[date][province]) dateMap[date][province] = 0;
      dateMap[date][province]++;
    });

    const resultChart = Object.entries(dateMap)
      .sort(([a], [b]) => dayjs(a).diff(dayjs(b)))
      .map(([date, provinceMap]) => ({ date, ...provinceMap }));

    setChartData(resultChart);
    setProvinceOptions(['ทั้งหมด', ...Array.from(allProvinces)]);
  } catch (err) {
    message.error('ดึงข้อมูลไม่สำเร็จ');
    console.error(err);
  } finally {
    setLoading(false);
  }
};

  useEffect(() => {
    fetchClaims();
  }, [selectedProvince, dateRange]);

  const allProvincesFromChartData = Array.from(
    new Set(
      chartData.flatMap(item =>
        Object.keys(item).filter(k => k !== 'date')
      )
    )
  );

  return (
    <main className="bg-gradient-to-br from-gray-50 to-white px-5 py-8 md:px-6 lg:px-10 lg:py-10 rounded-xl pb-8 mb-0">
    {/* <main className="bg-gradient-to-br from-gray-50 to-white px-4 py-8 md:px-6 lg:px-10 lg:py-10 rounded-xl max-w-5xl mx-auto"> */}
      <motion.header
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-8 mt-4"
      >
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 text-center md:text-left mb-2">
          📊 แดชบอร์ดสรุปผลการเคลม ({selectedProvince})
        </h1>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <Select value={selectedProvince} onChange={setSelectedProvince} style={{ width: 200 }}>
            {provinceOptions.map((prov) => (
              <Option key={prov} value={prov}>{prov}</Option>
            ))}
          </Select>
          <RangePicker
            onChange={(val) => setDateRange(val)}
            allowClear
            className="w-full sm:w-auto"
            disabledDate={(currentDate) => {
              if (!dateRange || !dateRange[0]) return false; // ยังไม่ได้เลือก start date

              const selectedMonth = dateRange[0].month();
              return currentDate.month() !== selectedMonth;
            }}
          />
        </div>
      </motion.header>

      <Spin spinning={loading} delay={300}>
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-10"
        >
          {[{
            title: 'จำนวนเคลมทั้งหมด',
            value: stats.total,
            color: 'text-blue-500',
          }, {
            title: 'เคลมที่จบแล้ว',
            value: stats.completed,
            color: 'text-green-500',
          }, {
            title: 'รอเคลม',
            value: stats.pending,
            color: 'text-yellow-500',
          }, {
            title: 'รอตรวจสอบ',
            value: stats.inspection,
            color: 'text-yellow-500',
          }].map((item, i) => (
            <Card
              key={i}
              className="rounded-2xl shadow-sm hover:shadow-md transition duration-300 text-center bg-white"
            >
              <p className="text-sm text-gray-500 mb-1">{item.title}</p>
              <p className={`text-3xl font-bold ${item.color}`}>{item.value}</p>
            </Card>
          ))}
        </motion.section>

      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6"
      >
        <div className="space-x-2">
          <span className="text-gray-600 font-medium">ประเภทแผนภูมิ:</span>
          <Select value={chartType} onChange={(v) => setChartType(v)} style={{ width: 120 }}>
            <Option value="bar">Bar</Option>
            <Option value="line">Line</Option>
          </Select>
        </div>
      </motion.section>

      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.3 }}
        className="bg-white p-6 rounded-3xl shadow-md"
      >
        <h2 className="text-lg font-semibold text-gray-800 mb-4">
          🏙️ แนวโน้มการเคลมแยกตามจังหวัด
        </h2>
        <div className="w-full overflow-x-auto">
          <div style={{ minWidth: `${chartData.length * 50}px` }}>
            <ResponsiveContainer width="100%" height={300}>
              {chartType === 'bar' ? (
                <BarChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }} barCategoryGap="25%">
                  <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                  <XAxis dataKey="date" tickFormatter={(v) => v.slice(5)} tick={{ fontSize: 10, fill: '#888' }} interval={0} />
                  <YAxis tick={{ fontSize: 11, fill: '#888' }} />
                  <Tooltip />
                  <Legend />
                  {(selectedProvince === 'ทั้งหมด' ? allProvincesFromChartData : [selectedProvince])
                    .map((province, idx) => (
                      <Bar
                        key={province}
                        dataKey={province}
                        fill={["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6"][idx % 5]}
                        name={province}
                      />
                  ))}
                </BarChart>
              ) : (
                <LineChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                  <XAxis dataKey="date" tickFormatter={(v) => v.slice(5)} tick={{ fontSize: 10, fill: '#888' }} interval={0} />
                  <YAxis tick={{ fontSize: 11, fill: '#888' }} />
                  <Tooltip />
                  <Legend />
                  {(selectedProvince === 'ทั้งหมด' ? allProvincesFromChartData : [selectedProvince])
                    .map((province, idx) => (
                      <Line
                        key={province}
                        type="monotone"
                        dataKey={province}
                        stroke={["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6"][idx % 5]}
                        strokeWidth={3}
                        dot={{ r: 4 }}
                        activeDot={{ r: 7 }}
                        name={province}
                      />
                  ))}
                </LineChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>
      </motion.section>
      </Spin>
    </main>
  );
}