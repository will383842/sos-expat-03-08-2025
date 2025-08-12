import * as React from 'react';
import { cn } from '@/lib/utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'outline' | 'destructive';
}

const badgeVariants = {
  default: 'bg-gray-100 text-gray-800',
  outline: 'border border-gray-300 text-gray-800',
  destructive: 'bg-red-100 text-red-700',
};

const Badge: React.FC<BadgeProps> = ({ className, variant = 'default', ...props }) => {
  return (
    <div
      className={cn(
        'inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold',
        badgeVariants[variant],
        className
      )}
      {...props}
    />
  );
};

export { Badge };


