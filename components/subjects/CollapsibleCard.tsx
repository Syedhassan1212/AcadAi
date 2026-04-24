'use client';

import React, { useState } from 'react';

interface CollapsibleCardProps {
  title: string;
  subtitle?: string;
  icon: string;
  iconBg: string;
  iconColor: string;
  children: React.ReactNode;
  defaultExpanded?: boolean;
}

export default function CollapsibleCard({
  title,
  subtitle,
  icon,
  iconBg,
  iconColor,
  children,
  defaultExpanded = true,
}: CollapsibleCardProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <section className="bg-surface-container-low rounded-2xl border border-outline-variant/10 overflow-hidden ghost-border transition-all">
      <div 
        className="flex items-center gap-3 p-4 cursor-pointer hover:bg-surface-container-high transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className={`w-9 h-9 rounded-xl ${iconBg} flex items-center justify-center`}>
          <span className={`material-symbols-outlined ${iconColor} text-[20px]`}>{icon}</span>
        </div>
        <div className="flex-1">
          <h3 className="text-base font-bold text-on-surface">{title}</h3>
          {subtitle && (
            <p className={`text-[10px] uppercase font-black tracking-widest ${iconColor}/80`}>{subtitle}</p>
          )}
        </div>
        <span className={`material-symbols-outlined text-on-surface-variant transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}>
          expand_more
        </span>
      </div>

      <div className={`transition-all duration-300 ease-in-out ${isExpanded ? 'opacity-100' : 'max-h-0 opacity-0 pointer-events-none'}`}>
        <div className="p-4 pt-0">
          {children}
        </div>
      </div>
    </section>
  );
}
