'use client';

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';

interface MasteryTrendProps {
  data: {
    day: string;
    score: number;
  }[];
}

export default function MasteryTrend({ data }: MasteryTrendProps) {
  // Ensure we have 7 days of data
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const dateStr = d.toISOString().split('T')[0];
    const existing = data.find(item => item.day.split('T')[0] === dateStr);
    return {
      name: d.toLocaleDateString('en-US', { weekday: 'short' }),
      score: existing ? Math.round(existing.score * 100) : null, // percentage
    };
  });

  return (
    <div className="w-full h-[240px] mt-4">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={last7Days}>
          <defs>
            <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#34d399" stopOpacity={0.6}/>
              <stop offset="95%" stopColor="#34d399" stopOpacity={0}/>
            </linearGradient>
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
            domain={[0, 100]}
            width={35}
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: 'rgba(28, 27, 29, 0.9)', 
              backdropFilter: 'blur(8px)',
              border: '1px solid rgba(52, 211, 153, 0.2)',
              borderRadius: '12px',
              fontSize: '11px',
              color: '#e5e1e4',
              boxShadow: '0 4px 24px rgba(0,0,0,0.5)'
            }}
            formatter={(value) => [`${value}%`, 'Mastery']}
            itemStyle={{ color: '#34d399', fontWeight: 800 }}
          />
          <ReferenceLine y={80} stroke="#34d399" strokeDasharray="3 3" opacity={0.2} label={{ value: 'Target', position: 'right', fill: '#34d399', fontSize: 10, opacity: 0.5 }} />
          <Area 
            type="monotone" 
            dataKey="score" 
            stroke="#34d399" 
            strokeWidth={4} 
            fill="url(#colorScore)"
            dot={{ r: 5, fill: '#34d399', stroke: '#131315', strokeWidth: 2 }}
            activeDot={{ r: 7, fill: '#34d399', stroke: '#fff', strokeWidth: 2 }}
            connectNulls
            animationDuration={2000}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
