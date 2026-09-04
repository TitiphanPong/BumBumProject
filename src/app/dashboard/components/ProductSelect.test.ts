import { describe, expect, it, vi } from 'vitest';
import ProductSelect from './ProductSelect';

describe('ProductSelect', () => {
  it('forwards controlled form value and onChange to the Ant Design Select', () => {
    const onChange = vi.fn();
    const element = ProductSelect({
      products: ['รุ่น A', 'รุ่น B'],
      placeholder: 'เลือกสินค้า',
      value: 'รุ่น B',
      onChange,
    });

    expect(element.props.value).toBe('รุ่น B');
    expect(element.props.onChange).toBe(onChange);
    expect(element.props.options).toEqual([
      { label: 'รุ่น A', value: 'รุ่น A' },
      { label: 'รุ่น B', value: 'รุ่น B' },
    ]);
  });
});
