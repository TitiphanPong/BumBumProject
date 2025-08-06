'use client';

import { Button, Card, DatePicker, Select } from 'antd';
import { motion } from 'framer-motion';
import { useState } from 'react';
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
import { Dayjs } from 'dayjs';

const { RangePicker } = DatePicker;
const { Option } = Select;

const mockStats = {
  totalClaims: 120,
  completed: 84,
  pending: 36,
  serviceFee: 3420,
};

const mockChartData = [
  { date: '2025-08-01', bangkok: 10, korat: 5, amnat: 3 },
  { date: '2025-08-02', bangkok: 12, korat: 7, amnat: 2 },
  { date: '2025-08-03', bangkok: 8, korat: 3, amnat: 1 },
  { date: '2025-08-04', bangkok: 11, korat: 4, amnat: 2 },
  { date: '2025-08-05', bangkok: 7, korat: 2, amnat: 1 },
  { date: '2025-08-06', bangkok: 9, korat: 5, amnat: 2 },
];

export default function DashboardPage() {
  const [chartType, setChartType] = useState<'bar' | 'line'>('bar');
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs] | null>(null);

  const handleDateChange = (
    dates: [Dayjs, Dayjs] | null,
    _dateStrings: [string, string]
  ) => {
    setDateRange(dates);
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-50 to-white px-4 py-8 md:px-6 lg:px-10 lg:py-10 rounded-xl">
      <motion.header
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-10"
      >
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 text-center md:text-left">
          📊 แดชบอร์ดสรุปผลการเคลม
        </h1>
      </motion.header>

      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-10"
      >
        {[{
          title: 'จำนวนเคลมทั้งหมด',
          value: mockStats.totalClaims,
          color: 'text-blue-500',
        }, {
          title: 'เคลมที่จบแล้ว',
          value: mockStats.completed,
          color: 'text-green-500',
        }, {
          title: 'รอตรวจสอบ',
          value: mockStats.pending,
          color: 'text-yellow-500',
        }, {
          title: 'ยอดค่าบริการรวม',
          value: `฿${mockStats.serviceFee}`,
          color: 'text-purple-500',
        }].map((item, i) => (
          <Card
            key={i}
            bordered={false}
            className="rounded-2xl shadow-md hover:shadow-lg transition duration-300 text-center bg-white"
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
        <div className="space-x-2">
          {/* <span className="text-gray-600 font-medium">ช่วงเวลา:</span> */}
          {/* <RangePicker onChange={handleDateChange} allowClear className="w-full sm:w-auto" /> */}
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
          <div style={{ minWidth: '800px' }}>
            <ResponsiveContainer width="100%" height={300}>
              {chartType === 'bar' ? (
                <BarChart data={mockChartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }} barCategoryGap="25%">
                  <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                  <XAxis dataKey="date" tickFormatter={(v) => v.slice(5)} tick={{ fontSize: 10, fill: '#888' }} interval={0} />
                  <YAxis tick={{ fontSize: 11, fill: '#888' }} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="bangkok" fill="#3B82F6" name="กรุงเทพฯ" />
                  <Bar dataKey="korat" fill="#10B981" name="โคราช" />
                  <Bar dataKey="amnat" fill="#F59E0B" name="อำนาจเจริญ" />
                </BarChart>
              ) : (
                <LineChart data={mockChartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                  <XAxis dataKey="date" tickFormatter={(v) => v.slice(5)} tick={{ fontSize: 10, fill: '#888' }} interval={0} />
                  <YAxis tick={{ fontSize: 11, fill: '#888' }} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="bangkok" stroke="#3B82F6" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 7 }} name="กรุงเทพฯ" />
                  <Line type="monotone" dataKey="korat" stroke="#10B981" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 7 }} name="โคราช" />
                  <Line type="monotone" dataKey="amnat" stroke="#F59E0B" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 7 }} name="อำนาจเจริญ" />
                </LineChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>
      </motion.section>
    </main>
  );
}
