'use client';

import { Form } from 'antd';
import DatePicker from '@/components/ThaiDatePicker';
import { isSupportedGregorianDate } from '@/lib/claim-date';

export default function ClaimBuyProductDateField() {
  return (
    <Form.Item
      name="buyProductDate"
      label="วันที่ซื้อ"
      rules={[
        {
          validator: (_, value) =>
            isSupportedGregorianDate(value)
              ? Promise.resolve()
              : Promise.reject(new Error('กรุณากรอกปี ค.ศ. เช่น 2026 ไม่ใช่ปี พ.ศ. 2569')),
        },
      ]}>
      <DatePicker format="DD/MM/BBBB" style={{ width: '100%' }} />
    </Form.Item>
  );
}
