'use client'

import React, { useEffect, useState } from 'react';
import { Table, Typography, DatePicker, Button } from 'antd';
import dayjs from 'dayjs';
import type { ColumnsType } from 'antd/es/table';

const { Title } = Typography;
const { RangePicker } = DatePicker;

interface ClaimRow {
  key: string;
  date: string;
  [employee: string]: any; // dynamic column keys for employee names
}

export default function ClaimSummaryPage() {
  const [dataSource, setDataSource] = useState<ClaimRow[]>([]);
  const [columns, setColumns] = useState<ColumnsType<ClaimRow>>([]);
  const [dateRange, setDateRange] = useState<[any, any] | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const res = await fetch('/api/get-claim');
    const rawData = await res.json();

    // filter valid claims
    const validClaims = rawData.filter((item: any) => {
      const isBike =
        item.vehicleClaim?.includes('รถมอเตอร์ไซค์') ||
        item.vehicleInspector?.includes('รถมอเตอร์ไซค์');
      const isFinished =
        item.status === 'จบเคลม' || item.inspectstatus === 'จบการตรวจสอบ';
      const notCharged = !item.serviceChargeStatus?.includes('หักค่าบริการแล้ว');
      return isBike && isFinished && notCharged;
    });

    const grouped: Record<string, Record<string, number>> = {};
    const employeeSet = new Set<string>();

    validClaims.forEach((item: any) => {
      const date = dayjs(item.claimDate || item.inspectionDate).format('D');
      const name = item.claimSender || item.inspector || 'ไม่ทราบชื่อ';

      if (!grouped[date]) grouped[date] = {};
      if (!grouped[date][name]) grouped[date][name] = 0;

      grouped[date][name] += 1;
      employeeSet.add(name);
    });

    const employees = Array.from(employeeSet);
    const tableData: ClaimRow[] = Object.entries(grouped).map(([date, empMap], idx) => {
      const row: ClaimRow = {
        key: String(idx),
        date,
      };
      employees.forEach((name) => {
        row[name] = empMap[name] || '';
      });
      row['total'] = Object.values(empMap).reduce((sum, n) => sum + n, 0);
      return row;
    });

    const dynamicCols: ColumnsType<ClaimRow> = [
      {
        title: 'วันที่',
        dataIndex: 'date',
        fixed: 'left',
      },
      {
        title: 'รวม',
        dataIndex: 'total',
        align: 'center',
        fixed: 'right',
      },
    ];

    setColumns(dynamicCols);
    setDataSource(tableData);
  };

  return (
    <div style={{ padding: 24 }}>
      <Title level={3}>📊 สรุปจำนวนเคลมรายคน รายวัน</Title>
      <p>ข้อมูลนี้ใช้ประกอบการคำนวณค่าบริการ เช่น ตรวจสอบ/เคลม ด้วยรถมอเตอร์ไซค์ และยังไม่หักค่าบริการ</p>

      <div style={{ marginBottom: 16 }}>
        <Button type="primary" onClick={fetchData}>รีเฟรชข้อมูล</Button>
      </div>

      <Table
        dataSource={dataSource}
        columns={columns}
        bordered
        pagination={false}
        scroll={{ x: 'max-content' }}
      />
    </div>
  );
}