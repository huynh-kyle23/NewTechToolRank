'use client';

import * as React from 'react';
import { TooltipProps } from 'recharts';

import { cn } from '@/lib/utils';

export type ChartConfig = Record<string, { label: string; color: string }>;

const ChartConfigContext = React.createContext<ChartConfig | null>(null);

export function useChartConfig() {
  const context = React.useContext(ChartConfigContext);
  if (!context) throw new Error('useChartConfig must be used within ChartContainer');
  return context;
}

export function ChartContainer({
  config,
  className,
  children
}: {
  config: ChartConfig;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <ChartConfigContext.Provider value={config}>
      <div className={cn('h-[320px] w-full', className)}>{children}</div>
    </ChartConfigContext.Provider>
  );
}

export function ChartTooltipContent({
  active,
  payload,
  label
}: TooltipProps<number, string>) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="rounded-xl border-2 border-[#b9d5ff] bg-[#edf6ff] p-2 text-xs text-[#2f4668] shadow-[0_3px_0_0_#cfe4ff]">
      {label ? <div className="mb-1 text-[#4f6892]">{String(label)}</div> : null}
      {payload.map((entry) => (
        <div key={entry.dataKey as string} className="flex items-center justify-between gap-2">
          <span className="text-[#3a557e]">{entry.name}</span>
          <span className="font-semibold text-[#2b4f7c]">{entry.value}</span>
        </div>
      ))}
    </div>
  );
}
