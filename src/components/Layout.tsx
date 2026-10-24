import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { BookOpen, Car, ChevronRight, Clock, Info, LogOut, Menu, ScanLine, Search, ThumbsUp, X } from 'lucide-react';
import { useAuth, useStaff } from '../lib/auth';
import { Link, navigate, type Route } from '../lib/router';
import { useVehicle } from '../lib/vehicleStore';
import { vehicleSubtitle, vehicleTitle } from '../lib/vehicle';
import { cx } from './ui';

const NAV = [
  { to: '/', label: 'Vehicle', icon: Car, match: (p: string) => p === '/' || p.startsWith('/vehicle') || ['/recalls', '/problems', '/specs', '/files', '/notes', '/locations'].some((x) => p.startsWith(x)) },
  { to: '/codes', label: 'Codes', icon: ScanLine, match: (p: string) => p.startsWith('/codes') || p.startsWith('/faults') },
  { to: '/fixes', label: 'Fixes', icon: ThumbsUp, match: (p: string) => p.startsWith('/fixes') },
  { to: '/repair', label: 'Repair', icon: BookOpen, match: (p: string) => p.startsWith('/repair') },
  { to: '/labor', label: 'Labor', icon: Clock, match: (p: string) => p.startsWith('/labor') },
];

function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2" aria-label="AP Data home">
      <img src={`${import.meta.env.BASE_URL}logo-128.png`} alt="" className="h-8 w-8 rounded-lg" width={32} height={32} />
      <span className="font-heading text-lg font-bold tracking-tight text-white">
        AP <span className="text-brand">Data</span>
      </span>
    </Link>
  );
}

function UserMenu() {
  const staff = useStaff();
  const { signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', esc);
    };
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-slate-300 hover:bg-white/5"
        aria-label="Menu"
        aria-expanded={open}
      >
        {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>
      {open && (
        <div className="absolute right-0 top-12 z-40 w-64 rounded-2xl border border-white/10 bg-panel-2 p-2 shadow-2xl">
          <div className="px-3 py-2">
            <div className="truncate text-sm font-semibold text-white">{staff.name}</div>
            <div className="truncate text-xs text-slate-500">
              {staff.role === 'admin' ? 'Admin' : 'Technician'} · {staff.email}
            </div>
          </div>
          <div className="my-1 h-px bg-white/10" />
          <MenuLink to="/notes" onClick={() => setOpen(false)}>Shop notes</MenuLink>
          <MenuLink to="/files" onClick={() => setOpen(false)}>Shop files</MenuLink>
          <MenuLink to="/labor/estimate" onClick={() => setOpen(false)}>Labor estimate</MenuLink>
          <MenuLink to="/about" onClick={() => setOpen(false)} icon={<Info className="h-4 w-4" />}>
            About AP Data
          </MenuLink>
          <div className="my-1 h-px bg-white/10" />
          <button
            type="button"
            onClick={() => void signOut()}
            className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm text-slate-300 hover:bg-white/5"
          >
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </div>
      )}
    </div>
  );
}

function MenuLink({ to, children, onClick, icon }: { to: string; children: ReactNode; onClick: () => void; icon?: ReactNode }) {
  return (
    <Link to={to} onClick={onClick} className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm text-slate-300 hover:bg-white/5">
      {icon}
      {children}
    </Link>
  );
}

function VehicleBar() {
  const { vehicle } = useVehicle();
  return (
    <Link
      to="/vehicle"
      className="no-print flex min-h-[48px] items-center gap-3 border-b border-white/10 bg-panel px-4 py-2 hover:bg-panel-2"
    >
      <Car className={cx('h-5 w-5 shrink-0', vehicle ? 'text-brand' : 'text-slate-500')} />
      <div className="min-w-0 flex-1">
        {vehicle ? (
          <>
            <div className="truncate text-sm font-semibold text-white">{vehicleTitle(vehicle)}</div>
            {(vehicleSubtitle(vehicle) || vehicle.vin) && (
              <div className="truncate text-xs text-slate-400">
                {[vehicleSubtitle(vehicle), vehicle.vin].filter(Boolean).join(' · ')}
              </div>
            )}
          </>
        ) : (
          <div className="text-sm font-semibold text-slate-300">Choose a vehicle — VIN or year, make, model</div>
        )}
      </div>
      <span className="flex shrink-0 items-center text-xs font-semibold text-brand-soft">
        {vehicle ? 'Change' : 'Start'} <ChevronRight className="h-4 w-4" />
      </span>
    </Link>
  );
}

export function Layout({ route, children }: { route: Route; children: ReactNode }) {
  const [q, setQ] = useState('');
  const submitSearch = (e: FormEvent) => {
    e.preventDefault();
    const s = q.trim();
    if (s) navigate(`/search?q=${encodeURIComponent(s)}`);
  };

  return (
    <div className="min-h-dvh bg-ink pb-[calc(env(safe-area-inset-bottom)+72px)] md:pb-0">
      <header className="no-print sticky top-0 z-30 border-b border-white/10 bg-ink/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-2">
          <Logo />
          <nav className="ml-4 hidden items-center gap-1 md:flex" aria-label="Sections">
            {NAV.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                className={cx(
                  'rounded-xl px-3 py-2 text-sm font-semibold',
                  n.match(route.path) ? 'bg-brand/15 text-brand-soft' : 'text-slate-300 hover:bg-white/5'
                )}
              >
                {n.label}
              </Link>
            ))}
          </nav>
          <form onSubmit={submitSearch} className="ml-auto hidden max-w-xs flex-1 sm:block" role="search">
            <label className="relative block">
              <span className="sr-only">Search codes, fixes and procedures</span>
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Code, symptom, procedure…"
                className="min-h-[40px] w-full rounded-xl border border-white/10 bg-panel pl-9 pr-3 text-sm text-white placeholder:text-slate-600 focus:border-brand/50 focus:outline-none"
              />
            </label>
          </form>
          <Link
            to="/search"
            className="ml-auto inline-flex h-10 w-10 items-center justify-center rounded-xl text-slate-300 hover:bg-white/5 sm:hidden"
            aria-label="Search"
          >
            <Search className="h-5 w-5" />
          </Link>
          <UserMenu />
        </div>
        <div className="mx-auto max-w-5xl">
          <VehicleBar />
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-5">{children}</main>

      <nav
        className="no-print fixed inset-x-0 bottom-0 z-30 border-t border-white/10 bg-ink/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
        aria-label="Sections"
      >
        <div className="grid grid-cols-5">
          {NAV.map((n) => {
            const active = n.match(route.path);
            const Icon = n.icon;
            return (
              <Link
                key={n.to}
                to={n.to}
                className={cx('flex min-h-[60px] flex-col items-center justify-center gap-1 text-[11px] font-semibold', active ? 'text-brand' : 'text-slate-400')}
                aria-current={active ? 'page' : undefined}
              >
                <Icon className="h-5 w-5" />
                {n.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
