import React from 'react';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StickyPageHeaderProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  children?: React.ReactNode;
  className?: string;
}

export const StickyPageHeader: React.FC<StickyPageHeaderProps> = ({
  title,
  description,
  icon: Icon,
  children,
  className,
}) => {
  return (
    <div className={cn(
      "sticky top-0 z-30 bg-background/80 backdrop-blur-md pb-6 pt-4 -mt-4 mb-6 border-b border-border/50 transition-all",
      className
    )}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            {Icon && <Icon className="h-6 w-6 text-primary" />}
            {title}
          </h1>
          {description && (
            <p className="text-muted-foreground text-sm mt-0.5">
              {description}
            </p>
          )}
        </div>
        {children && (
          <div className="flex items-center gap-2 flex-wrap">
            {children}
          </div>
        )}
      </div>
    </div>
  );
};
