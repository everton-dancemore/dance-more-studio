'use client';

import { useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LogOut, ChevronRight, Search, Star } from 'lucide-react';
import { Logo } from '@/components/brand/Logo';
import { Pill } from '@/components/ui/Pill';
import { useAuth } from '@/hooks/useAuth';
import { useStudents } from '@/hooks/useStudents';
import type { StudentRow } from '@/lib/db-types';
import { daysUntil, formatCountdown } from '@/lib/countdown';
import { useState } from 'react';

export default function TeacherViewPage() {
  const router = useRouter();
  const { user, profile, loading: authLoading, signOut } = useAuth();
  const { students, loading: studentsLoading } = useStudents({
    teacherId: profile?.teacher_id,
  });
  const [query, setQuery] = useState('');
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) router.replace('/auth');
  }, [authLoading, user, router]);

  const { active, completed } = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = q
      ? students.filter((s) => s.name.toLowerCase().includes(q))
      : students;
    return {
      active: filtered.filter((s) => (s.status ?? 'active') !== 'completed'),
      completed: filtered.filter((s) => s.status === 'completed'),
    };
  }, [students, query]);

  const loading = authLoading || studentsLoading;

  return (
    <div className="min-h-dvh pb-24">
      {/* Top bar — mobile-first */}
      <header className="sticky top-0 z-30 border-b border-[var(--color-border)] bg-[color-mix(in_oklab,var(--color-bg)_88%,transparent)] backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-2xl items-center gap-3 px-4">
          <Logo size="sm" />
          <span className="text-xs uppercase tracking-[0.18em] text-[var(--color-text-dim)]">
            Teacher
          </span>
          <button
            onClick={async () => {
              if (signingOut) return;
              setSigningOut(true);
              try {
                await signOut();
              } catch (error) {
                console.error('Sign out failed:', error);
              }
              // Hard navigation — more reliable than router.replace on iOS PWA.
              window.location.replace('/auth');
            }}
            disabled={signingOut}
            className="ml-auto inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-xs text-[var(--color-text-mute)] hover:text-[var(--color-text)] disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
            aria-label="Sign out"
          >
            <LogOut size={14} /> {signingOut ? 'Signing out…' : 'Sign out'}
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 pt-6">
        <div className="mb-6">
          <h1 className="font-serif text-4xl leading-[0.95] sm:text-5xl">
            {greetingFor(profile?.full_name)}
          </h1>
          <p className="mt-2 text-sm text-[var(--color-text-mute)]">
            {students.length === 0
              ? 'No students assigned yet.'
              : `${active.length} active · ${completed.length} completed`}
          </p>
        </div>

        {/* Search — taller, finger-friendly */}
        <div className="relative mb-6">
          <Search
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-dim)]"
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search students"
            className="h-12 w-full rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] pl-10 pr-4 text-base text-[var(--color-text)] placeholder:text-[var(--color-text-dim)] focus:border-[var(--color-gold)] focus:outline-none focus:ring-2 focus:ring-[var(--color-gold-soft)]"
          />
        </div>

        {loading ? (
          <SkeletonList />
        ) : students.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            <Section title="Active" count={active.length}>
              {active.map((s) => (
                <StudentCard key={s.id} student={s} />
              ))}
              {active.length === 0 && (
                <p className="px-4 py-6 text-center text-sm text-[var(--color-text-dim)]">
                  No active students match.
                </p>
              )}
            </Section>

            {completed.length > 0 && (
              <Section title="Completed" count={completed.length} muted>
                {completed.map((s) => (
                  <StudentCard key={s.id} student={s} muted />
                ))}
              </Section>
            )}
          </>
        )}
      </main>
    </div>
  );
}

function greetingFor(name?: string | null) {
  const first = (name ?? '').split(' ')[0] || 'Welcome';
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  return name ? `${greeting}, ${first}.` : 'Your students.';
}

function Section({
  title,
  count,
  muted,
  children,
}: {
  title: string;
  count: number;
  muted?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-8">
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-text-dim)]">
          {title}
        </h2>
        <span
          className={`text-xs ${
            muted ? 'text-[var(--color-text-dim)]' : 'text-[var(--color-text-mute)]'
          }`}
        >
          {count}
        </span>
      </div>
      <div className="space-y-2.5">{children}</div>
    </section>
  );
}

function StudentCard({ student, muted }: { student: StudentRow; muted?: boolean }) {
  const remaining = student.lessons_remaining ?? null;
  const total = student.lessons_total ?? null;
  const done = total !== null && remaining !== null ? total - remaining : null;
  const pct = total && total > 0 ? Math.round(((done ?? 0) / total) * 100) : 0;

  // Type-aware secondary line: wedding countdown or goal preview
  const type = student.student_type ?? 'wedding';
  const isWedding = type === 'wedding';
  const days = isWedding && student.wedding_date ? daysUntil(student.wedding_date) : null;
  const countdown = days !== null ? formatCountdown(days) : null;
  const countdownClass =
    days !== null && days < 0
      ? 'text-[var(--color-text-dim)]'
      : 'text-[var(--color-gold-bright)]';

  return (
    <Link
      href={`/teacher/students/${student.id}`}
      className={`group flex items-center gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 transition-colors hover:border-[var(--color-border-strong)] active:bg-[var(--color-surface-2)] ${
        muted ? 'opacity-70' : ''
      }`}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h3 className="truncate font-serif text-xl leading-tight">{student.name}</h3>
          {countdown ? (
            <span className={`hidden shrink-0 text-xs font-medium sm:inline ${countdownClass}`}>
              · {countdown}
            </span>
          ) : !isWedding && student.goal ? (
            <span className="hidden truncate text-xs text-[var(--color-text-dim)] sm:inline">
              · {student.goal}
            </span>
          ) : student.style ? (
            <span className="hidden text-xs text-[var(--color-text-dim)] sm:inline">
              · {student.style}
            </span>
          ) : null}
        </div>

        {/* On mobile, surface countdown/goal on its own line under the name */}
        {(countdown || (!isWedding && student.goal)) && (
          <div className="mt-0.5 sm:hidden">
            {countdown ? (
              <span className={`text-xs font-medium ${countdownClass}`}>{countdown}</span>
            ) : (
              <span className="block truncate text-xs text-[var(--color-text-dim)]">
                {student.goal}
              </span>
            )}
          </div>
        )}

        <div className="mt-2 flex items-center gap-3">
          {total ? (
            <div className="flex items-center gap-2 text-xs text-[var(--color-text-mute)]">
              <span>
                <span className="font-medium text-[var(--color-text)]">{done ?? 0}</span>
                <span className="text-[var(--color-text-dim)]"> / {total}</span>
              </span>
              <span className="relative h-1 w-20 overflow-hidden rounded-full bg-[var(--color-surface-2)]">
                <span
                  className="absolute inset-y-0 left-0 bg-gradient-to-r from-[var(--color-gold)] to-[var(--color-gold-bright)]"
                  style={{ width: `${pct}%` }}
                />
              </span>
            </div>
          ) : (
            <span className="text-xs text-[var(--color-text-dim)]">No lesson file yet</span>
          )}
          {student.payment_status === 'overdue' && (
            <Pill tone="danger">Overdue</Pill>
          )}
        </div>
      </div>
      <ChevronRight
        size={18}
        className="shrink-0 text-[var(--color-text-dim)] transition-transform group-hover:translate-x-0.5 group-hover:text-[var(--color-gold)]"
      />
    </Link>
  );
}

function SkeletonList() {
  return (
    <div className="space-y-2.5">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="h-20 animate-pulse rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]"
        />
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="mt-8 rounded-3xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] p-10 text-center">
      <Star
        size={24}
        className="mx-auto mb-4 fill-[var(--color-gold)] stroke-[var(--color-gold)]"
      />
      <h2 className="font-serif text-2xl">No students yet</h2>
      <p className="mt-2 text-sm text-[var(--color-text-mute)]">
        You&apos;ll see your assigned couples here once your studio adds them.
      </p>
    </div>
  );
}
