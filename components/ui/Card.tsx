import * as React from 'react';
import { cn } from '@/lib/utils';

export function Card({
  className,
  accent = false,
  ...props
}: { accent?: boolean } & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'rounded-2xl bg-[var(--color-surface)] hairline',
        accent && 'gold-glow',
        className
      )}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('px-6 pt-6', className)} {...props} />;
}

export function CardBody({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('px-6 py-6', className)} {...props} />;
}

export function CardFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('px-6 pb-6', className)} {...props} />;
}

export function SectionTitle({
  className,
  children,
  hint,
  ...props
}: { hint?: React.ReactNode } & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('mb-4 flex items-baseline justify-between', className)} {...props}>
      <h2 className="font-serif text-2xl text-[var(--color-text)]">{children}</h2>
      {hint && <div className="text-xs uppercase tracking-[0.16em] text-[var(--color-text-dim)]">{hint}</div>}
    </div>
  );
}
