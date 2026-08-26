'use client';

import React from 'react';
import Link from 'next/link';
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

/**
 * The heading every dashboard route opens with. One `<h1>` per page lives here,
 * so the document outline is consistent across routes.
 */
export function PageHeader({ title, subtitle, breadcrumb, action }: PageHeaderProps) {
  return (
    <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
      <div>
        {breadcrumb && breadcrumb.length > 0 && (
          <nav aria-label="Breadcrumb" className="mb-1 flex items-center gap-1 text-xs text-muted-foreground">
            {breadcrumb.map((crumb, i) => {
              const isLast = i === breadcrumb.length - 1;
              return (
                <React.Fragment key={`${crumb.label}-${i}`}>
                  {i > 0 && <ChevronRight className="h-3 w-3" aria-hidden="true" />}
                  {crumb.href && !isLast ? (
                    // next/link, not a bare <a> — a breadcrumb click was doing a
                    // full document load and throwing away the client cache.
                    <Link
                      href={crumb.href}
                      className="rounded-[var(--app-radius-xs)] transition-colors duration-[var(--app-duration-fast)] hover:text-foreground"
                    >
                      {crumb.label}
                    </Link>
                  ) : (
                    <span
                      aria-current={isLast ? 'page' : undefined}
                      className={isLast ? 'font-medium text-foreground' : undefined}
                    >
                      {crumb.label}
                    </span>
                  )}
                </React.Fragment>
              );
            })}
          </nav>
        )}
        <h1 className="font-display text-2xl font-extrabold tracking-tight text-foreground md:text-3xl">
          {title}
        </h1>
        {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  );
}
