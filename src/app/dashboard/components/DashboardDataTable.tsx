'use client';

import { ReloadOutlined } from '@ant-design/icons';
import { Button, Space, Spin, Table } from 'antd';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import type { SheetRow } from '@/lib/sheet-types';

type DashboardDataTableProps = {
  title: string;
  columns: ColumnsType<SheetRow>;
  data: SheetRow[];
  onRefresh?: () => void;
  loading?: boolean;
  pagination?: TablePaginationConfig;
  defaultPageSize?: number;
};

export function createRowActionColumn(
  title: string,
  buttonLabel: string,
  onEdit: (record: SheetRow) => void
): ColumnsType<SheetRow>[number] {
  return {
    title,
    key: 'actions',
    render: (_: unknown, record: SheetRow) => (
      <Space>
        <Button icon="✏️" onClick={() => onEdit(record)}>
          {buttonLabel}
        </Button>
      </Space>
    ),
  };
}

export default function DashboardDataTable({
  title,
  columns,
  data,
  onRefresh,
  loading,
  pagination,
  defaultPageSize = 8,
}: DashboardDataTableProps) {
  return (
    <div style={{ marginBottom: 48 }}>
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
          <Spin tip="กำลังโหลดข้อมูล..." />
        </div>
      ) : (
        <Table<SheetRow>
          title={() => (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span>{title}</span>
              <Button
                type="primary"
                icon={<ReloadOutlined />}
                onClick={onRefresh}
                loading={loading}
                className="refresh-button">
                <span className="refresh-text">รีเฟรชข้อมูล</span>
              </Button>
            </div>
          )}
          columns={columns}
          dataSource={data}
          rowKey="id"
          pagination={pagination ?? { pageSize: defaultPageSize }}
          scroll={{ x: 'max-content' }}
        />
      )}
    </div>
  );
}
