import { memo } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { FeatureImportance } from '@/types';

interface FeatureImportanceChartProps {
  data: FeatureImportance[];
  height?: number;
  title?: string;
  subtitle?: string;
  emptyMessage?: string;
}

function getBarColor(direction: FeatureImportance['direction']) {
  if (direction === 'positive') {
    return '#C8102E';
  }

  if (direction === 'negative') {
    return '#0F6E56';
  }

  return '#1A1A2E';
}

function FeatureImportanceChartComponent({
  data,
  height = 320,
  title = 'Importance des variables',
  subtitle = 'Lecture interpretable des facteurs qui influencent le score churn.',
  emptyMessage = "Aucune importance de variable n'a encore ete retournee par l'API ML.",
}: FeatureImportanceChartProps) {
  if (data.length === 0) {
    return (
      <div className="panel-padding">
        <div className="mb-5">
          <h3 className="text-lg font-semibold text-navy">{title}</h3>
          <p className="text-sm text-muted">{subtitle}</p>
        </div>
        <div className="rounded-card border border-border bg-page p-6 text-sm text-muted">
          {emptyMessage}
        </div>
      </div>
    );
  }

  return (
    <div className="panel-padding">
      <div className="mb-5">
        <h3 className="text-lg font-semibold text-navy">{title}</h3>
        <p className="text-sm text-muted">{subtitle}</p>
      </div>
      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 8, right: 12, left: 4, bottom: 8 }}>
            <CartesianGrid stroke="#E5E5E5" horizontal={false} />
            <XAxis type="number" tickLine={false} axisLine={false} />
            <YAxis
              type="category"
              dataKey="feature"
              width={180}
              tickLine={false}
              axisLine={false}
              tick={{ fill: '#1A1A2E', fontSize: 12 }}
            />
            <Tooltip
              cursor={{ fill: '#F6F6F8' }}
              contentStyle={{ borderRadius: 12, border: '1px solid #E5E5E5' }}
            />
            <Bar dataKey="importance" radius={[6, 6, 6, 6]} animationDuration={800}>
              {data.map((entry) => (
                <Cell key={entry.feature} fill={getBarColor(entry.direction)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

const FeatureImportanceChart = memo(FeatureImportanceChartComponent);

export default FeatureImportanceChart;
