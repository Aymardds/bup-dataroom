import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

type Log = { created_at: string; action: string };
type Doc = { name: string; view_count: number; folder_id: string | null; size_bytes: number };
type Folder = { id: string; name: string };
type Member = { party_type: string; status: string };

const COLORS = ["var(--primary)", "var(--accent)", "var(--chart-3, var(--muted-foreground))", "var(--chart-4, var(--ring))", "var(--chart-5, var(--secondary-foreground))"];
const tip = { contentStyle: { background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 12, fontSize: 12, color: "var(--popover-foreground)" } };

export function RoomStats({ logs, docs, folders, members }: { logs: Log[]; docs: Doc[]; folders: Folder[]; members: Member[] }) {
  const days = Array.from({ length: 14 }, (_, i) => {
    const dt = new Date(); dt.setHours(0, 0, 0, 0); dt.setDate(dt.getDate() - (13 - i));
    return dt;
  });
  const activity = days.map((dt) => {
    const key = dt.toDateString();
    return { jour: dt.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" }), actions: logs.filter((l) => new Date(l.created_at).toDateString() === key).length };
  });
  const byFolder = [...folders.map((f) => ({ id: f.id as string | null, name: f.name })), { id: null, name: "Sans dossier" }]
    .map((f) => ({ name: f.name, documents: docs.filter((x) => x.folder_id === f.id).length }))
    .filter((f) => f.documents > 0);
  const topDocs = [...docs].sort((a, b) => b.view_count - a.view_count).slice(0, 5).map((x) => ({ name: x.name.length > 22 ? x.name.slice(0, 20) + "…" : x.name, vues: x.view_count }));
  const parties = Object.entries(members.reduce<Record<string, number>>((a, m) => ((a[m.party_type] = (a[m.party_type] ?? 0) + 1), a), {})).map(([name, value]) => ({ name, value }));
  const active = members.filter((m) => m.status === "active").length;
  const totalMb = docs.reduce((a, x) => a + x.size_bytes, 0) / 1048576;
  const last7 = activity.slice(7).reduce((a, x) => a + x.actions, 0);

  const Empty = () => <div className="flex h-[200px] items-center justify-center text-[12px] text-muted-foreground">Pas encore de données</div>;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {[["Actions (7 j)", last7], ["Taux d'activation", members.length ? `${Math.round((active / members.length) * 100)} %` : "—"], ["Volume stocké", `${totalMb.toFixed(1)} Mo`], ["Vues / document", docs.length ? (docs.reduce((a, x) => a + x.view_count, 0) / docs.length).toFixed(1) : "0"]].map(([l, v]) => (
          <div key={l} className="glass-panel p-4"><div className="text-[11px] text-muted-foreground">{l}</div><div className="mt-1 text-2xl font-semibold">{v}</div></div>
        ))}
      </div>
      <div className="glass-panel p-6">
        <div className="mb-4 flex justify-between"><div className="text-[15px] font-semibold">Activité sur 14 jours</div><div className="eyebrow text-accent">Statistiques d'utilisation</div></div>
        <div className="h-[220px]">
          <ResponsiveContainer>
            <AreaChart data={activity}>
              <defs><linearGradient id="actG" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--primary)" stopOpacity={0.5} /><stop offset="100%" stopColor="var(--primary)" stopOpacity={0} /></linearGradient></defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="jour" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} width={28} />
              <Tooltip {...tip} />
              <Area type="monotone" dataKey="actions" stroke="var(--primary)" strokeWidth={2} fill="url(#actG)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="grid gap-6 md:grid-cols-3">
        <div className="glass-panel p-6">
          <div className="mb-4 text-[15px] font-semibold">Documents les plus consultés</div>
          {topDocs.length ? <div className="h-[200px]"><ResponsiveContainer><BarChart data={topDocs} layout="vertical"><XAxis type="number" hide allowDecimals={false} /><YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} /><Tooltip {...tip} /><Bar dataKey="vues" fill="var(--primary)" radius={[0, 6, 6, 0]} /></BarChart></ResponsiveContainer></div> : <Empty />}
        </div>
        <div className="glass-panel p-6">
          <div className="mb-4 text-[15px] font-semibold">Documents par dossier</div>
          {byFolder.length ? <div className="h-[200px]"><ResponsiveContainer><BarChart data={byFolder}><XAxis dataKey="name" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} interval={0} /><YAxis hide allowDecimals={false} /><Tooltip {...tip} /><Bar dataKey="documents" fill="var(--accent)" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer></div> : <Empty />}
        </div>
        <div className="glass-panel p-6">
          <div className="mb-4 text-[15px] font-semibold">Répartition des parties</div>
          {parties.length ? <div className="h-[200px]"><ResponsiveContainer><PieChart><Pie data={parties} dataKey="value" nameKey="name" innerRadius={45} outerRadius={75} paddingAngle={3}>{parties.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Pie><Tooltip {...tip} /></PieChart></ResponsiveContainer></div> : <Empty />}
        </div>
      </div>
    </div>
  );
}
