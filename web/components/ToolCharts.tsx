'use client';

import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';

import { ChartContainer, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { ToolRecord } from '@/lib/types';

function domainData(rows: ToolRecord[]) {
  const counts = new Map<string, number>();
  for (const row of rows) {
    counts.set(row.tool_domain, (counts.get(row.tool_domain) ?? 0) + 1);
  }

  return Array.from(counts.entries()).map(([domain, value]) => ({ domain, value }));
}

function practiceData(rows: ToolRecord[]) {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const key = row.data_practice_category ?? 'unclassified';
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const values = Array.from(counts.entries())
    .map(([category, value]) => ({ category, value }))
    .sort((a, b) => b.value - a.value);

  return values;
}

export default function ToolCharts({ rows }: { rows: ToolRecord[] }) {
  if (rows.length === 0) return null;

  const domain = domainData(rows);
  const practice = practiceData(rows);

  const domainConfig: ChartConfig = {
    data_tool: { label: 'Data Tool', color: '#5f7fd2' },
    non_data_tool: { label: 'Non-Data Tool', color: '#9cb1df' }
  };

  const practiceConfig: ChartConfig = {
    ai: { label: 'AI', color: '#6f57c9' },
    machine_learning: { label: 'Machine Learning', color: '#4f89d9' },
    dbms: { label: 'DBMS', color: '#53a76f' },
    data_visualization: { label: 'Data Visualization', color: '#d2ab55' },
    data_modeling: { label: 'Data Modeling', color: '#d68063' },
    other_data: { label: 'Other Data', color: '#98a8c4' },
    unclassified: { label: 'Unclassified', color: '#b2bfd8' }
  };

  return (
    <div className="mt-4 grid gap-4 md:grid-cols-2">
      <Card className="border-2 border-[#b9d5ff] bg-[#edf6ff] text-[#2f2f2f] shadow-[0_4px_0_0_#cfe4ff]">
        <CardHeader>
          <CardTitle className="text-base text-[#2b4f7c]">Data vs Non-Data Mix</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={domainConfig}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={domain} dataKey="value" nameKey="domain" innerRadius={60} outerRadius={100}>
                  {domain.map((entry) => (
                    <Cell key={entry.domain} fill={domainConfig[entry.domain]?.color ?? '#64748b'} />
                  ))}
                </Pie>
                <Tooltip content={<ChartTooltipContent />} />
              </PieChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>
      <Card className="border-2 border-[#b9d5ff] bg-[#edf6ff] text-[#2f2f2f] shadow-[0_4px_0_0_#cfe4ff]">
        <CardHeader>
          <CardTitle className="text-base text-[#2b4f7c]">Practice Categories</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={practiceConfig}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={practice}>
                <XAxis dataKey="category" tick={{ fontSize: 11 }} interval={0} angle={-20} textAnchor="end" height={55} />
                <YAxis allowDecimals={false} />
                <Tooltip content={<ChartTooltipContent />} />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {practice.map((entry) => (
                    <Cell
                      key={entry.category}
                      fill={practiceConfig[entry.category]?.color ?? practiceConfig.unclassified.color}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  );
}
