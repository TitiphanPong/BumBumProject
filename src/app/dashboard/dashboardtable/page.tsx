import Link from 'next/link';
import TableTypeIcon from './TableTypeIcon';

const SelectTablePage = () => {
  const cards = [
    {
      title: 'ตารางใบเคลม',
      description: 'แก้ไขข้อมูลของใบเคลมสินค้า',
      icon: <TableTypeIcon type="claim" />,
      path: '/dashboard/dashboardtable/table-claim',
    },
    {
      title: 'ตารางเบิกอะไหล่',
      description: 'จัดการข้อมูลการเบิกอะไหล่',
      icon: <TableTypeIcon type="spare" />,
      path: '/dashboard/dashboardtable/table-spare',
    },
  ];

  return (
    <div className="min-h-screen px-4 py-16">
      <div className="text-center mb-12">
        <h2 className="text-3xl md:text-4xl font-bold text-gray-800 mb-3">
          📇 เลือกประเภทตารางที่ต้องการจัดการ
        </h2>
        <p className="text-gray-500 text-base max-w-xl mx-auto">
          คลิกเพื่อเข้าสู่หน้าจัดการข้อมูล เช่น ใบเคลมสินค้า , รายการเบิกอะไหล่
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto px-4">
        {cards.map(card => (
          <Link
            key={card.path}
            href={card.path}
            className="group flex cursor-pointer flex-col items-center rounded-2xl border border-gray-200 bg-white p-8 text-center transition-[transform,background-color,box-shadow] duration-300 hover:scale-[1.03] hover:bg-blue-500 hover:shadow-xl active:scale-[0.98]">
            <div className="mb-4">{card.icon}</div>
            <h3 className="text-xl font-semibold text-gray-800 group-hover:text-white transition">
              {card.title}
            </h3>
            <p className="mt-2 text-gray-500 group-hover:text-blue-100 text-sm transition">
              {card.description}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default SelectTablePage;
