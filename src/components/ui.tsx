import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';
import { AlertTriangle, ArrowLeft, Info, LoaderCircle, RotateCw } from 'lucide-react';
import { goBack, Link } from '../lib/router';

/**
 * Shared building blocks. Sized for a phone held in a gloved hand: 44px tap
 * targets, high contrast on the near-black background, the brand orange for
 * the one thing to press.
 */

export function cx(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(' ');
}

export function Page({
  title,
  subtitle,
  back,
  actions,
  children,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  /** Where the back arrow goes when there is no history (a link opened cold). */
  back?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="space-y-4">
      <header className="flex items-start gap-3">
        {back && (
          <button
            type="button"
            onClick={() => goBack(back)}
            className="no-print -ml-1 mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-slate-300 hover:bg-white/5"
            aria-label="Back"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
        )}
        <div className="min-w-0 flex-1">
          <h1 className="font-heading text-xl font-bold leading-tight text-white sm:text-2xl">{title}</h1>
          {subtitle && <div className="mt-1 text-sm text-slate-400">{subtitle}</div>}
        </div>
        {actions && <div className="no-print flex shrink-0 items-center gap-2">{actions}</div>}
      </header>
      {children}
    </div>
  );
}

export function Card({ children, className, as = 'section' }: { children: ReactNode; className?: string; as?: 'section' | 'div' | 'article' }) {
  const Tag = as;
  return <Tag className={cx('rounded-2xl border border-white/10 bg-panel p-4', className)}>{children}</Tag>;
}

export function Section({
  title,
  aside,
  children,
  className,
}: {
  title: ReactNode;
  aside?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Card className={cx('space-y-3', className)}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-sm font-bold uppercase tracking-wide text-slate-200">{title}</h2>
        {aside && <div className="text-xs text-slate-500">{aside}</div>}
      </div>
      {children}
    </Card>
  );
}

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

const VARIANT: Record<Variant, string> = {
  primary: 'bg-brand text-white hover:bg-brand-soft disabled:bg-brand/40',
  secondary: 'border border-white/15 bg-white/5 text-slate-100 hover:bg-white/10 disabled:text-slate-500',
  ghost: 'text-slate-300 hover:bg-white/5 disabled:text-slate-600',
  danger: 'border border-red-500/40 text-red-300 hover:bg-red-500/10 disabled:text-red-300/40',
};

export function buttonClass(variant: Variant = 'secondary', size: 'md' | 'sm' = 'md'): string {
  return cx(
    'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl font-semibold transition-colors disabled:cursor-not-allowed',
    size === 'md' ? 'min-h-[44px] px-4 text-sm' : 'min-h-[36px] px-3 text-xs',
    VARIANT[variant]
  );
}

export function Button({
  variant = 'secondary',
  size = 'md',
  icon,
  loading,
  children,
  className,
  disabled,
  type = 'button',
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: 'md' | 'sm';
  icon?: ReactNode;
  loading?: boolean;
}) {
  return (
    <button type={type} className={cx(buttonClass(variant, size), className)} disabled={disabled || loading} {...rest}>
      {loading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : icon}
      {children}
    </button>
  );
}

export function LinkButton({
  to,
  variant = 'secondary',
  size = 'md',
  icon,
  children,
  className,
}: {
  to: string;
  variant?: Variant;
  size?: 'md' | 'sm';
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Link to={to} className={cx(buttonClass(variant, size), className)}>
      {icon}
      {children}
    </Link>
  );
}

const fieldBase =
  'w-full rounded-xl border border-white/15 bg-ink px-3 text-[15px] text-white placeholder:text-slate-600 focus:border-brand/60 focus:outline-none focus:ring-2 focus:ring-brand/30 disabled:opacity-60';

export function Input({ className, ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cx(fieldBase, 'min-h-[44px]', className)} {...rest} />;
}

export function Textarea({ className, rows = 3, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea rows={rows} className={cx(fieldBase, 'py-2.5 leading-relaxed', className)} {...rest} />;
}

export function Select({ className, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cx(fieldBase, 'min-h-[44px] appearance-auto', className)} {...rest}>
      {children}
    </select>
  );
}

export function Field({
  label,
  hint,
  children,
  className,
}: {
  label: ReactNode;
  hint?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={cx('block space-y-1.5', className)}>
      <span className="block text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</span>
      {children}
      {hint && <span className="block text-xs text-slate-500">{hint}</span>}
    </label>
  );
}

type Tone = 'orange' | 'green' | 'red' | 'amber' | 'blue' | 'slate';

const TONE: Record<Tone, string> = {
  orange: 'bg-brand/15 text-brand-soft border-brand/30',
  green: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  red: 'bg-red-500/15 text-red-300 border-red-500/30',
  amber: 'bg-amber-500/15 text-amber-200 border-amber-500/30',
  blue: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
  slate: 'bg-white/5 text-slate-300 border-white/10',
};

export function Badge({ tone = 'slate', children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-semibold',
        TONE[tone],
        className
      )}
    >
      {children}
    </span>
  );
}

export function Loading({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex items-center gap-2 py-6 text-sm text-slate-400" role="status">
      <LoaderCircle className="h-4 w-4 animate-spin text-brand" />
      {label}
    </div>
  );
}

export function ErrorNote({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex items-start gap-3 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
      <div className="min-w-0 flex-1">{message}</div>
      {onRetry && (
        <button type="button" onClick={onRetry} className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-red-100 underline">
          <RotateCw className="h-3 w-3" /> Retry
        </button>
      )}
    </div>
  );
}

export function Notice({ tone = 'slate', children, icon }: { tone?: 'slate' | 'amber' | 'blue'; children: ReactNode; icon?: ReactNode }) {
  const cls =
    tone === 'amber'
      ? 'border-amber-500/30 bg-amber-500/10 text-amber-100'
      : tone === 'blue'
        ? 'border-sky-500/30 bg-sky-500/10 text-sky-100'
        : 'border-white/10 bg-white/[0.03] text-slate-300';
  return (
    <div className={cx('flex items-start gap-2.5 rounded-xl border p-3 text-[13px] leading-relaxed', cls)}>
      <span className="mt-0.5 shrink-0">{icon ?? <Info className="h-4 w-4" />}</span>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

export function Empty({ icon, title, children, action }: { icon?: ReactNode; title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-white/15 px-4 py-8 text-center">
      {icon && <div className="text-slate-500">{icon}</div>}
      <div className="text-sm font-semibold text-slate-200">{title}</div>
      {children && <div className="max-w-md text-[13px] text-slate-400">{children}</div>}
      {action && <div className="pt-2">{action}</div>}
    </div>
  );
}

export function CodeChip({ code }: { code: string }) {
  return (
    <Link
      to={`/codes/${code}`}
      className="inline-flex items-center rounded-lg border border-brand/30 bg-brand/10 px-2 py-0.5 font-mono text-xs font-bold text-brand-soft hover:bg-brand/20"
    >
      {code}
    </Link>
  );
}

/** "Oct 3, 2026". */
export function shortDate(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = /^\d{4}-\d{2}-\d{2}$/.test(iso) ? new Date(`${iso}T12:00:00`) : new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function Stat({ label, value, tone }: { label: string; value: ReactNode; tone?: 'red' | 'amber' | 'green' }) {
  const color = tone === 'red' ? 'text-red-300' : tone === 'amber' ? 'text-amber-200' : tone === 'green' ? 'text-emerald-300' : 'text-white';
  return (
    <div className="rounded-xl border border-white/10 bg-ink/60 px-3 py-2">
      <div className={cx('font-heading text-lg font-bold', color)}>{value}</div>
      <div className="text-[11px] uppercase tracking-wide text-slate-500">{label}</div>
    </div>
  );
}
