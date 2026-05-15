import * as React from 'react';
import { cn } from '@/lib/utils';

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        'h-10 w-full rounded-lg bg-[var(--color-surface)] px-3 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-dim)]',
        'border border-[var(--color-border)] hover:border-[var(--color-border-strong)]',
        'focus:border-[var(--color-gold)] focus:outline-none focus:ring-2 focus:ring-[var(--color-gold-soft)]',
        'transition-colors',
        className
      )}
      {...props}
    />
  )
);
Input.displayName = 'Input';

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        'min-h-[80px] w-full rounded-lg bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-dim)]',
        'border border-[var(--color-border)] hover:border-[var(--color-border-strong)]',
        'focus:border-[var(--color-gold)] focus:outline-none focus:ring-2 focus:ring-[var(--color-gold-soft)]',
        'transition-colors resize-y',
        className
      )}
      {...props}
    />
  )
);
Textarea.displayName = 'Textarea';

export function Label({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn(
        'text-xs font-medium uppercase tracking-[0.12em] text-[var(--color-text-mute)]',
        className
      )}
      {...props}
    />
  );
}
