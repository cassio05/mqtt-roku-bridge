import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Activity, Radio, ShieldCheck, Timer } from "lucide-react";

const stateTone = {
  ON: "border-fuchsia-400/70 bg-fuchsia-400/10 text-fuchsia-200 shadow-[0_0_26px_rgba(244,114,182,0.18)]",
  OFF: "border-slate-700 bg-slate-900/70 text-slate-400",
};

export default function Home() {
  const status = trpc.bridge.status.useQuery(undefined, { refetchInterval: 3000 });
  const snapshot = status.data?.snapshot;
  const online = Boolean(status.data?.connected);
  const updatedAt = snapshot?.updatedAt ? new Date(snapshot.updatedAt).toLocaleTimeString() : "aguardando evento";

  return (
    <DashboardLayout>
      <div className="min-h-[calc(100vh-2rem)] overflow-hidden rounded-[2rem] border border-cyan-300/10 bg-[#050917] text-slate-100 shadow-[0_0_80px_rgba(9,226,255,0.08)]">
        <div className="relative isolate px-6 py-8 sm:px-10 lg:px-14">
          <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_78%_0%,rgba(236,72,153,0.16),transparent_31%),radial-gradient(circle_at_10%_28%,rgba(14,165,233,0.12),transparent_35%)]" />
          <div className="mb-10 flex flex-col justify-between gap-6 border-b border-cyan-300/10 pb-8 lg:flex-row lg:items-end">
            <div>
              <div className="mb-3 flex items-center gap-3 text-[0.68rem] font-semibold uppercase tracking-[0.34em] text-cyan-300/70"><span className="h-px w-10 bg-cyan-300/70" />Casa // bridge telemetry</div>
              <h1 className="max-w-3xl text-4xl font-black tracking-[-0.05em] text-fuchsia-300 drop-shadow-[0_0_18px_rgba(244,114,182,0.42)] sm:text-6xl">MQTT command center</h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 tracking-[0.08em] text-slate-400">Painel técnico restrito para acompanhar a ponte, a conectividade WSS e os oito canais de iluminação sem revelar credenciais.</p>
            </div>
            <div className="flex items-center gap-3 rounded-full border border-cyan-300/20 bg-[#081326]/80 px-4 py-3 text-xs tracking-[0.18em] text-slate-300"><span className={`h-2.5 w-2.5 rounded-full ${online ? "bg-emerald-300 shadow-[0_0_14px_rgba(110,231,183,0.9)]" : "bg-amber-300 shadow-[0_0_14px_rgba(252,211,77,0.8)]"}`} />{online ? "UPLINK ONLINE" : status.data?.connecting ? "RECONNECTING" : "OFFLINE"}</div>
          </div>

          {status.error ? <div className="mb-8 rounded-2xl border border-rose-400/30 bg-rose-400/10 p-5 text-sm text-rose-200">Acesso restrito ou ponte indisponível. A interface não exibe detalhes de autenticação.</div> : null}

          <div className="mb-8 grid gap-4 md:grid-cols-3">
            <Metric icon={Radio} label="Transporte" value="MQTT / WSS" detail="secure channel" />
            <Metric icon={Activity} label="Último evento" value={updatedAt} detail={`versão ${snapshot?.version ?? 0}`} />
            <Metric icon={Timer} label="Canais ativos" value={`${snapshot?.channels.filter(channel => channel.state === "ON").length ?? 0} / 8`} detail="estado normalizado" />
          </div>

          <div className="mb-4 flex items-center justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.3em] text-cyan-300/70">Live channel matrix</p><p className="mt-2 text-sm text-slate-500">Últimos estados recebidos de casa/luz1 até casa/luz8.</p></div><ShieldCheck className="h-5 w-5 text-cyan-300/70" /></div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {(snapshot?.channels ?? Array.from({ length: 8 }, (_, index) => ({ channel: index + 1, topic: `casa/luz${index + 1}`, state: "OFF" as const, updatedAt: null }))).map(channel => <div key={channel.channel} className={`relative overflow-hidden rounded-2xl border p-5 transition-colors ${stateTone[channel.state]}`}><div className="absolute right-0 top-0 h-20 w-20 translate-x-8 -translate-y-8 rounded-full bg-cyan-300/10 blur-2xl" /><div className="relative flex items-start justify-between"><span className="font-mono text-xs tracking-[0.26em] text-cyan-300/60">CH 0{channel.channel}</span><span className="font-mono text-xs tracking-[0.2em]">{channel.state}</span></div><div className="relative mt-8 text-lg font-semibold tracking-[0.12em] text-slate-100">{channel.topic}</div><div className="relative mt-3 font-mono text-[0.68rem] tracking-[0.16em] text-slate-500">{channel.updatedAt ? new Date(channel.updatedAt).toLocaleTimeString() : "sem evento"}</div></div>)}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

function Metric({ icon: Icon, label, value, detail }: { icon: typeof Radio; label: string; value: string; detail: string }) {
  return <div className="rounded-2xl border border-cyan-300/10 bg-[#081326]/70 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"><div className="flex items-center gap-3 text-cyan-300/60"><Icon className="h-4 w-4" /><span className="text-[0.66rem] uppercase tracking-[0.26em]">{label}</span></div><div className="mt-4 text-xl font-bold tracking-[0.06em] text-slate-100">{value}</div><div className="mt-1 text-xs tracking-[0.16em] text-slate-500">{detail}</div></div>;
}
