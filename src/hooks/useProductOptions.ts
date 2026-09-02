'use client';

import { useEffect, useState } from 'react';
import { fetchProductNames } from '@/lib/product-list-client';

export function useProductOptions(): string[] {
  const [productOptions, setProductOptions] = useState<string[]>([]);

  useEffect(() => {
    const controller = new AbortController();

    fetchProductNames(controller.signal)
      .then(setProductOptions)
      .catch(error => {
        if (!controller.signal.aborted) console.error('โหลดรายการสินค้าไม่สำเร็จ:', error);
      });

    return () => controller.abort();
  }, []);

  return productOptions;
}
