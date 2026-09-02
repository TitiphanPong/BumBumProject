'use client';

import { Card } from 'antd';

type SummaryMetricItem = {
  title: string;
  value: string | number;
  color: string;
  key?: string;
};

type SummaryMetricCardsProps = {
  items: SummaryMetricItem[];
  className: string;
  formatNumbers?: boolean;
  onItemClick?: (item: SummaryMetricItem) => void;
};

export default function SummaryMetricCards({
  items,
  className,
  formatNumbers = false,
  onItemClick,
}: SummaryMetricCardsProps) {
  return (
    <section className={className}>
      {items.map((item, index) => (
        <Card
          key={item.key ?? `${item.title}-${index}`}
          className="rounded-2xl bg-white text-center shadow-sm transition duration-300 hover:shadow-md"
          onClick={onItemClick ? () => onItemClick(item) : undefined}>
          <p className="mb-1 text-sm text-gray-500">{item.title}</p>
          <p className={`text-3xl font-bold ${item.color}`}>
            {formatNumbers && typeof item.value === 'number'
              ? item.value.toLocaleString()
              : item.value}
          </p>
        </Card>
      ))}
    </section>
  );
}
