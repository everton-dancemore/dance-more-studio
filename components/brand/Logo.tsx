import Image from 'next/image';
import { cn } from '@/lib/utils';

/**
 * Dance More wordmark logo. Source: /public/logo.jpg (1024x940).
 *
 * The wordmark sits in the middle of a mostly-black image. We use object-cover
 * to crop the top/bottom dark padding so the visible wordmark fills the
 * rendered box — keeps headers tight without re-cropping the source file.
 */
export function Logo({
  size = 'md',
  className,
}: {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  // Display dimensions for the visible wordmark band (after cropping vertical padding).
  // Aspect ratio chosen to match the wordmark proper (~3.4:1), not the full image.
  const dims = {
    sm: { w: 96, h: 28 },
    md: { w: 132, h: 38 },
    lg: { w: 220, h: 64 },
  }[size];

  return (
    <span
      className={cn(
        'relative inline-block shrink-0 overflow-hidden',
        className
      )}
      style={{ width: dims.w, height: dims.h }}
      aria-label="Dance More"
    >
      <Image
        src="/logo.jpg"
        alt="Dance More"
        fill
        sizes={`${dims.w}px`}
        priority={size === 'lg'}
        className="object-cover"
      />
    </span>
  );
}
