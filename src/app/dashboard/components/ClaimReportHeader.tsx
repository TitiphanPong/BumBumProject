'use client';

import type { CSSProperties } from 'react';
import { Select } from 'antd';
import DatePicker from '@/components/ThaiDatePicker';
import type { ClaimDateRange } from '@/hooks/useClaimReportFilters';
import type { Dayjs } from 'dayjs';

const { RangePicker } = DatePicker;

type ClaimReportHeaderProps = {
  title: string;
  provinceOptions: string[];
  selectedProvince: string;
  onProvinceChange: (value: string) => void;
  dateRange: ClaimDateRange;
  onDateRangeChange: (value: ClaimDateRange) => void;
  isDateDisabled: (date: Dayjs) => boolean;
  selectClassName?: string;
  selectStyle?: CSSProperties;
  rangeClassName?: string;
};

export default function ClaimReportHeader({
  title,
  provinceOptions,
  selectedProvince,
  onProvinceChange,
  dateRange,
  onDateRangeChange,
  isDateDisabled,
  selectClassName,
  selectStyle,
  rangeClassName,
}: ClaimReportHeaderProps) {
  return (
    <header className="mb-8 mt-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <h1 className="mb-2 text-center text-2xl font-bold text-gray-800 sm:text-3xl md:text-left">
        {title} ({selectedProvince})
      </h1>
      <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
        <Select
          value={selectedProvince}
          onChange={onProvinceChange}
          options={provinceOptions.map(value => ({ label: value, value }))}
          className={selectClassName}
          style={selectStyle}
          size="middle"
        />
        <RangePicker
          format="DD/MM/BBBB"
          value={dateRange}
          onChange={value => onDateRangeChange(value)}
          allowClear
          className={rangeClassName}
          size="middle"
          disabledDate={isDateDisabled}
        />
      </div>
    </header>
  );
}
