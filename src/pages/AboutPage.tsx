import { CheckCircle2, CircleAlert, Database } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAsync } from '../lib/useAsync';
import { isMissingSchema } from '../lib/errors';
import { ARTICLES } from '../data/articles';
import { DTC_ENTRIES } from '../data/dtcLibrary';
import { MAKE_DTC_ENTRIES } from '../data/dtcMakeCodes';
import { FAULTS } from '../data/faults';
import { COMPONENT_LOCATIONS } from '../data/locations';
import { LABOR_JOBS } from '../data/laborJobs';
import { Card, Page, Section } from '../components/ui';

const TABLES = ['repair_fixes', 'repair_procedures', 'vehicle_specs', 'labor_times', 'repair_files', 'dtc_definitions', 'vehicle_notes'] as const;

async function tableStatus(): Promise<{ table: string; ok: boolean; missing: boolean }[]> {
  return Promise.all(
    TABLES.map(async (table) => {
      const { error } = await supabase.from(table).select('id', { head: true, count: 'exact' }).limit(1);
      return { table, ok: !error, missing: isMissingSchema(error) };
    })
  );
}

export function AboutPage() {
  const status = useAsync(() => tableStatus(), []);
  return (
    <Page title="About AP Data" back="/">
      <Card className="space-y-2 text-[14px] leading-relaxed text-slate-300">
        <p>
          AP Data is Adaptivity Performance’s own repair-information system: one place for a tech to look up a vehicle, read what its codes mean, see what fixed it last time, and
          know how long the job takes.
        </p>
      </Card>

      <Section title="Where the information comes from">
        <ul className="space-y-3 text-[14px] text-slate-300">
          <li>
            <span className="font-semibold text-white">NHTSA</span> — VIN decoding, safety recalls and owner complaints, free public data from the U.S. National Highway Traffic Safety Administration, looked up live.
          </li>
          <li>
            <span className="font-semibold text-white">AP Data library</span> — {DTC_ENTRIES.length} generic trouble codes (engine, ABS and chassis, body and network) and {MAKE_DTC_ENTRIES.length} make-specific ABS, body and network codes for Ford, GM, Toyota, Chrysler, Nissan and Hyundai/Kia; {FAULTS.length} faults to diagnose without a code; {COMPONENT_LOCATIONS.length} component locations; {ARTICLES.length} diagnostic tests and procedures; and a {LABOR_JOBS.length}-job labor catalog, written for AP Data from general shop practice.
          </li>
          <li>
            <span className="font-semibold text-white">Adaptivity techs</span> — confirmed fixes, shop procedures, specs, labor times, photos and notes, added by the techs who did the work. This part grows every week the shop uses it.
          </li>
        </ul>
      </Section>

      <Section title="What it does not include">
        <p className="text-[14px] leading-relaxed text-slate-300">
          Factory (OEM) repair manuals, wiring diagrams, published labor-guide times and other services’ fix databases are licensed by the automakers and by ALLDATA, Mitchell 1 and Identifix. AP Data does not copy them. For a factory wiring diagram or torque spec, use the manufacturer’s service site or a licensed subscription — then record the figure in Specs so the next tech has it.
        </p>
      </Section>

      <Section title="Database">
        {status.loading && <p className="text-[13px] text-slate-400">Checking…</p>}
        <ul className="space-y-1.5">
          {status.data?.map((t) => (
            <li key={t.table} className="flex items-center gap-2 text-[13px]">
              {t.ok ? <CheckCircle2 className="h-4 w-4 text-emerald-400" /> : <CircleAlert className="h-4 w-4 text-amber-300" />}
              <span className="font-mono text-slate-300">{t.table}</span>
              <span className="text-slate-500">{t.ok ? 'ready' : t.missing ? 'not created yet — apply the AP Data migration' : 'not reachable'}</span>
            </li>
          ))}
        </ul>
        <p className="flex items-center gap-2 text-[11px] text-slate-500">
          <Database className="h-3.5 w-3.5" /> Supabase project shared with the Adaptivity website and apps. Staff-only access is enforced by the database.
        </p>
      </Section>
    </Page>
  );
}
