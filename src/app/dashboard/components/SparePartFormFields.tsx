'use client';

import { Button, Checkbox, Divider, Form, Input, Select, Typography } from 'antd';
import DatePicker from '@/components/ThaiDatePicker';
import { PROVINCE_EDIT_OPTIONS, WARRANTY_OPTIONS } from '@/lib/claim-options';

type SparePartFormFieldsProps = {
  mode: 'claim-request' | 'edit';
  loading: boolean;
};

export default function SparePartFormFields({ mode, loading }: SparePartFormFieldsProps) {
  const readOnlySource = mode === 'claim-request';

  return (
    <>
      <Divider />
      <Typography.Title level={4}>เครดิต</Typography.Title>

      <Form.Item label={readOnlySource ? 'สาขาที่บริการ' : 'สาขา'} name="provinceName">
        {readOnlySource ? <Input disabled /> : <Select options={PROVINCE_EDIT_OPTIONS} />}
      </Form.Item>
      <Form.Item label={readOnlySource ? 'ชื่อ - นามสกุล' : 'ชื่อลูกค้า'} name="customerName">
        <Input disabled={readOnlySource} />
      </Form.Item>
      <Form.Item label={readOnlySource ? 'สินค้า / เอกสาร' : 'สินค้า'} name="product">
        <Input disabled={readOnlySource} />
      </Form.Item>
      <Form.Item label="ประเภทประกัน" name="warranty">
        {readOnlySource ? <Input disabled /> : <Checkbox.Group options={WARRANTY_OPTIONS} />}
      </Form.Item>
      <Form.Item label="รายละเอียดปัญหา" name="problem">
        <Input.TextArea disabled={readOnlySource} />
      </Form.Item>

      <Divider />
      <Typography.Title level={4}>บัญชี / สต็อค</Typography.Title>
      <Form.Item label="ชื่ออะไหล่" name="part">
        <Input />
      </Form.Item>
      <Form.Item label={readOnlySource ? 'วันที่เบิกอะไหล่' : 'วันที่เบิก'} name="requestDate">
        <DatePicker style={{ width: '100%' }} format="DD/MM/BBBB" />
      </Form.Item>
      <Form.Item label="ผู้เบิกของ" name="requester">
        <Input placeholder="ชื่อฝ่ายเครดิต" />
      </Form.Item>
      <Form.Item label="ผู้จ่ายของ" name="payer">
        <Input placeholder="ชื่อฝ่ายสต็อค" />
      </Form.Item>
      <Form.Item label="ผู้รับของ " name="receiver">
        <Input placeholder="ชื่อฝ่ายสต็อค ⚠️ *กรอกข้อมูลเมื่อได้รับอะไหล่คืน*" />
      </Form.Item>
      <Form.Item label="วันที่รับของ" name="receiverItemDate">
        <DatePicker style={{ width: '100%' }} format="DD/MM/BBBB" />
      </Form.Item>
      <Form.Item label="หมายเหตุ" name="note">
        <Input.TextArea />
      </Form.Item>

      <Button type="primary" htmlType="submit" loading={loading}>
        บันทึกข้อมูล
      </Button>
    </>
  );
}
