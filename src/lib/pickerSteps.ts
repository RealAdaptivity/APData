/**
 * How each step of the year / make / model / trim / engine picker shows:
 * a dropdown, a text box, or a disabled box waiting on the step above.
 *
 * A step is a dropdown when its list loaded and the tech has not chosen to
 * type. It falls back to a text box when the list failed, came back empty,
 * or the step above was typed (no list can follow a typed make), so a vehicle
 * the catalog lacks can still be entered.
 *
 * No React here, so the node test runner loads it directly (tests/catalog.test.ts).
 */
import { norm } from './vehicle.ts';

/**
 * What the tech chose at one step. `id` is set when it came from the list.
 * A name alone (a vehicle picked earlier) is matched against the list when it
 * loads. `touched` marks a deliberate "not sure", so a one-item list is not
 * chosen for them.
 */
export type StepPick = { id?: string; name: string; manual: boolean; touched?: boolean };

export const NO_PICK: StepPick = { name: '', manual: false };

export type Named = { id: string; name: string };

export type ListState<T> = { data: T[] | undefined; error: string | null; loading: boolean };

export type TextReason = 'chosen' | 'upstream' | 'error' | 'empty' | 'unlisted';

export type Step<T extends Named> =
  | { kind: 'off' }
  | { kind: 'loading' }
  | { kind: 'list'; items: T[]; value: T | null }
  | { kind: 'text'; text: string; why: TextReason };

/** What the step above leaves for this one: a list to load, only typing, or nothing yet. */
export type Upstream = 'list' | 'text' | 'off';

const sameName = (item: Named, name: string) => norm(item.name) === norm(name);

export function resolveStep<T extends Named>(
  pick: StepPick,
  list: ListState<T>,
  upstream: Upstream,
  opts: { same?: (item: T, name: string) => boolean; autoSingle?: boolean } = {}
): Step<T> {
  if (upstream === 'off') return { kind: 'off' };
  if (upstream === 'text') return { kind: 'text', text: pick.name, why: 'upstream' };
  if (pick.manual) return { kind: 'text', text: pick.name, why: 'chosen' };
  if (list.loading) return { kind: 'loading' };
  if (list.error) return { kind: 'text', text: pick.name, why: 'error' };
  const items = list.data ?? [];
  if (!items.length) return { kind: 'text', text: pick.name, why: 'empty' };

  const same = opts.same ?? sameName;
  let value = (pick.id ? items.find((i) => i.id === pick.id) : undefined) ?? (pick.name ? items.find((i) => same(i, pick.name)) : undefined) ?? null;
  // A remembered name the list lacks stays as typed text rather than vanishing.
  if (!value && pick.name && !pick.id) return { kind: 'text', text: pick.name, why: 'unlisted' };
  if (!value && opts.autoSingle && !pick.touched && items.length === 1) value = items[0];
  return { kind: 'list', items, value };
}

/** What a step hands the next one. */
export function upstreamOf(step: Step<Named>): Upstream {
  if (step.kind === 'list') return step.value ? 'list' : 'off';
  if (step.kind === 'text') return step.text.trim() ? 'text' : 'off';
  return 'off';
}

/** The chosen or typed name at a step, '' when none. */
export function stepName(step: Step<Named>): string {
  if (step.kind === 'list') return step.value?.name ?? '';
  if (step.kind === 'text') return step.text.trim();
  return '';
}

export function stepValue<T extends Named>(step: Step<T>): T | null {
  return step.kind === 'list' ? step.value : null;
}
