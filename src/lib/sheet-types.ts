import type { Dayjs } from 'dayjs';

export interface SheetRow {
  id?: string;
  ProvinceName?: string;
  provinceName?: string;
  CustomerName?: string;
  customerName?: string;
  Phone?: string;
  Address?: string;
  Product?: string;
  product?: string;
  Problem?: string;
  Warranty?: string | string[];
  buyProductDate?: string;
  BuyProductDate?: string;
  receiver?: string;
  receiverClaimDate?: string;
  inspector?: string;
  vehicleInspector?: string | string[];
  inspectionDate?: string;
  inspectstatus?: string;
  claimSender?: string;
  vehicleClaim?: string | string[];
  claimDate?: string;
  status?: string;
  serviceChargeStatus?: string | string[] | boolean | null;
  note?: string;
  image?: string | string[];
  part?: string;
  requestDate?: string;
  requester?: string;
  payer?: string;
  receiverItemDate?: string;
  [key: string]: string | number | boolean | string[] | null | undefined;
}

export interface SheetFormValues {
  receiverClaimDate?: Dayjs | null;
  inspectionDate?: Dayjs | null;
  claimDate?: Dayjs | null;
  reportDate?: Dayjs | null;
  buyProductDate?: string | Dayjs | null;
  requestDate?: Dayjs | null;
  receiverItemDate?: Dayjs | null;
  warranty?: string[];
  inspectstatus?: string;
  status?: string;
  provinceName?: string;
  customerName?: string;
  product?: string;
  problem?: string;
  note?: string;
  claimSender?: string;
  inspector?: string;
  address?: string;
  phone?: string;
  price?: string | number;
  serviceChargeStatus?: string[];
  vehicleClaim?: string[];
  vehicleInspector?: string[];
  [key: string]: string | number | boolean | string[] | Dayjs | null | undefined;
}
