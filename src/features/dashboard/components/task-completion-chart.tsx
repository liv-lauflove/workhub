'use client';

import * as React from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import {
  TrendingUp,
  BarChart3,
  Calendar,
  CheckCircle2,
  Layers,
  Target,
  Sparkles,
} from 'lucide-react';
import type {
  CompletionTrendData,
  CompletionTrendPoint,
} from '../types/dashboard.types';

interface TaskCompletionChartProps {
  trendData: CompletionTrendData;
  quarterLabel: string;
}

type PeriodMode = 'weekly' | 'monthly';
type ChartViewMode = 'cumulative' | 'interval';

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number;
    color: string;
    dataKey: string;
  }>;
  label?: string | number;
  dataPoint?: CompletionTrendPoint;
}

function CustomTooltip({ active, payload, dataPoint }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div className="rounded-xl border bg-card/95 p-3.5 shadow-lg backdrop-blur-md text-xs space-y-2 ring-1 ring-border min-w-[200px]">
      <div className="border-b pb-1.5">
        <p className="font-semibold text-foreground">
          {dataPoint?.fullLabel || dataPoint?.period}
        </p>
        <span className="text-[10px] text-muted-foreground">
          Metrik Progres Tugas
        </span>
      </div>

      <div className="space-y-1.5">
        {payload.map((item) => {
          let labelText = item.name;
          if (item.dataKey === 'cumulativeCompleted') {
            labelText = 'Kumulatif Selesai';
          } else if (item.dataKey === 'target') {
            labelText = 'Target Proyeksi';
          } else if (item.dataKey === 'completed') {
            labelText = 'Task Selesai';
          } else if (item.dataKey === 'created') {
            labelText = 'Task Dibuat';
          }

          return (
            <div
              key={item.dataKey}
              className="flex items-center justify-between gap-3 text-xs"
            >
              <div className="flex items-center gap-1.5 min-w-0">
                <span
                  className="h-2 w-2 rounded-full shrink-0"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-muted-foreground truncate">
                  {labelText}
                </span>
              </div>
              <span className="font-bold text-foreground shrink-0">
                {item.value} task
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const emptySubscribe = () => () => {};
function useIsMounted() {
  return React.useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
}

export function TaskCompletionChart({
  trendData,
  quarterLabel,
}: TaskCompletionChartProps) {
  const [periodMode, setPeriodMode] = React.useState<PeriodMode>('weekly');
  const [viewMode, setViewMode] = React.useState<ChartViewMode>('cumulative');
  const isMounted = useIsMounted();

  const chartData =
    periodMode === 'weekly' ? trendData.weekly : trendData.monthly;

  const { summary } = trendData;

  return (
    <div className="flex flex-col justify-between rounded-xl border bg-card p-5 shadow-xs transition-all hover:shadow-md">
      {/* 1. Header with Title & Interactive Controls */}
      <div className="flex flex-col gap-3 border-b pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <TrendingUp className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-base font-bold tracking-tight text-foreground">
                  Tren Penyelesaian Task Kuartalan
                </h3>
                <p className="text-xs text-muted-foreground">
                  Statistik visualisasi laju penyelesaian task vs proyeksi
                  target {quarterLabel}.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <span className="inline-flex items-center gap-1 rounded-md border bg-muted/60 px-2.5 py-1 text-xs font-medium text-muted-foreground">
              <Calendar className="h-3 w-3" />
              <span>{quarterLabel}</span>
            </span>

            {summary.targetPaceAchieved ? (
              <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                <Sparkles className="h-3 w-3" />
                <span>On Track</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/15 border border-amber-500/30 px-2.5 py-1 text-xs font-semibold text-amber-700 dark:text-amber-400">
                <Target className="h-3 w-3" />
                <span>Perlu Percepatan</span>
              </span>
            )}
          </div>
        </div>

        {/* Control Toggles: Period & Mode */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
          {/* View Mode Switcher (Kumulatif vs Per Periode) */}
          <div className="flex items-center rounded-lg bg-muted p-1 text-xs">
            <button
              type="button"
              onClick={() => setViewMode('cumulative')}
              className={`rounded-md px-2.5 py-1 font-medium transition-all cursor-pointer ${
                viewMode === 'cumulative'
                  ? 'bg-background text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Laju Kumulatif
            </button>
            <button
              type="button"
              onClick={() => setViewMode('interval')}
              className={`rounded-md px-2.5 py-1 font-medium transition-all cursor-pointer ${
                viewMode === 'interval'
                  ? 'bg-background text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Per Interval
            </button>
          </div>

          {/* Period Mode Switcher (Mingguan vs Bulanan) */}
          <div className="flex items-center rounded-lg bg-muted p-1 text-xs">
            <button
              type="button"
              onClick={() => setPeriodMode('weekly')}
              className={`rounded-md px-2.5 py-1 font-medium transition-all cursor-pointer ${
                periodMode === 'weekly'
                  ? 'bg-background text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Mingguan (8 Mgg)
            </button>
            <button
              type="button"
              onClick={() => setPeriodMode('monthly')}
              className={`rounded-md px-2.5 py-1 font-medium transition-all cursor-pointer ${
                periodMode === 'monthly'
                  ? 'bg-background text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Bulanan
            </button>
          </div>
        </div>
      </div>

      {/* 2. Interactive Chart Canvas */}
      <div className="mt-4 w-full h-[280px] sm:h-[300px]">
        {!isMounted ? (
          <div className="flex h-full w-full items-center justify-center rounded-lg border border-dashed bg-muted/20 text-xs text-muted-foreground">
            Memuat grafik performa...
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={chartData}
              margin={{ top: 10, right: 15, left: -20, bottom: 0 }}
            >
              <defs>
                <linearGradient
                  id="colorCumulative"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="colorBar" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity={0.9} />
                  <stop offset="100%" stopColor="#059669" stopOpacity={0.9} />
                </linearGradient>
              </defs>

              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="currentColor"
                className="opacity-15"
              />

              <XAxis
                dataKey="period"
                stroke="currentColor"
                className="text-[11px] text-muted-foreground opacity-80"
                tickLine={false}
                axisLine={false}
              />

              <YAxis
                stroke="currentColor"
                className="text-[11px] text-muted-foreground opacity-80"
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
              />

              <Tooltip
                content={({ active, payload, label }) => {
                  const point = chartData.find(
                    (p) => p.period === String(label)
                  );
                  return (
                    <CustomTooltip
                      active={active}
                      payload={
                        payload as unknown as CustomTooltipProps['payload']
                      }
                      label={label}
                      dataPoint={point}
                    />
                  );
                }}
              />

              {viewMode === 'cumulative' ? (
                <>
                  {/* Cumulative area */}
                  <Area
                    type="monotone"
                    dataKey="cumulativeCompleted"
                    name="Kumulatif Selesai"
                    stroke="#10b981"
                    strokeWidth={2.5}
                    fill="url(#colorCumulative)"
                    dot={{ r: 3, fill: '#10b981', strokeWidth: 1 }}
                    activeDot={{ r: 5, strokeWidth: 2 }}
                  />

                  {/* Projected target pace line */}
                  <Line
                    type="monotone"
                    dataKey="target"
                    name="Target Proyeksi"
                    stroke="#f59e0b"
                    strokeWidth={1.8}
                    strokeDasharray="4 4"
                    dot={false}
                  />
                </>
              ) : (
                <>
                  {/* Interval completed tasks bar */}
                  <Bar
                    dataKey="completed"
                    name="Task Selesai"
                    fill="url(#colorBar)"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={38}
                  />

                  {/* Interval created tasks line */}
                  <Line
                    type="monotone"
                    dataKey="created"
                    name="Task Dibuat"
                    stroke="#0284c7"
                    strokeWidth={2}
                    dot={{ r: 3.5, fill: '#0284c7' }}
                  />
                </>
              )}
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* 3. Legend & KPI Summary Footer */}
      <div className="mt-4 pt-3 border-t flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-muted-foreground">
        {/* Dynamic Legend */}
        <div className="flex flex-wrap items-center gap-4">
          {viewMode === 'cumulative' ? (
            <>
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                <span className="text-foreground font-medium">
                  Kumulatif Selesai
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-amber-500" />
                <span>Target Kuartalan</span>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                <span className="text-foreground font-medium">
                  Task Selesai
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-sky-500" />
                <span>Task Dibuat</span>
              </div>
            </>
          )}
        </div>

        {/* Aggregate Stats Strip */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 text-[11px]">
            <CheckCircle2 className="h-3 w-3 text-emerald-500" />
            <span>
              <strong>{summary.totalCompleted}</strong> selesai
            </span>
          </div>

          <div className="flex items-center gap-1 text-[11px]">
            <BarChart3 className="h-3 w-3 text-primary" />
            <span>
              avg <strong>{summary.weeklyAverage}</strong>/mgg
            </span>
          </div>

          <div className="flex items-center gap-1 text-[11px]">
            <Layers className="h-3 w-3 text-sky-500" />
            <span>
              laju <strong>{summary.completionVelocity}%</strong>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
