'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Table, Card, Typography, Tag, Modal, List, Space, Button, Grid, message, Statistic } from 'antd';
import type { ColumnsType } from 'antd/es/table';

const { Title, Text } = Typography;
const { useBreakpoint } = Grid;

// === ค่าคงที่ตามเกณฑ์ ===
const FEE_PER_CASE = 30;

// === ประเภทรายการเคลม (ปรับชื่อ field ให้ตรงกับ Sheet/Backend ของคุณ) ===
type ClaimItem = {
  id: string;
  claimNo?: string;
  customerName?: string;   // ชื่อลูกค้า (ถ้ามี)
  branchName?: string;     // สาขา/จังหวัด/หน่วยงาน (ถ้ามี)
  product?: string;
  claimDate?: string;
  vehicleClaim?: string;   // ต้องเป็นมอไซค์
  status?: string;         // ต้องเป็น "จบตรวจสอบ" หรือ "จบเคลม"
  claimerName?: string;    // ผู้เคลม (ใช้สำหรับสรุปรายคน)
  serviceFeeStatus?: string | boolean | null; // ใช้เช็ค "ยังไม่หักค่าบริการ"
};

// === ประเภทแถวสรุปรายคน ===
type PersonSummaryRow = {
  key: string;
  person: string;
  cases: number;
  amount: number;
  items: ClaimItem[]; // รายการเคสของคนนี้ (ไว้เปิดใน Modal)
};

// ================== Utilities ==================
function normalize(text?: string | null) {
  return (text ?? '').toString().trim();
}

function isMotorcycle(vehicleClaim?: string) {
  const v = normalize(vehicleClaim);
  // รองรับคำเขียนหลายแบบ
  return /มอ|มอเตอร์|motor/i.test(v);
}

function isAllowedStatus(status?: string) {
  const s = normalize(status);
  return s === 'จบตรวจสอบ' || s === 'จบเคลม';
}

function isNotDeducted(serviceFeeStatus?: string | boolean | null) {
  // รองรับทั้ง boolean และ string
  if (typeof serviceFeeStatus === 'boolean') return serviceFeeStatus === false;
  const s = normalize(serviceFeeStatus);
  // ปรับ “ยังไม่หัก”, “ยังไม่ตัด”, "", null → ถือว่า "ยังไม่หัก"
  if (s === '' || s === 'ยังไม่หัก' || s === 'ยังไม่ตัด' || s === 'ยังไม่ได้หัก') return true;
  // คำว่า "หักแล้ว", "ตัดแล้ว" → ถือว่าไม่ผ่าน
  if (s === 'หักแล้ว' || s === 'ตัดแล้ว') return false;
  // ถ้าไม่รู้จักค่า ให้ conservative: ไม่ผ่าน (กันนับเกิน)
  return false;
}

// ================== คอมโพเนนท์หลัก ==================
export default function ServiceFeeSummary() {
  const screens = useBreakpoint();
  const [loading, setLoading] = useState(false);
  const [rawClaims, setRawClaims] = useState<ClaimItem[]>([]);
  const [selectedPerson, setSelectedPerson] = useState<PersonSummaryRow | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // TODO: แก้ URL ให้ตรงกับของคุณ
  const DATA_URL = '/api/get-claim';

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const res = await fetch(DATA_URL, { cache: 'no-store' });
        if (!res.ok) throw new Error(`โหลดข้อมูลไม่สำเร็จ: ${res.status}`);
        const json = await res.json();

        // คาดหวังว่า json.data เป็นรายการเคลม (array)
        const rows: ClaimItem[] = Array.isArray(json?.data) ? json.data : json;

        if (mounted) setRawClaims(rows || []);
      } catch (err: any) {
        console.error(err);
        message.error(err?.message || 'เกิดข้อผิดพลาดในการโหลดข้อมูล');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [DATA_URL]);

  // คัดกรองตามกติกา + รวมกลุ่มรายคน
  const summaryData: PersonSummaryRow[] = useMemo(() => {
    // 1) กรองให้เหลือเฉพาะเคสที่คิดค่าบริการ
    const filtered = rawClaims.filter((it) =>
      isMotorcycle(it.vehicleClaim) &&
      isAllowedStatus(it.status) &&
      isNotDeducted(it.serviceFeeStatus)
    );

    // 2) group by ผู้เคลม
    const map = new Map<string, ClaimItem[]>();
    for (const item of filtered) {
      const person = normalize(item.claimerName) || '(ไม่ระบุผู้เคลม)';
      if (!map.has(person)) map.set(person, []);
      map.get(person)!.push(item);
    }

    // 3) สร้างแถวสรุป
    const rows: PersonSummaryRow[] = [];
    for (const [person, items] of map.entries()) {
      const cases = items.length;
      rows.push({
        key: person,
        person,
        cases,
        amount: cases * FEE_PER_CASE,
        items,
      });
    }

    // เรียงจากมากไปน้อย
    rows.sort((a, b) => b.cases - a.cases || a.person.localeCompare(b.person, 'th'));
    return rows;
  }, [rawClaims]);

  const totalPeople = summaryData.length;
  const totalCases = summaryData.reduce((acc, r) => acc + r.cases, 0);
  const totalAmount = summaryData.reduce((acc, r) => acc + r.amount, 0);

  const columns: ColumnsType<PersonSummaryRow> = [
    {
      title: 'ผู้เคลม',
      dataIndex: 'person',
      key: 'person',
      render: (text, record) => (
        <Button
          type="link"
          onClick={() => {
            setSelectedPerson(record);
            setIsModalOpen(true);
          }}
        >
          {text}
        </Button>
      ),
    },
    {
      title: 'จำนวนเคสที่คิดค่าบริการ',
      dataIndex: 'cases',
      key: 'cases',
      align: 'right',
      width: 180,
      render: (val) => <Statistic value={val} />,
    },
    {
      title: `ยอดเงิน (บาท)`,
      dataIndex: 'amount',
      key: 'amount',
      align: 'right',
      width: 180,
      render: (val) => <Statistic value={val} />,
    },
  ];

  return (
    <Space direction="vertical" size="large" style={{ display: 'block' }}>
      <Title level={3} style={{ marginBottom: 0 }}>ตารางสรุปการเคลมรายคน (ทำเงินเดือน)</Title>
      <Text type="secondary">
        เกณฑ์: ใช้มอไซค์ + สถานะ “จบตรวจสอบ/จบเคลม” + ยังไม่หักค่าบริการ | อัตรา {FEE_PER_CASE.toLocaleString()} บาท/เคส
      </Text>

      <Card>
        <Space size={screens.xs ? 16 : 32} wrap>
          <Statistic title="จำนวนคนที่มีสิทธิ์" value={totalPeople} />
          <Statistic title="จำนวนเคสที่คิดค่าบริการ" value={totalCases} />
          <Statistic title="ยอดรวม (บาท)" value={totalAmount} />
        </Space>
      </Card>

      <Card>
        <Table<PersonSummaryRow>
          rowKey="key"
          loading={loading}
          columns={columns}
          dataSource={summaryData}
          pagination={{ pageSize: 20, showSizeChanger: true }}
        />
      </Card>

      <Modal
        title={
          <Space>
            <Text strong>รายละเอียดเคส</Text>
            {selectedPerson && <Tag color="blue">{selectedPerson.person}</Tag>}
          </Space>
        }
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        footer={null}
        width={screens.md ? 800 : '90%'}
        destroyOnClose
      >
        <List
          dataSource={selectedPerson?.items || []}
          locale={{ emptyText: 'ไม่มีรายการ' }}
          renderItem={(item, idx) => (
            <List.Item key={item.id || `${idx}`}>
              <List.Item.Meta
                title={
                  <Space split={<Text type="secondary">|</Text>} wrap>
                    <Text strong>#{item.claimNo || '-'}</Text>
                    <Text>{item.customerName || '-'}</Text>
                    <Text>{item.branchName || '-'}</Text>
                  </Space>
                }
                description={
                  <Space direction="vertical" size={0}>
                    <Text>สถานะ: <Tag color="green">{normalize(item.status) || '-'}</Tag></Text>
                    <Text>พาหนะ: {normalize(item.vehicleClaim) || '-'}</Text>
                    <Text>วันที่เคลม: {item.claimDate || '-'}</Text>
                    <Text>สินค้า: {item.product || '-'}</Text>
                  </Space>
                }
              />
            </List.Item>
          )}
        />
      </Modal>
    </Space>
  );
}
