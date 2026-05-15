import * as React from 'react';
import { cn } from '@/lib/utils';

type Tone = 'gold' | 'mute' | 'success' | 'danger' | 'outline';

const tones: Record<Tone, string> = {
  gold: 'bg-[var(--color-gold-soft)] text-[var(--color-gold-bright)] border border-[var(--color-gold-soft)]',
  mute: 'bg-[var(--color-surface-2)] text-[var(--color-text-mute)] border border-[var(--color-border)]',
  success: 'bg-[#1a2a1f] text-[var(--color-success)] border border-[#264a35]',
  danger: 'bg-[#2a1a18] text-[var(--color-danger)] border border-[#4a2826]',
  outline: 'bg-transparent text-[var(--color-text-mute)] border border-[var(--color-border-strong)]',
};

export function Pill({
  tone = 'mute',
  className,
  ...props
}: { tone?: Tone } & React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em]',
        tones[tone],
        className
      )}
      {...props}
    />
  );
}
