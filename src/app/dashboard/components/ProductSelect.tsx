'use client';

import { Select, type SelectProps } from 'antd';

type ProductSelectProps = Omit<SelectProps, 'options'> & {
  products: string[];
  placeholder: string;
};

export default function ProductSelect({ products, style, ...selectProps }: ProductSelectProps) {
  return (
    <Select
      {...selectProps}
      style={{ width: '100%', ...style }}
      options={products.map(product => ({ label: product, value: product }))}
    />
  );
}
