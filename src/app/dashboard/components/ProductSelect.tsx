'use client';

import { Select } from 'antd';

type ProductSelectProps = {
  products: string[];
  placeholder: string;
  tokenSeparators?: string[];
};

export default function ProductSelect({ products, placeholder, tokenSeparators }: ProductSelectProps) {
  return (
    <Select
      placeholder={placeholder}
      style={{ width: '100%' }}
      tokenSeparators={tokenSeparators}
      options={products.map(product => ({ label: product, value: product }))}
    />
  );
}
