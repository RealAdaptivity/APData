/**
 * Parsing the URL hash into a route. No imports, so the node test runner
 * loads it directly; the React hooks live in router.tsx.
 */

export type Route = { path: string; parts: string[]; query: URLSearchParams };

export function readHash(): string {
  const loc = (globalThis as { location?: { hash: string } }).location;
  const raw = loc ? loc.hash.replace(/^#/, '') : '';
  return raw.startsWith('/') ? raw : `/${raw}`;
}

export function parseRoute(hash: string): Route {
  const [pathPart, queryPart = ''] = hash.split('?');
  const path = pathPart.replace(/\/+$/, '') || '/';
  const parts = path
    .split('/')
    .filter(Boolean)
    .map((p) => {
      try {
        return decodeURIComponent(p);
      } catch {
        return p;
      }
    });
  return { path, parts, query: new URLSearchParams(queryPart) };
}

