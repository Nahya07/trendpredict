import { OpportunityItem } from '../types/api';

interface Props {
  items: OpportunityItem[];
  onSelect?: (productId: string) => void;
}

const SIZE = 340;
const CENTER = SIZE / 2;
const MAX_R = SIZE / 2 - 28;
const RINGS = [1, 0.75, 0.5, 0.25];

/** Deterministic angle from a string so the same product always lands in the same spot
 * between renders (a real radar wouldn't jitter). Angle itself carries no meaning here —
 * only distance-to-center (future potential) and color (stage) do. */
function angleFor(id: string): number {
  let hash = 0;
  for (const c of id) hash = (hash * 31 + c.charCodeAt(0)) % 360;
  return (hash * Math.PI) / 180;
}

function stageColor(stage: string | undefined): string {
  switch (stage) {
    case 'ACCELERATING':
    case 'EARLY_SIGNAL':
    case 'EMERGING':
      return '#2DD9C3';
    case 'RISING':
    case 'PEAK':
      return '#F5A623';
    case 'DECLINING':
    case 'DEAD':
    case 'SATURATED':
      return '#EF5B4E';
    default:
      return '#4A5875';
  }
}

export function RadarScope({ items, onSelect }: Props) {
  return (
    <div className="relative mx-auto" style={{ width: SIZE, height: SIZE }}>
      <svg width={SIZE} height={SIZE} className="overflow-visible">
        {/* Concentric rings — outer = far (low future potential), center = imminent */}
        {RINGS.map((r) => (
          <circle key={r} cx={CENTER} cy={CENTER} r={MAX_R * r} fill="none" stroke="#22304D" strokeWidth={1} />
        ))}
        <line x1={CENTER} y1={4} x2={CENTER} y2={SIZE - 4} stroke="#16213A" strokeWidth={1} />
        <line x1={4} y1={CENTER} x2={SIZE - 4} y2={CENTER} stroke="#16213A" strokeWidth={1} />

        {/* Sweep wedge, signature motion element */}
        <g className="radar-sweep" style={{ transformOrigin: `${CENTER}px ${CENTER}px` }}>
          <path
            d={`M ${CENTER} ${CENTER} L ${CENTER} ${CENTER - MAX_R} A ${MAX_R} ${MAX_R} 0 0 1 ${
              CENTER + MAX_R * Math.sin(0.5)
            } ${CENTER - MAX_R * Math.cos(0.5)} Z`}
            fill="url(#sweepGradient)"
            opacity={0.5}
          />
        </g>
        <defs>
          <linearGradient id="sweepGradient" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#2DD9C3" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#2DD9C3" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Blips: distance from center = (100 - future_potential)/100 * MAX_R */}
        {items.map((item) => {
          const angle = angleFor(item.product_id);
          const r = ((100 - item.future_potential) / 100) * MAX_R;
          const x = CENTER + r * Math.cos(angle);
          const y = CENTER + r * Math.sin(angle);
          const color = stageColor(item.stage);
          const isAccelerating = item.stage === 'ACCELERATING';
          return (
            <g
              key={item.product_id}
              onClick={() => onSelect?.(item.product_id)}
              className="cursor-pointer"
              role="button"
              aria-label={`${item.name}, future score ${Math.round(item.future_potential)}`}
            >
              <circle
                cx={x}
                cy={y}
                r={4}
                fill={color}
                className={isAccelerating ? 'blip-accelerating' : ''}
                stroke="#0A0F1C"
                strokeWidth={1.5}
              />
            </g>
          );
        })}

        {/* Center = "now / imminent" */}
        <circle cx={CENTER} cy={CENTER} r={2} fill="#EDF0F7" />
        <text x={CENTER} y={CENTER - 10} textAnchor="middle" className="fill-signal-rising font-mono" fontSize={9} letterSpacing={1}>
          SEGERA
        </text>
        <text x={CENTER} y={16} textAnchor="middle" className="fill-ink-faint font-mono" fontSize={9} letterSpacing={1}>
          JAUH
        </text>
      </svg>
    </div>
  );
}
