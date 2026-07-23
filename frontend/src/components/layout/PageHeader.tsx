'use client';

import React from 'react';
import { ChevronRight } from 'lucide-react';

interface Breadcrumb {
  label: string;
  href?: string;
}

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  breadcrumb?: Breadcrumb[];
  action?: React.ReactNode;
}

export function PageHeader({ title, subtitle, breadcrumb, action }: PageHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
      <div>
        {breadcrumb && breadcrumb.length > 0 && (
          <nav className="flex items-center space-x-1 text-xs text-muted-foreground mb-1">
            {breadcrumb.map((crumb, i) => (
              <React.Fragment key={i}>
                {i > 0 && <ChevronRight className="w-3 h-3" />}
                {crumb.href ? (
                  <a href={crumb.href} className="hover:text-foreground transition-colors">{crumb.label}</a>
                ) : (
                  <span className={i === breadcrumb.length - 1 ? 'text-foreground font-medium' : ''}>{crumb.label}</span>
                )}
              </React.Fragment>
            ))}
          </nav>
        )}
        <h1 className="text-2xl md:text-3xl font-extrabold text-foreground tracking-tight">{title}</h1>
        {subtitle && <p className="text-muted-foreground mt-1 text-sm">{subtitle}</p>}
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  );
}
