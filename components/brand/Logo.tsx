import { cn } from '@/lib/utils';

/**
 * Wordmark fallback. The real Dance More logo is a custom brush wordmark — drop
 * the PNG into `public/dance-more-logo.png` and swap this for an <Image>.
 */
export function Logo({ size = 'md', className }: { size?: 'sm' | 'md' | 'lg'; className?: string }) {
  const sz = {
    sm: 'text-base',
    md: 'text-lg',
    lg: 'text-3xl',
  }[size];
  return (
    <span
      className={cn(
        'font-serif italic font-bold tracking-[0.04em] text-[var(--color-gold)]',
        sz,
        className
      )}
      aria-label="Dance More"
    >
      Dance More
    </span>
  );
}
