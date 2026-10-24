import type { ReactNode } from 'react';
import type { LocationView, Spot } from '../data/locations';

/**
 * Five schematic views of a generic vehicle, drawn for AP Data, with the
 * component's usual spot marked. They show where to look, not a factory
 * diagram: proportions are typical, and each component's notes say what
 * varies. The drawing space is 400 × 260.
 */

const part = 'fill-white/[0.04] stroke-slate-600';
const faint = 'fill-none stroke-slate-700';
const label = 'fill-slate-500 text-[9px] font-semibold uppercase tracking-wide';

function T({ x, y, children, anchor = 'middle', rotate }: { x: number; y: number; children: ReactNode; anchor?: 'start' | 'middle' | 'end'; rotate?: number }) {
  return (
    <text x={x} y={y} textAnchor={anchor} className={label} transform={rotate ? `rotate(${rotate} ${x} ${y})` : undefined}>
      {children}
    </text>
  );
}

function Bay() {
  return (
    <>
      <rect x={30} y={8} width={340} height={244} rx={30} className={faint} strokeWidth={1.5} />
      <rect x={60} y={12} width={280} height={12} rx={6} className={part} />
      <rect x={90} y={30} width={220} height={16} rx={3} className={part} />
      <T x={200} y={41}>Radiator</T>
      <rect x={46} y={52} width={52} height={40} rx={4} className={part} />
      <T x={72} y={75}>Battery</T>
      <rect x={296} y={36} width={54} height={40} rx={8} className={part} />
      <T x={323} y={60}>Air box</T>
      <rect x={306} y={80} width={46} height={28} rx={3} className={part} />
      <T x={329} y={97}>Fuses</T>
      <rect x={46} y={104} width={34} height={30} rx={6} className={part} />
      <T x={63} y={122}>Washer</T>
      <rect x={130} y={76} width={140} height={130} rx={10} className={part} />
      <rect x={150} y={96} width={100} height={60} rx={8} className={faint} />
      <T x={200} y={130}>Intake</T>
      <T x={200} y={194}>Engine</T>
      <rect x={92} y={120} width={38} height={70} rx={6} className={part} />
      <T x={111} y={158} rotate={-90}>Transaxle</T>
      <rect x={270} y={92} width={18} height={98} rx={4} className={part} />
      <T x={279} y={142} rotate={-90}>Belt end</T>
      <rect x={314} y={136} width={34} height={28} rx={6} className={part} />
      <T x={331} y={154}>Coolant</T>
      <circle cx={68} cy={176} r={16} className={part} />
      <circle cx={332} cy={190} r={16} className={part} />
      <rect x={76} y={206} width={36} height={18} rx={4} className={part} />
      <T x={94} y={218}>Brake</T>
      <rect x={40} y={228} width={320} height={16} rx={4} className={part} />
      <T x={200} y={240}>Firewall / cowl</T>
      <T x={200} y={6} anchor="middle">Front</T>
      <T x={22} y={130} rotate={-90}>Driver side</T>
      <T x={378} y={130} rotate={90}>Passenger side</T>
    </>
  );
}

function Engine() {
  return (
    <>
      <polygon points="66,46 126,30 168,118 118,130" className={part} />
      <polygon points="334,46 274,30 232,118 282,130" className={part} />
      <polygon points="62,40 124,24 130,36 68,52" className={part} />
      <polygon points="338,40 276,24 270,36 332,52" className={part} />
      <T x={110} y={86} rotate={-68}>Head</T>
      <T x={290} y={86} rotate={68}>Head</T>
      <rect x={160} y={38} width={80} height={60} rx={8} className={part} />
      <T x={200} y={84}>Intake</T>
      <circle cx={200} cy={52} r={10} className={part} />
      <polygon points="118,130 282,130 270,200 130,200" className={part} />
      <rect x={150} y={100} width={100} height={100} rx={8} className={faint} strokeDasharray="4 3" />
      <T x={200} y={124}>Timing cover</T>
      <rect x={136} y={200} width={128} height={38} rx={6} className={part} />
      <T x={200} y={252}>Oil pan</T>
      <polyline points="108,102 186,140 186,206 214,206 302,150 214,140 108,134" className="fill-none stroke-slate-700" strokeWidth={2} />
      <circle cx={200} cy={206} r={22} className={part} />
      <T x={200} y={209}>Crank</T>
      <circle cx={200} cy={140} r={14} className={part} />
      <T x={200} y={143}>W/P</T>
      <circle cx={108} cy={118} r={16} className={part} />
      <T x={108} y={121}>Alt</T>
      <circle cx={288} cy={150} r={16} className={part} />
      <T x={288} y={153}>A/C</T>
      <rect x={306} y={184} width={22} height={26} rx={6} className={part} />
      <T x={317} y={222}>Filter</T>
      <T x={200} y={10}>Top</T>
    </>
  );
}

function Under() {
  return (
    <>
      <rect x={30} y={8} width={340} height={244} rx={30} className={faint} strokeWidth={1.5} />
      {[
        [52, 30],
        [304, 30],
        [52, 198],
        [304, 198],
      ].map(([x, y]) => (
        <rect key={`${x}-${y}`} x={x} y={y} width={44} height={44} rx={10} className={part} />
      ))}
      <rect x={140} y={30} width={120} height={46} rx={8} className={part} />
      <T x={200} y={46}>Engine / oil pan</T>
      <rect x={170} y={76} width={60} height={46} rx={8} className={part} />
      <T x={200} y={92}>Trans</T>
      <polyline points="150,70 166,112 182,122" className="fill-none stroke-slate-600" strokeWidth={4} />
      <polyline points="250,70 234,112 218,122" className="fill-none stroke-slate-600" strokeWidth={4} />
      <rect x={172} y={122} width={20} height={20} rx={4} className={part} />
      <rect x={208} y={122} width={20} height={20} rx={4} className={part} />
      <T x={200} y={136}>Cats</T>
      <polyline points="182,142 176,156 248,170 252,226" className="fill-none stroke-slate-600" strokeWidth={4} />
      <polyline points="218,142 224,156 248,170" className="fill-none stroke-slate-600" strokeWidth={4} />
      <rect x={236} y={226} width={46} height={18} rx={6} className={part} />
      <T x={259} y={238}>Muffler</T>
      <rect x={106} y={160} width={78} height={52} rx={8} className={part} />
      <T x={145} y={190}>Fuel tank</T>
      <rect x={160} y={214} width={32} height={24} rx={4} className={part} />
      <T x={176} y={250}>EVAP</T>
      <line x1={200} y1={122} x2={200} y2={226} className="stroke-slate-700" strokeWidth={3} strokeDasharray="6 4" />
      <rect x={188} y={148} width={24} height={24} rx={4} className={faint} />
      <circle cx={200} cy={236} r={12} className={part} />
      <T x={200} y={258}>Rear axle</T>
      <T x={200} y={6}>Front</T>
      <T x={22} y={130} rotate={-90}>Driver side</T>
      <T x={378} y={130} rotate={90}>Passenger side</T>
    </>
  );
}

function Cabin() {
  return (
    <>
      <polygon points="50,8 350,8 324,58 76,58" className={faint} />
      <T x={200} y={50}>Windshield</T>
      <rect x={186} y={20} width={28} height={14} rx={4} className={part} />
      <rect x={18} y={60} width={364} height={92} rx={14} className={part} />
      <rect x={70} y={76} width={80} height={34} rx={8} className={faint} />
      <T x={110} y={97}>Cluster</T>
      <circle cx={110} cy={150} r={44} className="fill-none stroke-slate-600" strokeWidth={6} />
      <circle cx={110} cy={150} r={12} className={part} />
      <rect x={170} y={74} width={60} height={124} rx={8} className={part} />
      <T x={200} y={120}>Radio</T>
      <T x={200} y={132}>HVAC</T>
      <rect x={270} y={136} width={84} height={40} rx={6} className={part} />
      <T x={312} y={160}>Glovebox</T>
      <rect x={176} y={198} width={48} height={58} rx={8} className={part} />
      <T x={200} y={226}>Console</T>
      <rect x={12} y={152} width={30} height={100} rx={6} className={faint} />
      <rect x={358} y={152} width={30} height={100} rx={6} className={faint} />
      <T x={27} y={250} rotate={-90}>Kick</T>
      <T x={373} y={250} rotate={-90}>Kick</T>
      <line x1={136} y1={214} x2={150} y2={250} className="stroke-slate-600" strokeWidth={4} />
      <line x1={160} y1={214} x2={166} y2={250} className="stroke-slate-600" strokeWidth={4} />
      <T x={110} y={256}>Pedals</T>
      <T x={300} y={256}>Passenger footwell</T>
    </>
  );
}

function Outside() {
  return (
    <>
      <path d="M14 150 L14 116 Q18 100 60 96 L120 92 Q150 60 200 56 L270 56 Q300 60 330 92 L376 98 Q388 104 388 124 L388 150 Z" className={part} />
      <path d="M130 92 Q156 66 200 64 L262 64 Q290 68 312 92 Z" className={faint} />
      <circle cx={96} cy={160} r={28} className="fill-white/[0.06] stroke-slate-500" strokeWidth={2} />
      <circle cx={300} cy={160} r={28} className="fill-white/[0.06] stroke-slate-500" strokeWidth={2} />
      <circle cx={96} cy={160} r={10} className={part} />
      <circle cx={300} cy={160} r={10} className={part} />
      <rect x={14} y={112} width={16} height={32} rx={4} className={faint} />
      <rect x={292} y={104} width={18} height={14} rx={3} className={faint} />
      <rect x={150} y={84} width={14} height={10} rx={3} className={part} />
      <T x={22} y={102}>Front</T>
      <T x={378} y={92}>Rear</T>
      <T x={96} y={206}>Front wheel</T>
      <T x={300} y={206}>Rear wheel</T>
      <T x={301} y={98}>Fuel door</T>
    </>
  );
}

const VIEWS: Record<LocationView, () => ReactNode> = { bay: Bay, engine: Engine, under: Under, cabin: Cabin, outside: Outside };

export function LocationDiagram({ view, spots, title }: { view: LocationView; spots: Spot[]; title: string }) {
  const View = VIEWS[view];
  const marks = spots.filter((s) => s.view === view);
  return (
    <svg viewBox="0 0 400 262" role="img" aria-label={`${title}: ${marks.length} spot${marks.length === 1 ? '' : 's'} marked`} className="h-auto w-full">
      <View />
      {marks.map((s, i) => (
        <g key={`${s.x}-${s.y}-${i}`}>
          <circle cx={s.x} cy={s.y} r={14} className="fill-brand/25 motion-safe:animate-ping" style={{ transformOrigin: `${s.x}px ${s.y}px`, animationDuration: '2s' }} />
          <circle cx={s.x} cy={s.y} r={9} className="fill-brand stroke-white" strokeWidth={2} />
          <text x={s.x} y={s.y + 3.5} textAnchor="middle" className="fill-white text-[10px] font-bold">
            {i + 1}
          </text>
        </g>
      ))}
    </svg>
  );
}
