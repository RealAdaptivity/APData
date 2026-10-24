import { useState, type FormEvent, type ReactNode } from 'react';
import { RotateCw, ScanLine, Undo2 } from 'lucide-react';
import { engineRelation, norm, type Vehicle, type VehicleDetail } from '../lib/vehicle';
import {
  engineOptionText,
  loadEngines,
  loadMakes,
  loadModels,
  loadTrims,
  vinCodeText,
  type EngineChoice,
  type MakeChoice,
  type ModelChoice,
  type TrimChoice,
} from '../lib/vehicleCatalog';
import { NO_PICK, resolveStep, stepName, stepValue, upstreamOf, type Named, type Step, type StepPick } from '../lib/pickerSteps';
import { useKeyed } from '../lib/useKeyed';
import { ROAD_YEARS } from '../data/roadMakes';
import { Button, ErrorNote, Field, Input, Select } from './ui';

/**
 * Year → make → model → trim → engine, each a dropdown filled from the
 * vehicle catalog (NHTSA vPIC, checked against EPA): the engine list only
 * holds the engines that model (and trim) came with. Any step can be typed
 * instead, for a vehicle the catalog lacks or when the catalog is unreachable.
 */

const OTHER = '__other__';

const pickOf = (item: Named | null): StepPick => (item ? { id: item.id, name: item.name, manual: false } : NO_PICK);
const remembered = (name: string | undefined): StepPick => (name?.trim() ? { name: name.trim(), manual: false } : NO_PICK);
const sameEngine = (item: EngineChoice, name: string) => norm(item.name) === norm(name) || engineRelation(item.name, name) === 'same';

type StepProps<T extends Named> = {
  label: string;
  step: Step<T>;
  waiting: string;
  loadingText: string;
  placeholder: string;
  optional?: boolean;
  /** Under the dropdown. */
  hint?: ReactNode;
  /** Under the text box when it is typed by choice or because the step above was typed. */
  textHint?: ReactNode;
  options: (items: T[]) => ReactNode;
  onPick: (item: T | null) => void;
  onType: () => void;
  onText: (text: string) => void;
  onBack: () => void;
  onRetry: () => void;
};

function CatalogStep<T extends Named>({
  label,
  step,
  waiting,
  loadingText,
  placeholder,
  optional,
  hint,
  textHint,
  options,
  onPick,
  onType,
  onText,
  onBack,
  onRetry,
}: StepProps<T>) {
  const title = optional ? `${label} (optional)` : label;

  if (step.kind === 'off' || step.kind === 'loading') {
    return (
      <Field label={title}>
        <Select disabled value="" aria-busy={step.kind === 'loading'}>
          <option value="">{step.kind === 'loading' ? loadingText : waiting}</option>
        </Select>
      </Field>
    );
  }

  if (step.kind === 'text') {
    const note =
      step.why === 'error'
        ? 'Could not load the list. Type it in, or try again.'
        : step.why === 'empty'
          ? optional
            ? 'None listed for this vehicle. Type it if you know it.'
            : 'None listed for this vehicle. Type it in.'
          : step.why === 'unlisted'
            ? 'Not in the list for this year. Check it, or pick from the list.'
            : textHint;
    return (
      <div className="space-y-1.5">
        <Field label={title} hint={note}>
          <Input value={step.text} onChange={(e) => onText(e.target.value)} placeholder={placeholder} autoComplete="off" />
        </Field>
        {step.why === 'error' && (
          <button type="button" onClick={onRetry} className="inline-flex items-center gap-1 text-xs font-semibold text-brand-soft hover:underline">
            <RotateCw className="h-3 w-3" /> Load the list again
          </button>
        )}
        {(step.why === 'chosen' || step.why === 'unlisted') && (
          <button type="button" onClick={onBack} className="inline-flex items-center gap-1 text-xs font-semibold text-brand-soft hover:underline">
            <Undo2 className="h-3 w-3" /> Pick from the list
          </button>
        )}
      </div>
    );
  }

  return (
    <Field label={title} hint={hint}>
      <Select
        value={step.value?.id ?? ''}
        onChange={(e) => {
          const v = e.target.value;
          if (v === OTHER) onType();
          else onPick(step.items.find((i) => i.id === v) ?? null);
        }}
      >
        <option value="">{optional ? 'Not sure / skip' : `Select ${label.toLowerCase()}`}</option>
        {options(step.items)}
        <option value={OTHER}>Not listed — type it in</option>
      </Select>
    </Field>
  );
}

const MAKE_GROUPS: [MakeChoice['kind'], string][] = [
  ['light', 'Cars, SUVs, pickups & vans'],
  ['truck', 'Commercial trucks'],
  ['motorcycle', 'Motorcycles'],
  ['rv', 'Motorhomes & RVs'],
  ['other', 'Other makes'],
];

function makeOptions(items: MakeChoice[]) {
  const opts = (list: MakeChoice[]) =>
    list.map((m) => (
      <option key={m.id} value={m.id}>
        {m.name}
      </option>
    ));
  const groups = MAKE_GROUPS.map(([kind, label]) => [label, items.filter((m) => m.kind === kind)] as const).filter(([, list]) => list.length);
  if (groups.length < 2) return opts(items);
  return groups.map(([label, list]) => (
    <optgroup key={label} label={label}>
      {opts(list)}
    </optgroup>
  ));
}

function plainOptions(items: Named[]) {
  return items.map((m) => (
    <option key={m.id} value={m.id}>
      {m.name}
    </option>
  ));
}

function trimOptions(year: string) {
  return (items: TrimChoice[]) => {
    const listed = items.filter((t) => t.kind === 'trim');
    const common = items.filter((t) => t.kind === 'preset');
    if (!common.length) return plainOptions(listed);
    if (!listed.length) return <optgroup label="Common trims — match the badge">{plainOptions(common)}</optgroup>;
    return (
      <>
        <optgroup label={`Listed by NHTSA for ${year}`}>{plainOptions(listed)}</optgroup>
        <optgroup label="Other common trims — match the badge">{plainOptions(common)}</optgroup>
      </>
    );
  };
}

function engineOptions(items: EngineChoice[]) {
  return items.map((e) => (
    <option key={e.id} value={e.id}>
      {engineOptionText(e)}
    </option>
  ));
}

export function VehicleSelects({ initial, onPick }: { initial: Vehicle | null; onPick: (v: Vehicle) => void }) {
  const [year, setYear] = useState(initial?.year ?? '');
  const [make, setMake] = useState<StepPick>(() => remembered(initial?.make));
  const [model, setModel] = useState<StepPick>(() => remembered(initial?.model));
  const [trim, setTrim] = useState<StepPick>(() => remembered(initial?.trim));
  const [engine, setEngine] = useState<StepPick>(() => remembered(initial?.engine));
  const [error, setError] = useState<string | null>(null);

  const yearOk = /^\d{4}$/.test(year);
  // 2000–2027; a vehicle picked earlier from another year stays selectable.
  const years = initial?.year && !ROAD_YEARS.includes(initial.year) ? [...ROAD_YEARS, initial.year] : ROAD_YEARS;

  const makes = useKeyed(yearOk ? `makes|${year}` : null, () => loadMakes(year));
  const makeStep = resolveStep(make, makes, yearOk ? 'list' : 'off');
  const makeChoice = stepValue(makeStep);

  const models = useKeyed(makeChoice ? `models|${year}|${makeChoice.source}|${makeChoice.id}` : null, () => loadModels(year, makeChoice!));
  const modelStep = resolveStep(model, models, upstreamOf(makeStep));
  const modelChoice: ModelChoice | null = stepValue(modelStep);

  const modelKey = makeChoice && modelChoice ? `${year}|${makeChoice.source}|${makeChoice.id}|${modelChoice.source}|${modelChoice.id}` : null;
  const trims = useKeyed(modelKey && `trims|${modelKey}`, () => loadTrims(year, makeChoice!, modelChoice!));
  const trimStep = resolveStep(trim, trims, upstreamOf(modelStep));
  const trimChoice = stepValue(trimStep);

  const siblings = models.data?.map((m) => m.name) ?? [];
  const engineList = useKeyed(modelKey && `engines|${modelKey}|${trimChoice?.id ?? ''}`, () =>
    loadEngines(year, makeChoice!, modelChoice!, trimChoice, siblings)
  );
  const engineStep = resolveStep(
    engine,
    { ...engineList, data: engineList.data?.engines },
    upstreamOf(modelStep),
    { same: sameEngine, autoSingle: true }
  );
  const engineChoice = stepValue(engineStep);

  const modelName = stepName(modelStep);
  const engines = engineList.data?.engines ?? [];
  const vinTip = engines.some((e) => e.vinCode) ? ' Match the VIN’s 8th digit.' : '';
  const engineHint = engineList.data?.checked
    ? `Only the engines EPA lists for the ${year} ${modelName}.${vinTip}`
    : `Every engine NHTSA lists for this model.${vinTip}`;
  const trimHint =
    trimStep.kind === 'list' && trimStep.items.some((t) => t.kind === 'preset')
      ? '“Common trims” are not checked against the year. Match the badge on the vehicle.'
      : undefined;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const makeName = stepName(makeStep);
    if (!yearOk || !makeName || !modelName) {
      setError('Pick the year, make and model.');
      return;
    }
    setError(null);
    const details: VehicleDetail[] = [];
    if (engineChoice?.vinCode) details.push({ label: 'Engine code (VIN 8th digit)', value: vinCodeText(engineChoice.vinCode) });
    if (engineChoice?.drives?.length) details.push({ label: 'Engine sold with', value: engineChoice.drives.join(', ') });
    onPick({
      year,
      make: makeName,
      model: modelName,
      trim: stepName(trimStep) || undefined,
      engine: stepName(engineStep) || undefined,
      details: details.length ? details : undefined,
    });
  };

  // Typing a name keeps whether the step was switched to typing; the list id no longer applies.
  const typed = (set: (p: StepPick) => void, current: StepPick) => (text: string) => set({ name: text, manual: current.manual });

  // A remembered name (the vehicle picked before) is pinned to the entry it matched before a
  // step above changes, so a new list that lacks it clears the step instead of turning it into
  // a text box.
  const pin = (p: StepPick, v: Named | null): StepPick => (!p.id && !p.manual && p.name && v ? pickOf(v) : p);

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Year">
          <Select
            value={year}
            onChange={(e) => {
              setMake((p) => pin(p, makeChoice));
              setModel((p) => pin(p, modelChoice));
              setTrim((p) => pin(p, trimChoice));
              setEngine((p) => pin(p, engineChoice));
              setYear(e.target.value);
            }}
          >
            <option value="">Year</option>
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </Select>
        </Field>
        <CatalogStep
          label="Make"
          step={makeStep}
          waiting="Pick the year first"
          loadingText="Loading makes…"
          placeholder="Ford"
          textHint="Typed by hand."
          options={makeOptions}
          onPick={(m) => {
            setMake(pickOf(m));
            setModel(NO_PICK);
            setTrim(NO_PICK);
            setEngine(NO_PICK);
          }}
          onType={() => {
            setMake({ name: '', manual: true });
            setModel(NO_PICK);
            setTrim(NO_PICK);
            setEngine(NO_PICK);
          }}
          onText={typed(setMake, make)}
          onBack={() => setMake(NO_PICK)}
          onRetry={makes.reload}
        />
      </div>
      {makeChoice?.kind === 'rv' && (
        <p className="text-xs text-slate-400">
          This is the coach builder. For engine, transmission or brake work, pick the chassis maker instead (Ford, Chevrolet, Freightliner, Spartan, Workhorse) — the chassis VIN is on the frame or the driver’s door pillar.
        </p>
      )}
      <CatalogStep
        label="Model"
        step={modelStep}
        waiting="Pick the make first"
        loadingText="Loading models…"
        placeholder="F-150"
        textHint="As NHTSA writes it, so recalls match: F-150, Silverado 1500, Camry, CR-V."
        options={plainOptions}
        onPick={(m) => {
          setModel(pickOf(m));
          setTrim(NO_PICK);
          setEngine(NO_PICK);
        }}
        onType={() => {
          setModel({ name: '', manual: true });
          setTrim(NO_PICK);
          setEngine(NO_PICK);
        }}
        onText={typed(setModel, model)}
        onBack={() => setModel(NO_PICK)}
        onRetry={models.reload}
      />
      <CatalogStep
        label="Trim"
        optional
        step={trimStep}
        waiting="Pick the model first"
        loadingText="Loading trims…"
        placeholder="Limited, Sport, XLT…"
        hint={trimHint}
        textHint="As on the badge: Limited, Sport, XLT, LT."
        options={trimOptions(year)}
        onPick={(t) => {
          setEngine((p) => pin(p, engineChoice));
          setTrim(pickOf(t));
        }}
        onType={() => setTrim({ name: '', manual: true })}
        onText={typed(setTrim, trim)}
        onBack={() => setTrim(NO_PICK)}
        onRetry={trims.reload}
      />
      <CatalogStep
        label="Engine"
        optional
        step={engineStep}
        waiting="Pick the model first"
        loadingText="Loading engines…"
        placeholder="3.5L V6 Turbo"
        hint={engineHint}
        textHint="Helps match fixes and specs: 3.5L V6 Turbo, 5.3L V8, 2.0L I4."
        options={engineOptions}
        onPick={(en) => setEngine(en ? pickOf(en) : { ...NO_PICK, touched: true })}
        onType={() => setEngine({ name: '', manual: true })}
        onText={typed(setEngine, engine)}
        onBack={() => setEngine(NO_PICK)}
        onRetry={engineList.reload}
      />
      {error && <ErrorNote message={error} />}
      <Button type="submit" variant="primary" icon={<ScanLine className="h-4 w-4" />} className="w-full">
        Use this vehicle
      </Button>
      <p className="text-xs text-slate-500">Lists from NHTSA’s vehicle catalog, with engines checked against EPA fueleconomy.gov.</p>
    </form>
  );
}
