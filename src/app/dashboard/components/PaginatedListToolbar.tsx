'use client';

import type { ReactNode } from 'react';
import { Input, Select, Typography } from 'antd';

type PaginatedListToolbarProps = {
  title: ReactNode;
  provinceOptions: string[];
  selectedProvince?: string;
  onProvinceChange: (value?: string) => void;
  searchValue: string;
  onSearchValueChange: (value: string) => void;
  onSearch: (value: string) => void;
  children?: ReactNode;
};

export default function PaginatedListToolbar({
  title,
  provinceOptions,
  selectedProvince,
  onProvinceChange,
  searchValue,
  onSearchValueChange,
  onSearch,
  children,
}: PaginatedListToolbarProps) {
  return (
    <>
      <div className="mb-4 flex w-full justify-stretch sm:justify-end">
        <Select
          allowClear
          placeholder="เลือกจังหวัด"
          value={selectedProvince}
          onChange={onProvinceChange}
          options={[
            { label: 'ทั้งหมด', value: 'ทั้งหมด' },
            ...provinceOptions.map(value => ({ label: value, value })),
          ]}
          className="w-full sm:w-[200px]"
        />
      </div>

      <Typography.Title level={3}>{title}</Typography.Title>
      {children}

      <Input.Search
        placeholder="ค้นหา..."
        enterButton
        value={searchValue}
        onChange={event => onSearchValueChange(event.target.value)}
        onSearch={onSearch}
        className="mb-6"
        allowClear
      />
    </>
  );
}
