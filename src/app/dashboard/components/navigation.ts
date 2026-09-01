export type DashboardNavigationIcon =
  | 'home'
  | 'claim'
  | 'spare'
  | 'table'
  | 'parts'
  | 'person';

export type DashboardNavigationItem = {
  key: string;
  label: string;
  icon: DashboardNavigationIcon;
  children?: Array<{
    key: string;
    label: string;
  }>;
};

export const DASHBOARD_NAVIGATION: DashboardNavigationItem[] = [
  {
    key: '/dashboard',
    label: 'หน้าหลัก',
    icon: 'home',
  },
  {
    key: '/dashboard/claimform',
    label: 'ใบเคลมสินค้า',
    icon: 'claim',
  },
  {
    key: '/dashboard/sparepartform',
    label: 'เบิกอะไหล่',
    icon: 'spare',
  },
  {
    key: '/dashboard/dashboardtable',
    label: 'แก้ไขรายการ',
    icon: 'table',
    children: [
      {
        key: '/dashboard/dashboardtable/table-claim',
        label: 'แก้ไขตารางใบเคลม',
      },
      {
        key: '/dashboard/dashboardtable/table-spare',
        label: 'แก้ไขตารางเบิกอะไหล่',
      },
    ],
  },
  {
    key: '/dashboard/partsprice',
    label: 'ราคาอะไหล่และมอเตอร์',
    icon: 'parts',
  },
  {
    key: '/dashboard/resultclaimperson',
    label: 'สรุปผลการเคลม',
    icon: 'person',
  },
];

export const DASHBOARD_PATH_LABELS: Record<string, string> = {
  dashboard: 'หน้าหลัก',
  claimform: 'ใบเคลมสินค้า',
  sparepartform: 'เบิกอะไหล่',
  dashboardtable: 'แก้ไขรายการ',
  'table-claim': 'แก้ไขตารางใบเคลม',
  'table-spare': 'แก้ไขตารางเบิกอะไหล่',
  partsprice: 'ราคาอะไหล่และมอเตอร์',
  resultclaimperson: 'สรุปผลการเคลมรายคน',
};
