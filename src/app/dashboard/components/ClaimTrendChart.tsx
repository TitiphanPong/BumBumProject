'use client';

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

type ChartRow = { date: string } & Record<string, string | number>;

type ClaimTrendChartProps = {
  chartType: 'bar' | 'line';
  data: ChartRow[];
  provinces: string[];
};

const SERIES_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

export default function ClaimTrendChart({ chartType, data, provinces }: ClaimTrendChartProps) {
  return (
    <div className="w-full overflow-x-auto">
      <div style={{ minWidth: `${data.length * 50}px` }}>
        <ResponsiveContainer width="100%" height={300}>
          {chartType === 'bar' ? (
            <BarChart
              data={data}
              margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
              barCategoryGap="25%">
              <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
              <XAxis
                dataKey="date"
                tickFormatter={value => value.slice(5)}
                tick={{ fontSize: 10, fill: '#888' }}
                interval={0}
              />
              <YAxis tick={{ fontSize: 11, fill: '#888' }} />
              <Tooltip />
              <Legend />
              {provinces.map((province, index) => (
                <Bar
                  key={province}
                  dataKey={province}
                  fill={SERIES_COLORS[index % SERIES_COLORS.length]}
                  name={province}
                />
              ))}
            </BarChart>
          ) : (
            <LineChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
              <XAxis
                dataKey="date"
                tickFormatter={value => value.slice(5)}
                tick={{ fontSize: 10, fill: '#888' }}
                interval={0}
              />
              <YAxis tick={{ fontSize: 11, fill: '#888' }} />
              <Tooltip />
              <Legend />
              {provinces.map((province, index) => (
                <Line
                  key={province}
                  type="monotone"
                  dataKey={province}
                  stroke={SERIES_COLORS[index % SERIES_COLORS.length]}
                  strokeWidth={3}
                  dot={{ r: 4 }}
                  activeDot={{ r: 7 }}
                  name={province}
                />
              ))}
            </LineChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}
