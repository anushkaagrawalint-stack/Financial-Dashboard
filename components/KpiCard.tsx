interface KpiSub {
  txt: string;
  cls?: string;
}

interface KpiCardProps {
  label: string;
  valStr: string;
  subs: KpiSub[];
  accent?: boolean;
}

export default function KpiCard({ label, valStr, subs, accent }: KpiCardProps) {
  return (
    <div className={`kpi${accent ? ' kpi-accent' : ''}`}>
      <div className="kpi-lbl">{label}</div>
      <div className="kpi-val">{valStr}</div>
      <div className="kpi-subs">
        {subs.map((s, i) => (
          <div key={i} className={`kpi-sub${s.cls ? ' ' + s.cls : ''}`}>{s.txt}</div>
        ))}
      </div>
    </div>
  );
}
