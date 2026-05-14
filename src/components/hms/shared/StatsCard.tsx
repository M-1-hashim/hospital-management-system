'use client';

import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

type TrendDirection = 'up' | 'down' | 'neutral';
type CardColor = 'green' | 'blue' | 'red' | 'amber' | 'purple';

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: TrendDirection;
  trendValue?: string;
  color?: CardColor;
  index?: number;
}

const colorMap: Record<CardColor, { iconBg: string; iconText: string; trendUp: string; trendDown: string }> = {
  green: { iconBg: 'bg-primary', iconText: 'text-primary-foreground', trendUp: 'text-primary', trendDown: 'text-red-500' },
  blue: { iconBg: 'bg-primary', iconText: 'text-primary-foreground', trendUp: 'text-primary', trendDown: 'text-red-500' },
  red: { iconBg: 'bg-primary', iconText: 'text-primary-foreground', trendUp: 'text-primary', trendDown: 'text-red-500' },
  amber: { iconBg: 'bg-primary', iconText: 'text-primary-foreground', trendUp: 'text-primary', trendDown: 'text-red-500' },
  purple: { iconBg: 'bg-primary', iconText: 'text-primary-foreground', trendUp: 'text-primary', trendDown: 'text-red-500' },
};

export function StatsCard({ title, value, icon: Icon, trend = 'neutral', trendValue, color = 'green', index = 0 }: StatsCardProps) {
  const colors = colorMap[color];
  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
  const trendColor = trend === 'up' ? colors.trendUp : trend === 'down' ? colors.trendDown : 'text-muted-foreground';

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: index * 0.08, ease: 'easeOut' }}>
      <div className="group relative overflow-hidden rounded-2xl bg-card p-5 shadow-sm shadow-black/[0.03] transition-all duration-300 hover:shadow-md hover:shadow-black/[0.06] dark:shadow-none dark:ring-1 dark:ring-white/[0.06]">
        <div className="flex items-start justify-between">
          <div className="flex flex-col gap-1.5">
            <span className="text-[13px] font-medium tracking-wide text-muted-foreground uppercase">{title}</span>
            <span className="text-[28px] font-bold tracking-tight leading-none text-foreground">{value}</span>
            {trendValue && (
              <div className="mt-2 flex items-center gap-1">
                <TrendIcon className={cn('size-3.5', trendColor)} />
                <span className={cn('text-xs font-semibold', trendColor)}>{trendValue}</span>
              </div>
            )}
          </div>
          <div className={cn('flex size-12 items-center justify-center rounded-2xl shadow-lg', colors.iconBg)}>
            <Icon className={cn('size-5', colors.iconText)} />
          </div>
        </div>
      </div>
    </motion.div>
  );
}
