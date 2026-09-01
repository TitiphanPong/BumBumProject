'use client';

import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { Table, Typography, Card, Grid, Input, Spin, Select } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { fetchJsonArray } from '@/lib/client-fetch';

const { Title, Text } = Typography;
const { useBreakpoint } = Grid;
const { Option } = Select;

type PartsRow = {
  key?: string;
  id: string;
  ประเภทสินค้า: string;
  ลำดับ: string;
  รายการ: string;
  ราคา: string;
  หน่วย: string;
  ราคาประกัน: string;
  ค่าแรงเครดิต: string;
  หมายเหตุ: string;
  isGroupHeader?: boolean;
};

type PartsApiRow = Omit<PartsRow, 'key'> & { key?: string };

const getCategoryColor = (category: string): string => {
  const map: Record<string, string> = {
    'ลำโพง HM': '#fdecea',
    'ลำโพง Coco (ใหญ่)': '#e6f7ff',
    'ลำโพง Coco (เล็ก)': '#fff7e6',
    'ลำโพง ME': '#fff0f6',
    'พัดลม SN สีฟ้า': '#e6f4ff',
    'พัดลม Perfect': '#f6ffed',
    สมาร์ททีวี: '#f9f0ff',
  };
  return map[category] || '#f5f5f5';
};

const PARTS_COLUMNS: ColumnsType<PartsRow> = [
  {
    title: 'ลำดับ',
    dataIndex: 'ลำดับ',
    key: 'ลำดับ',
    responsive: ['sm'],
    width: 70,
  },
  {
    title: 'รายการ',
    dataIndex: 'รายการ',
    key: 'รายการ',
  },
  {
    title: 'ราคา',
    dataIndex: 'ราคา',
    key: 'ราคา',
    render: (value: string, row: PartsRow) =>
      value ? `${value} ${row.หน่วย?.trim() || 'บาท'}` : '',
  },
  {
    title: 'ราคาประกัน',
    dataIndex: 'ราคาประกัน',
    key: 'ราคาประกัน',
    render: (value: string, row: PartsRow) =>
      value ? `${value} ${row.หน่วย?.trim() || 'บาท'}` : '',
  },
  {
    title: 'ค่าแรงเครดิต',
    dataIndex: 'ค่าแรงเครดิต',
    key: 'ค่าแรงเครดิต',
    render: (value: string) => (value ? `${value} บาท` : ''),
    responsive: ['sm'],
  },
  {
    title: 'หมายเหตุ',
    dataIndex: 'หมายเหตุ',
    key: 'หมายเหตุ',
    responsive: ['md'],
  },
];

export default function PartsPricePage() {
  const [data, setData] = useState<PartsRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const screens = useBreakpoint();
  const isMobile = !screens.md;

  useEffect(() => {
    const controller = new AbortController();
    const fetchData = async () => {
      try {
        const json = await fetchJsonArray<PartsApiRow>('/api/get-parts-price', {
          signal: controller.signal,
        });

        let lastCategory = '';
        const filled = json.map((item, index) => {
          const trimmed = item.ประเภทสินค้า?.trim();
          if (trimmed) lastCategory = trimmed;

          return {
            ...item,
            ประเภทสินค้า: trimmed || lastCategory,
            key: item.key || item.id || `${index + 1}`,
          };
        });

        setData(filled);
      } catch (err) {
        if (controller.signal.aborted) return;
        console.error('Failed to fetch:', err);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };

    fetchData();
    return () => controller.abort();
  }, []);

  const filteredData = useMemo(() => {
    const lower = deferredSearch.toLowerCase();
    return data.filter(
      item =>
        (!selectedCategory || item.ประเภทสินค้า === selectedCategory) &&
        (item.รายการ?.toLowerCase().includes(lower) ||
          item.ประเภทสินค้า?.toLowerCase().includes(lower) ||
          item.หมายเหตุ?.toLowerCase().includes(lower))
    );
  }, [deferredSearch, selectedCategory, data]);

  const groupedData = useMemo(() => {
    const grouped: PartsRow[] = [];
    let lastCategory = '';
    filteredData.forEach((item, i) => {
      if (item.ประเภทสินค้า !== lastCategory) {
        grouped.push({ ...item, key: `group-${i}`, isGroupHeader: true });
        lastCategory = item.ประเภทสินค้า;
      }
      grouped.push({ ...item, isGroupHeader: false });
    });
    return grouped;
  }, [filteredData]);

  const groupedDataByKey = useMemo(
    () => new Map(groupedData.map(row => [row.key, row])),
    [groupedData]
  );

  const mobileGroupedData = useMemo(() => {
    const grouped = new Map<string, PartsRow[]>();
    for (const item of filteredData) {
      const items = grouped.get(item.ประเภทสินค้า);
      if (items) items.push(item);
      else grouped.set(item.ประเภทสินค้า, [item]);
    }
    return Array.from(grouped.entries());
  }, [filteredData]);

  const categoryOptions = useMemo(
    () =>
      Array.from(new Set(data.map(d => d.ประเภทสินค้า))).map(cat => ({
        label: cat,
        value: cat,
      })),
    [data]
  );

  return (
    <div className="p-4">
      <Card>
        <Title level={3}>🧾 ราคาอะไหล่และมอเตอร์</Title>
        <Text type="secondary">
          * <span style={{ color: 'red' }}>รับประกัน 1 ปี แผงและมอเตอร์ เท่านั้น</span> *
        </Text>

        <div className="flex flex-col sm:flex-row gap-2 mt-4">
          <Input.Search
            placeholder="ค้นหารายการ..."
            allowClear
            onChange={e => setSearch(e.target.value)}
            style={{ maxWidth: 300 }}
          />

          <Select
            allowClear
            placeholder="เลือกประเภทสินค้า"
            style={{ minWidth: 200 }}
            onChange={value => setSelectedCategory(value || '')}>
            {categoryOptions.map(opt => (
              <Option key={opt.value} value={opt.value}>
                {opt.label}
              </Option>
            ))}
          </Select>
        </div>

        {loading ? (
          <div className="text-center p-10">
            <Spin />
          </div>
        ) : !isMobile ? (
          <Table
            className="mt-4"
            columns={PARTS_COLUMNS}
            dataSource={groupedData}
            bordered
            pagination={{ pageSize: 50 }}
            scroll={{ x: 'max-content' }}
            rowKey="key"
            components={{
              body: {
                row: ({ children, ...props }) => {
                  const record = groupedDataByKey.get(props['data-row-key']);
                  if (record?.isGroupHeader) {
                    return (
                      <tr {...props}>
                        <td
                          colSpan={PARTS_COLUMNS.length}
                          className="font-semibold text-md px-4 py-2"
                          style={{
                            backgroundColor: getCategoryColor(record.ประเภทสินค้า),
                            textAlign: 'center',
                          }}>
                          {record.ประเภทสินค้า}
                        </td>
                      </tr>
                    );
                  }
                  return <tr {...props}>{children}</tr>;
                },
              },
            }}
          />
        ) : (
          <div className="flex flex-col gap-5 mt-4">
            {mobileGroupedData.map(([category, items]) => (
              <div key={category} className="flex flex-col gap-2">
                <div
                  className="px-3 py-1 font-semibold rounded text-center"
                  style={{
                    backgroundColor: getCategoryColor(category),
                  }}>
                  {category}
                </div>
                {items.map(item => (
                  <Card size="small" key={item.key}>
                    <p>
                      <strong>ลำดับ:</strong> {item.ลำดับ}
                    </p>
                    <p>
                      <strong>รายการ:</strong> {item.รายการ}
                    </p>
                    <p>
                      <strong>ราคา:</strong>{' '}
                      {item.ราคา ? `${item.ราคา} ${item.หน่วย?.trim() || 'บาท'}` : ''}
                    </p>

                    {item.ราคาประกัน && (
                      <p>
                        <strong>ราคา(ประกัน):</strong>{' '}
                        {`${item.ราคาประกัน} ${item.หน่วย?.trim() || 'บาท'}`}
                      </p>
                    )}

                    {item.ค่าแรงเครดิต && (
                      <p>
                        <strong>ค่าแรงเครดิต:</strong> {item.ค่าแรงเครดิต} บาท
                      </p>
                    )}
                    {item.หมายเหตุ && (
                      <p>
                        <strong>หมายเหตุ:</strong> {item.หมายเหตุ}
                      </p>
                    )}
                  </Card>
                ))}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
