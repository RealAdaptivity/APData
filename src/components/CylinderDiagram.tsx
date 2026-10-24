import { cylinderMap, type BankLayout, type EngineFamily, type Orientation } from '../data/engineLayouts';

/**
 * The engine seen from above with every cylinder numbered and bank 1 marked,
 * the way the engine sits in the vehicle. Lengthwise engines put the timing
 * end at the front; crosswise ones, on almost every front-drive vehicle sold
 * in the US, put it on the passenger side.
 */

const label = 'fill-slate-500 text-[9px] font-semibold uppercase tracking-wide';

export function CylinderDiagram({
  cylinders,
  layout,
  family,
  orientation,
}: {
  cylinders: number;
  layout: BankLayout;
  family: EngineFamily;
  orientation: Orientation;
}) {
  const spots = cylinderMap(cylinders, layout, family.numbering);
  const per = layout === 'inline' ? cylinders : Math.ceil(cylinders / 2);
  const gap = Math.min(44, 190 / Math.max(per, 1));

  // Bank 1's side, as a slot: 'a' is left (lengthwise) or front row (crosswise).
  const bank1Slot = orientation === 'longitudinal' ? (family.bank1.longitudinal === 'driver' ? 'a' : 'b') : family.bank1.transverse === 'front' ? 'a' : 'b';

  const place = (bank: 1 | 2, index: number) => {
    const slot = layout === 'inline' ? 'mid' : bank === 1 ? bank1Slot : bank1Slot === 'a' ? 'b' : 'a';
    // The bank with cylinder 1 sits a little nearer the timing end.
    const offset = layout === 'inline' ? 0 : bank === 1 ? 0 : gap * 0.35;
    const along = index * gap + offset;
    if (orientation === 'longitudinal') {
      const x = slot === 'mid' ? 200 : slot === 'a' ? 150 : 250;
      return { x, y: 62 + along };
    }
    const y = slot === 'mid' ? 130 : slot === 'a' ? 96 : 164;
    return { x: 306 - along, y };
  };

  const len = (per - 1) * gap + (layout === 'inline' ? 0 : gap * 0.35);
  const block =
    orientation === 'longitudinal'
      ? { x: layout === 'inline' ? 168 : 118, y: 40, w: layout === 'inline' ? 64 : 164, h: len + 44 }
      : { x: 306 - len - 22, y: layout === 'inline' ? 108 : 74, w: len + 44, h: layout === 'inline' ? 44 : 112 };

  const bankLabel = (bank: 1 | 2) => {
    const p = place(bank, 0);
    return orientation === 'longitudinal'
      ? { x: p.x === 150 ? 92 : p.x === 250 ? 308 : 262, y: 56 + len / 2, rotate: p.x === 150 ? -90 : 90 }
      : { x: 306 - len / 2, y: p.y === 96 ? 64 : p.y === 164 ? 202 : 98, rotate: 0 };
  };

  return (
    <svg viewBox="0 0 400 262" role="img" aria-label={`Cylinder numbering, ${cylinders} cylinders, bank 1 marked`} className="h-auto w-full">
      <rect x={block.x} y={block.y} width={block.w} height={block.h} rx={14} className="fill-white/[0.04] stroke-slate-600" />
      {orientation === 'longitudinal' ? (
        <>
          <text x={200} y={14} textAnchor="middle" className={label}>
            ▲ Front of vehicle · timing end
          </text>
          <text x={22} y={130} textAnchor="middle" className={label} transform="rotate(-90 22 130)">
            Driver side
          </text>
          <text x={378} y={130} textAnchor="middle" className={label} transform="rotate(90 378 130)">
            Passenger side
          </text>
          <text x={200} y={254} textAnchor="middle" className={label}>
            Transmission
          </text>
        </>
      ) : (
        <>
          <text x={200} y={14} textAnchor="middle" className={label}>
            ▲ Front of vehicle · radiator
          </text>
          <text x={200} y={254} textAnchor="middle" className={label}>
            Firewall
          </text>
          <text x={372} y={130} textAnchor="middle" className={label} transform="rotate(90 372 130)">
            Passenger side · timing end
          </text>
          <text x={28} y={130} textAnchor="middle" className={label} transform="rotate(-90 28 130)">
            Driver side · transaxle
          </text>
        </>
      )}
      {layout !== 'inline' &&
        ([1, 2] as const).map((b) => {
          const l = bankLabel(b);
          return (
            <text
              key={b}
              x={l.x}
              y={l.y}
              textAnchor="middle"
              transform={l.rotate ? `rotate(${l.rotate} ${l.x} ${l.y})` : undefined}
              className={b === 1 ? 'fill-brand text-[11px] font-bold' : 'fill-slate-400 text-[11px] font-bold'}
            >
              Bank {b}
            </text>
          );
        })}
      {spots.map((c) => {
        const p = place(c.bank, c.index);
        const first = c.n === 1;
        return (
          <g key={c.n}>
            <circle cx={p.x} cy={p.y} r={15} className={c.bank === 1 ? 'fill-brand/20 stroke-brand' : 'fill-white/5 stroke-slate-500'} strokeWidth={first ? 3 : 1.5} />
            <text x={p.x} y={p.y + 4.5} textAnchor="middle" className={c.bank === 1 ? 'fill-white text-[13px] font-bold' : 'fill-slate-300 text-[13px] font-bold'}>
              {c.n}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
