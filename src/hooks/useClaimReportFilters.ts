'use client';

import { useState } from 'react';
import type { Dayjs } from 'dayjs';

export type ClaimDateRange = [Dayjs | null, Dayjs | null] | null;

export function useClaimReportFilters() {
  const [dateRange, setDateRange] = useState<ClaimDateRange>(null);
  const [selectedProvince, setSelectedProvince] = useState('ทั้งหมด');

  const appendActiveFilters = (params: URLSearchParams) => {
    if (selectedProvince !== 'ทั้งหมด') params.set('provinceName', selectedProvince);
    if (dateRange?.[0] && dateRange[1]) {
      params.set('dateFrom', dateRange[0].format('YYYY-MM-DD'));
      params.set('dateTo', dateRange[1].format('YYYY-MM-DD'));
    }
  };

  const isDateDisabled = (currentDate: Dayjs) => {
    if (!dateRange?.[0]) return false;
    return currentDate.month() !== dateRange[0].month();
  };

  return {
    dateRange,
    setDateRange,
    selectedProvince,
    setSelectedProvince,
    appendActiveFilters,
    isDateDisabled,
  };
}
