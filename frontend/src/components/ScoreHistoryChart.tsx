import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

interface Props {
  data: { computed_at: string; fos_score: number; current_popularity: number; future_potential: number }[];
}

export function ScoreHistoryChart({ data }: Props) {
  const formatted = data.map((d) => ({
    ...d,
    label: new Date(d.computed_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' }),
  }));

  if (formatted.length < 2) {
    return (
      <div className="flex h-48 items-center justify-center rounded-lg border border-scope-line bg-scope-panel text-sm text-ink-faint">
        Belum cukup histori untuk menampilkan grafik tren.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={formatted} margin={{ top: 8, right: 12, left: -18, bottom: 0 }}>
        <CartesianGrid stroke="#16213A" strokeDasharray="3 3" />
        <XAxis dataKey="label" stroke="#5C6680" fontSize={11} tickLine={false} />
        <YAxis stroke="#5C6680" fontSize={11} tickLine={false} domain={[0, 100]} />
        <Tooltip
          contentStyle={{ background: '#111A2E', border: '1px solid #22304D', borderRadius: 8, fontSize: 12 }}
          labelStyle={{ color: '#8D96AC' }}
        />
        <Line type="monotone" dataKey="future_potential" stroke="#2DD9C3" strokeWidth={2} dot={false} name="Future Potential" />
        <Line type="monotone" dataKey="current_popularity" stroke="#F5A623" strokeWidth={2} dot={false} name="Current Popularity" />
      </LineChart>
    </ResponsiveContainer>
  );
}
