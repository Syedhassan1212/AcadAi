'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, AreaChart, Area } from 'recharts';

interface ActivityChartProps {
  data: {
    day: string;
    minutes: number;
  }[];
}

export default function ActivityChart({ data }: ActivityChartProps) {
  // Ensure we have 7 days of data even if some are missing
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const dateStr = d.toISOString().split('T')[0];
    const existing = data.find(item => item.day.split('T')[0] === dateStr);
    return {
      name: d.toLocaleDateString('en-US', { weekday: 'short' }),
      minutes: existing ? existing.minutes : 0,
      fullDate: dateStr
    };
  });

  return (
    <div className="w-full h-[240px] mt-4">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={last7Days}>
          <defs>
            <linearGradient id="colorMinutes" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#d0bcff" stopOpacity={0.6}/>
              <stop offset="95%" stopColor="#d0bcff" stopOpacity={0}/>
            </linearGradient>
            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-outline-variant)" opacity={0.15} />
          <XAxis 
            dataKey="name" 
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: 'var(--color-on-surface-variant)', fontSize: 10, fontWeight: 700 }}
            dy={10}
          />
          <YAxis 
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: 'var(--color-on-surface-variant)', fontSize: 10 }}
            width={35}
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: 'rgba(28, 27, 29, 0.9)', 
              backdropFilter: 'blur(8px)',
              border: '1px solid rgba(208, 188, 255, 0.2)',
              borderRadius: '12px',
              fontSize: '11px',
              color: '#e5e1e4',
              boxShadow: '0 4px 24px rgba(0,0,0,0.5)'
            }}
            itemStyle={{ color: '#d0bcff', fontWeight: 800 }}
            cursor={{ stroke: 'rgba(208, 188, 255, 0.3)', strokeWidth: 2 }}
          />
          <Area 
            type="monotone" 
            dataKey="minutes" 
            stroke="#d0bcff" 
            strokeWidth={4}
            fillOpacity={1} 
            fill="url(#colorMinutes)" 
            animationDuration={2000}
            dot={{ r: 4, fill: '#d0bcff', stroke: '#131315', strokeWidth: 2 }}
            activeDot={{ r: 6, fill: '#d0bcff', stroke: '#fff', strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
