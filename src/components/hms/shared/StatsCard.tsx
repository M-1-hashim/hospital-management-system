'use client';

import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
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

const colorMap: Record<
  CardColor,
  { bg: string; iconBg: string; iconText: string; trendUp: string; trendDown: string }
> = {
  green: {
    bg: 'bg-emerald-50 dark:bg-emerald-950/30',
    iconBg: 'bg-emerald-100 dark:bg-emerald-900/50',
    iconText: 'text-emerald-600 dark:text-emerald-400',
    trendUp: 'text-emerald-600',
    trendDown: 'text-red-500',
  },
  blue: {
    bg: 'bg-sky-50 dark:bg-sky-950/30',
    iconBg: 'bg-sky-100 dark:bg-sky-900/50',
    iconText: 'text-sky-600 dark:text-sky-400',
    trendUp: 'text-emerald-600',
    trendDown: 'text-red-500',
  },
  red: {
    bg: 'bg-red-50 dark:bg-red-950/30',
    iconBg: 'bg-red-100 dark:bg-red-900/50',
    iconText: 'text-red-600 dark:text-red-400',
    trendUp: 'text-emerald-600',
    trendDown: 'text-red-500',
  },
  amber: {
    bg: 'bg-amber-50 dark:bg-amber-950/30',
    iconBg: 'bg-amber-100 dark:bg-amber-900/50',
    iconText: 'text-amber-600 dark:text-amber-400',
    trendUp: 'text-emerald-600',
    trendDown: 'text-red-500',
  },
  purple: {
    bg: 'bg-violet-50 dark:bg-violet-950/30',
    iconBg: 'bg-violet-100 dark:bg-violet-900/50',
    iconText: 'text-violet-600 dark:text-violet-400',
    trendUp: 'text-emerald-600',
    trendDown: 'text-red-500',
  },
};

export function StatsCard({
  title,
  value,
  icon: Icon,
  trend = 'neutral',
  trendValue,
  color = 'green',
  index = 0,
}: StatsCardProps) {
  const colors = colorMap[color];

  const TrendIcon =
    trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;

  const trendColor =
    trend === 'up'
      ? colors.trendUp
      : trend === 'down'
        ? colors.trendDown
        : 'text-muted-foreground';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.4,
        delay: index * 0.1,
        ease: 'easeOut',
      }}
    >
      <Card className={cn('overflow-hidden border-0 shadow-sm transition-shadow hover:shadow-md', colors.bg)}>
        <CardContent className="p-5">
          <div className="flex items-start justify-between">
            <div className="flex flex-col gap-1">
              <span className="text-sm font-medium text-muted-foreground">
                {title}
              </span>
              <span className="text-3xl font-bold tracking-tight text-foreground">
                {value}
              </span>
              {trendValue && (
                <div className="mt-1 flex items-center gap-1">
                  <TrendIcon className={cn('size-3.5', trendColor)} />
                  <span className={cn('text-xs font-medium', trendColor)}>
                    {trendValue}
                  </span>
                </div>
              )}
            </div>
            <div
              className={cn(
                'flex size-11 items-center justify-center rounded-xl',
                colors.iconBg
              )}
            >
              <Icon className={cn('size-5', colors.iconText)} />
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
