import type React from 'react';

interface SectionTitleProps {
  children: React.ReactNode;
}

export const SectionTitle: React.FC<SectionTitleProps> = ({ children }) => (
  <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground border-b border-border/50 pb-2 mb-3">
    {children}
  </h3>
);
