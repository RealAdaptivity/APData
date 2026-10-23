import { useEffect, useSyncExternalStore, type AnchorHTMLAttributes, type ReactNode } from 'react';
import { parseRoute, readHash, type Route } from './route.ts';

export { parseRoute, type Route };

/**
 * Hash routing: #/codes/P0300?from=fix. The whole app is one index.html, so it
 * works on GitHub Pages (which has no rewrite rules) at any base path, and a
 * link a tech texts to another tech opens the same screen.
 */

function subscribe(cb: () => void) {
  window.addEventListener('hashchange', cb);
  return () => window.removeEventListener('hashchange', cb);
}

export function useRoute(): Route {
  const hash = useSyncExternalStore(subscribe, readHash, () => '/');
  const path = hash.split('?')[0];
  // A new screen starts at the top; a changed query on the same screen keeps its place.
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [path]);
  return parseRoute(hash);
}

/** "/codes/P0300" → "#/codes/P0300". */
export function href(path: string): string {
  return `#${path.startsWith('/') ? path : `/${path}`}`;
}

export function navigate(path: string, opts: { replace?: boolean } = {}) {
  const target = href(path);
  if (opts.replace) {
    window.history.replaceState(null, '', target);
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  } else {
    window.location.hash = target;
  }
}

export function goBack(fallback: string) {
  if (window.history.length > 1) window.history.back();
  else navigate(fallback);
}

type LinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> & { to: string; children: ReactNode };

export function Link({ to, children, ...rest }: LinkProps) {
  return (
    <a href={href(to)} {...rest}>
      {children}
    </a>
  );
}
