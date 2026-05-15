'use client';

import { use, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Star, Check, Camera, Heart, Target, X } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { Logo } from '@/components/brand/Logo';
import { Pill } from '@/components/ui/Pill';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Input';
import { Card, CardBody } from '@/components/ui/Card';
import { useAuth } from '@/hooks/useAuth';
import { useStudent } from '@/hooks/useStudents';
import { useLessons } from '@/hooks/useLessons';
import { useLessonPhotos } from '@/hooks/useLessonPhotos';
import type { LessonRow, LessonStatusDB, StudentRow } from '@/lib/db-types';
import { daysUntil, formatCountdown } from '@/lib/countdown';
import { cn } from '@/lib/utils';
import { useState } from 'react';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function StudentFilePage({ params }: PageProps) {
  const { id } = use(params);
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { student, loading: studentLoading } = useStudent(id);
  const { lessons, loading: lessonsLoading, markComplete, updateLesson, toggleFavourite } =
    useLessons(id);

  useEffect(() => {
    if (!authLoading && !user) router.replace('/auth');
  }, [authLoading, user, router]);

  const loading = authLoading || studentLoading || lessonsLoading;

  const done = lessons.filter((l) => l.status === 'completed').length;
  const total = lessons.length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  return (
    <div className="min-h-dvh pb-24">
      {/* Sticky top bar */}
      <header className="sticky top-0 z-30 border-b border-[var(--color-border)] bg-[color-mix(in_oklab,var(--color-bg)_88%,transparent)] backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-2xl items-center gap-3 px-4">
          <Link
            href="/teacher"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full text-[var(--color-text-mute)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text)]"
            aria-label="Back"
          >
            <ArrowLeft size={18} />
          </Link>
          <Logo size="sm" />
          <span className="ml-2 truncate text-xs uppercase tracking-[0.18em] text-[var(--color-text-dim)]">
            Student file
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 pt-6">
        {loading ? (
          <div className="space-y-3">
            <div className="h-24 animate-pulse rounded-2xl bg-[var(--color-surface)]" />
            <div className="h-3 w-full animate-pulse rounded-full bg-[var(--color-surface)]" />
            <div className="space-y-2 pt-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="h-16 animate-pulse rounded-xl bg-[var(--color-surface)]"
                />
              ))}
            </div>
          </div>
        ) : !student ? (
          <div className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] p-10 text-center">
            <h1 className="font-serif text-3xl">Student not found</h1>
            <p className="mt-2 text-sm text-[var(--color-text-mute)]">
              They may have been removed, or the link is wrong.
            </p>
            <Link href="/teacher" className="mt-6 inline-flex">
              <Button>Back to my students</Button>
            </Link>
          </div>
        ) : (
          <>
            {/* Hero */}
            <section>
              <h1 className="font-serif text-4xl leading-[0.95] text-balance sm:text-5xl">
                {student.name}
              </h1>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-[var(--color-text-mute)]">
                <StudentTypePill student={student} />
                {student.style && <Pill tone="outline">{student.style}</Pill>}
                {student.payment_status === 'overdue' && (
                  <Pill tone="danger">Payment overdue</Pill>
                )}
              </div>

              {/* Wedding date countdown OR private goal */}
              <StudentMeta student={student} />

              {/* Progress */}
              <div className="mt-6">
                <div className="mb-2 flex items-baseline justify-between gap-3">
                  <div className="text-xs uppercase tracking-[0.18em] text-[var(--color-text-dim)]">
                    Package progress
                  </div>
                  <div className="text-xs text-[var(--color-text-mute)]">
                    <span className="text-[var(--color-text)] font-medium">{done}</span>
                    {' of '}
                    <span className="text-[var(--color-text)] font-medium">{total}</span>
                    {' lessons'}
                  </div>
                </div>
                <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-[var(--color-surface-2)]">
                  <div
                    className="absolute inset-y-0 left-0 bg-gradient-to-r from-[var(--color-gold)] to-[var(--color-gold-bright)] transition-[width] duration-500"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            </section>

            {/* Lessons */}
            <section className="mt-8">
              <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-text-dim)]">
                Lessons
              </h2>
              {lessons.length === 0 ? (
                <Card>
                  <CardBody className="text-center text-sm text-[var(--color-text-dim)]">
                    No lesson file has been created for this student yet.
                  </CardBody>
                </Card>
              ) : (
                <div className="space-y-2.5">
                  {lessons.map((l) => (
                    <LessonItem
                      key={l.id}
                      lesson={l}
                      onComplete={() => markComplete(l.id)}
                      onFavourite={() => toggleFavourite(l.id, l.is_favourite)}
                      onNotes={(notes) => updateLesson(l.id, { notes })}
                      onStatus={(status) => updateLesson(l.id, { status })}
                      onPhotosChange={(photo_urls) =>
                        updateLesson(l.id, { photo_urls })
                      }
                    />
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}

function LessonItem({
  lesson,
  onComplete,
  onFavourite,
  onNotes,
  onStatus,
  onPhotosChange,
}: {
  lesson: LessonRow;
  onComplete: () => void;
  onFavourite: () => void;
  onNotes: (notes: string) => void;
  onStatus: (status: LessonStatusDB) => void;
  onPhotosChange: (urls: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(lesson.notes ?? '');
  const [lightbox, setLightbox] = useState<string | null>(null);
  const { uploadPhoto, deletePhoto, uploading, error: photoError } = useLessonPhotos();
  const done = lesson.status === 'completed';
  const dateLabel = (() => {
    if (!lesson.scheduled_date) return 'No date';
    try {
      const parsed = parseISO(lesson.scheduled_date);
      if (isNaN(parsed.getTime())) return lesson.scheduled_date;
      return format(parsed, 'EEE d MMM');
    } catch {
      return lesson.scheduled_date;
    }
  })();
  const photos = lesson.photo_urls ?? [];

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ''; // reset so picking the same file again still fires onChange
    if (!file) return;
    try {
      const url = await uploadPhoto(lesson.id, file);
      onPhotosChange([...photos, url]);
    } catch {
      // hook already set the error message
    }
  }

  async function handleRemovePhoto(url: string) {
    if (!confirm('Remove this photo?')) return;
    onPhotosChange(photos.filter((u) => u !== url));
    try {
      await deletePhoto(url);
    } catch {
      // photo was already removed from the list optimistically; ignore storage errors
    }
  }

  return (
    <div
      className={cn(
        'rounded-xl border transition-colors',
        open
          ? 'border-[var(--color-border-strong)] bg-[var(--color-surface-2)]'
          : 'border-[var(--color-border)] bg-[var(--color-surface)] active:bg-[var(--color-surface-2)]'
      )}
    >
      <div className="grid w-full grid-cols-[auto_2.25rem_minmax(0,1fr)_auto] items-center gap-3 px-3 py-3 sm:px-4">
        <button
          type="button"
          onClick={onFavourite}
          className={cn(
            'inline-flex h-9 w-9 items-center justify-center rounded-full transition-colors',
            lesson.is_favourite
              ? 'text-[var(--color-gold)]'
              : 'text-[var(--color-text-dim)] hover:text-[var(--color-gold)]'
          )}
          aria-label={lesson.is_favourite ? 'Unstar lesson' : 'Star lesson'}
        >
          <Star size={18} fill={lesson.is_favourite ? 'currentColor' : 'none'} />
        </button>

        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="font-serif text-lg tabular-nums text-left text-[var(--color-text-mute)]"
          aria-expanded={open}
        >
          {String(lesson.lesson_number).padStart(2, '0')}
        </button>

        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="min-w-0 text-left"
          aria-expanded={open}
        >
          <span className="block text-sm font-medium text-[var(--color-text)]">
            {dateLabel}
          </span>
          {lesson.notes && !open && (
            <span className="block truncate text-xs text-[var(--color-text-mute)]">
              {lesson.notes}
            </span>
          )}
        </button>

        {done ? (
          <Pill tone="success">Done</Pill>
        ) : lesson.status === 'missed' ? (
          <Pill tone="danger">Missed</Pill>
        ) : (
          <button
            onClick={onComplete}
            className="inline-flex h-9 items-center justify-center gap-1 rounded-full bg-[var(--color-gold)] px-3 text-xs font-semibold text-black shadow-[0_8px_24px_-12px_var(--color-gold-glow)] active:scale-[0.98]"
          >
            <Check size={14} /> Done
          </button>
        )}
      </div>

      {open && (
        <div className="grid gap-3 border-t border-[var(--color-border)] px-3 py-4 sm:px-4">
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={() => draft !== (lesson.notes ?? '') && onNotes(draft)}
            placeholder="What you worked on, what to practise…"
          />

          {/* Photo thumbnail strip */}
          {(photos.length > 0 || uploading) && (
            <div className="-mx-3 flex gap-2 overflow-x-auto px-3 sm:-mx-4 sm:px-4">
              {photos.map((url) => (
                <div key={url} className="relative shrink-0">
                  <button
                    type="button"
                    onClick={() => setLightbox(url)}
                    className="block h-16 w-16 overflow-hidden rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]"
                    aria-label="View photo"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={url}
                      alt=""
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemovePhoto(url)}
                    className="absolute -right-1 -top-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-[var(--color-bg)] text-[var(--color-text-mute)] shadow ring-1 ring-[var(--color-border)] hover:text-[var(--color-danger)]"
                    aria-label="Remove photo"
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
              {uploading && (
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-dim)]">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--color-text-dim)] border-t-transparent" />
                </div>
              )}
            </div>
          )}

          {photoError && (
            <p className="text-xs text-[var(--color-danger)]">{photoError}</p>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <StatusSelector value={lesson.status} onChange={onStatus} />
            <label
              className={cn(
                'ml-auto inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-full border border-[var(--color-border-strong)] bg-transparent px-3 text-xs font-semibold text-[var(--color-text)] transition-colors hover:bg-[var(--color-surface-2)]',
                uploading && 'pointer-events-none opacity-60'
              )}
            >
              <input
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handleFileSelect}
                disabled={uploading}
              />
              <Camera size={14} /> {uploading ? 'Uploading…' : 'Photo'}
            </label>
          </div>
        </div>
      )}

      {/* Lightbox */}
      {lightbox && (
        <button
          type="button"
          onClick={() => setLightbox(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          aria-label="Close photo"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lightbox}
            alt=""
            className="max-h-full max-w-full object-contain"
          />
          <span className="absolute right-4 top-4 inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white">
            <X size={18} />
          </span>
        </button>
      )}
    </div>
  );
}

function StatusSelector({
  value,
  onChange,
}: {
  value: LessonStatusDB;
  onChange: (v: LessonStatusDB) => void;
}) {
  const options: { id: LessonStatusDB; label: string }[] = [
    { id: 'scheduled', label: 'Scheduled' },
    { id: 'completed', label: 'Done' },
    { id: 'missed', label: 'Missed' },
    { id: 'rescheduled', label: 'Resched.' },
  ];
  return (
    <div className="inline-flex rounded-full border border-[var(--color-border)] bg-[var(--color-bg)] p-0.5">
      {options.map((opt) => (
        <button
          key={opt.id}
          onClick={() => onChange(opt.id)}
          className={cn(
            'rounded-full px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] transition-colors',
            value === opt.id
              ? 'bg-[var(--color-surface-2)] text-[var(--color-gold-bright)]'
              : 'text-[var(--color-text-dim)]'
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function StudentTypePill({ student }: { student: StudentRow }) {
  const type = student.student_type ?? 'wedding';
  if (type === 'wedding') {
    return <Pill tone="gold"><Heart size={10} fill="currentColor" /> Wedding</Pill>;
  }
  return <Pill tone="outline"><Target size={10} /> Private</Pill>;
}

function StudentMeta({ student }: { student: StudentRow }) {
  const type = student.student_type ?? 'wedding';

  if (type === 'wedding') {
    if (!student.wedding_date) {
      return (
        <p className="mt-4 text-sm text-[var(--color-text-dim)]">
          No wedding date set yet.
        </p>
      );
    }
    const days = daysUntil(student.wedding_date);
    const countdown = formatCountdown(days);
    const inPast = days < 0;
    // Format defensively — a malformed wedding_date must not crash the page.
    let dateLabel = student.wedding_date;
    try {
      const parsed = parseISO(student.wedding_date);
      if (!isNaN(parsed.getTime())) {
        dateLabel = format(parsed, 'EEEE d MMMM yyyy');
      }
    } catch {
      /* fall back to the raw string */
    }
    return (
      <div className="mt-5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3">
        <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--color-text-dim)]">
          Wedding day
        </div>
        <div className="mt-1 flex flex-wrap items-baseline justify-between gap-2">
          <div className="font-serif text-2xl text-[var(--color-text)]">
            {dateLabel}
          </div>
          <div
            className={cn(
              'text-sm font-semibold',
              inPast
                ? 'text-[var(--color-text-dim)]'
                : 'text-[var(--color-gold-bright)]'
            )}
          >
            {countdown}
          </div>
        </div>
      </div>
    );
  }

  // Private student
  if (!student.goal) {
    return (
      <p className="mt-4 text-sm text-[var(--color-text-dim)]">
        No goal set yet.
      </p>
    );
  }
  return (
    <div className="mt-5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3">
      <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--color-text-dim)]">
        Goal
      </div>
      <p className="mt-1 font-serif text-xl text-[var(--color-text)] text-balance">
        {student.goal}
      </p>
    </div>
  );
}
