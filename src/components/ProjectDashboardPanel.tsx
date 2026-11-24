import React, {useMemo} from 'react';
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  ShieldAlert,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type {ProjectModel} from '../types/cnpie';
import {
  computeProjectDashboardData,
  type AuditAlertItem,
  type SectionCompletionMetric,
} from '../utils/cnpieEngine';

interface ProjectDashboardPanelProps {
  project: ProjectModel;
  onNavigateAlert: (targetView: 'step1' | 'step2', sectionId: string, fieldKey?: string) => void;
}

interface BarTooltipPayloadItem {
  payload?: SectionCompletionMetric;
}

const SectionBarTooltip: React.FC<{
  active?: boolean;
  payload?: BarTooltipPayloadItem[];
}> = ({active, payload}) => {
  if (!active || !payload || payload.length === 0 || !payload[0].payload) return null;
  const item = payload[0].payload;
  return (
    <div className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs shadow-lg">
      <div className="font-extrabold text-slate-900">{item.fullLabel}</div>
      <div className="mt-0.5 font-mono-tabular text-slate-700">
        Completitud: <strong>{item.pct}%</strong> ({item.doneItems}/{item.totalItems} criterios)
      </div>
    </div>
  );
};

interface PieTooltipPayloadItem {
  name?: string;
  value?: number;
}

const GlobalPieTooltip: React.FC<{
  active?: boolean;
  payload?: PieTooltipPayloadItem[];
}> = ({active, payload}) => {
  if (!active || !payload || payload.length === 0) return null;
  const entry = payload[0];
  return (
    <div className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs shadow-md">
      <span className="font-bold text-slate-900">{entry.name}: </span>
      <span className="font-mono-tabular font-extrabold text-blue-800">{entry.value}%</span>
    </div>
  );
};

export const ProjectDashboardPanel: React.FC<ProjectDashboardPanelProps> = ({
  project,
  onNavigateAlert,
}) => {
  const dash = useMemo(() => computeProjectDashboardData(project), [project]);

  const donutData = [
    {name: 'Completado', value: dash.overallPct, color: '#059669'},
    {name: 'Pendiente', value: Math.max(0, 100 - dash.overallPct), color: '#e2e8f0'},
  ];

  const getBarColor = (sec: SectionCompletionMetric) => {
    if (sec.status === 'alert') return '#dc2626';
    if (sec.pct >= 100) return '#059669';
    if (sec.pct >= 50) return '#1d4ed8';
    if (sec.pct > 0) return '#d97706';
    return '#94a3b8';
  };

  const handleAlertClick = (alert: AuditAlertItem) => {
    onNavigateAlert(alert.targetView, alert.sectionId, alert.fieldKey);
  };

  return (
    <section
      aria-label="Panel de control de completitud y alertas"
      className="rounded-2xl border-2 border-slate-200 bg-white p-4 sm:p-6 shadow-xs space-y-5"
    >
      {/* Cabecera KPI */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-4">
        <div className="flex items-start gap-2.5">
          <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-800">
            <BarChart3 className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-extrabold text-slate-900">
              Panel de Control · Avance por Secciones y Alertas CNPIE
            </h2>
            <p className="text-xs sm:text-sm text-slate-600">
              Porcentaje de completitud en tiempo real de cada sección y resumen de observaciones
              pendientes antes de postular.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0 text-xs sm:text-sm font-mono-tabular">
          <span className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 font-extrabold text-blue-900">
            Avance global: {dash.overallPct}%
          </span>
          <span
            className={`rounded-lg border px-3 py-1.5 font-extrabold ${
              dash.alerts.length === 0
                ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                : dash.criticalCount > 0
                ? 'border-red-200 bg-red-50 text-red-800'
                : 'border-amber-200 bg-amber-50 text-amber-900'
            }`}
          >
            {dash.alerts.length === 0
              ? '0 alertas pendientes'
              : `${dash.alerts.length} alerta(s) pendiente(s)`}
          </span>
        </div>
      </div>

      {/* Gráficos Recharts: Barras por Sección + Donut Global */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        <div className="lg:col-span-8 rounded-xl border border-slate-200 bg-slate-50/50 p-3.5 sm:p-4">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
            <span className="text-sm font-extrabold text-slate-900">
              Completitud por Sección del Proyecto (%)
            </span>
            <div className="flex flex-wrap items-center gap-3 text-[11px] font-bold text-slate-600">
              <span className="inline-flex items-center gap-1">
                <span className="h-2.5 w-2.5 rounded-xs bg-emerald-600" />
                100% Completo
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="h-2.5 w-2.5 rounded-xs bg-blue-700" />
                En avance
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="h-2.5 w-2.5 rounded-xs bg-amber-600" />
                Inicial
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="h-2.5 w-2.5 rounded-xs bg-red-600" />
                Exceso/Alerta
              </span>
            </div>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={dash.sections}
                layout="vertical"
                margin={{top: 6, right: 38, left: 6, bottom: 6}}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                <XAxis
                  type="number"
                  domain={[0, 100]}
                  tickFormatter={(v) => `${v}%`}
                  tick={{fontSize: 11, fill: '#475569'}}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={132}
                  tick={{fontSize: 11, fill: '#0f172a', fontWeight: 600}}
                />
                <Tooltip content={<SectionBarTooltip />} cursor={{fill: 'rgba(226,232,240,0.4)'}} />
                <Bar dataKey="pct" radius={[0, 6, 6, 0]} barSize={20}>
                  {dash.sections.map((sec) => (
                    <Cell key={sec.sectionId} fill={getBarColor(sec)} />
                  ))}
                  <LabelList
                    dataKey="pct"
                    position="right"
                    formatter={(val: unknown) => `${val ?? 0}%`}
                    style={{fontSize: 11, fontWeight: 700, fill: '#0f172a'}}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Donut Recharts + Resumen numérico */}
        <div className="lg:col-span-4 rounded-xl border border-slate-200 bg-slate-50/50 p-4 flex flex-col justify-between">
          <div>
            <div className="text-sm font-extrabold text-slate-900">Estado General</div>
            <div className="text-xs text-slate-600">
              {dash.totalCompletedItems} de {dash.totalItems} ítems completados
            </div>
          </div>

          <div className="relative h-48 w-full my-1">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={donutData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={52}
                  outerRadius={74}
                  startAngle={90}
                  endAngle={-270}
                  paddingAngle={2}
                >
                  {donutData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<GlobalPieTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="text-2xl font-extrabold font-mono-tabular text-slate-900">
                {dash.overallPct}%
              </span>
              <span className="text-[11px] font-bold text-slate-600">Avance Total</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200 text-center">
            <div className="rounded-lg bg-white border border-slate-200 p-2">
              <div className="text-xs font-bold text-slate-600">Puntaje Nivel IV</div>
              <div className="text-lg font-extrabold font-mono-tabular text-blue-800">
                {dash.auditScore}/100
              </div>
            </div>
            <div className="rounded-lg bg-white border border-slate-200 p-2">
              <div className="text-xs font-bold text-slate-600">Alertas Críticas</div>
              <div
                className={`text-lg font-extrabold font-mono-tabular ${
                  dash.criticalCount > 0 ? 'text-red-700' : 'text-emerald-700'
                }`}
              >
                {dash.criticalCount}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Resumen de Alertas de Auditoría Pendientes */}
      <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 sm:p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {dash.alerts.length === 0 ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-700" aria-hidden="true" />
            ) : (
              <ShieldAlert className="h-5 w-5 text-amber-700" aria-hidden="true" />
            )}
            <h3 className="text-sm sm:text-base font-extrabold text-slate-900">
              Resumen de Alertas de Auditoría Pendientes
            </h3>
          </div>

          {dash.alerts.length > 0 && (
            <div className="flex items-center gap-2 text-xs font-bold">
              {dash.criticalCount > 0 && (
                <span className="rounded-md bg-red-100 px-2 py-0.5 text-red-900">
                  {dash.criticalCount} crítica(s)
                </span>
              )}
              {dash.warningCount > 0 && (
                <span className="rounded-md bg-amber-100 px-2 py-0.5 text-amber-950">
                  {dash.warningCount} pendiente(s)
                </span>
              )}
            </div>
          )}
        </div>

        {dash.alerts.length === 0 ? (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3.5 text-sm font-semibold text-emerald-900">
            Excelente: no hay alertas de auditoría pendientes. Tu expediente cumple con todos los
            rubros, tablas, topes presupuestales e instrumentos exigidos por el FONDEP.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 max-h-72 overflow-y-auto pr-1">
            {dash.alerts.map((al) => {
              const isCrit = al.severity === 'critica';
              return (
                <div
                  key={al.id}
                  className={`flex flex-col justify-between gap-2 rounded-xl border bg-white p-3 ${
                    isCrit ? 'border-red-300' : 'border-amber-200'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <AlertTriangle
                      className={`h-4 w-4 shrink-0 mt-0.5 ${
                        isCrit ? 'text-red-700' : 'text-amber-700'
                      }`}
                      aria-hidden="true"
                    />
                    <div className="min-w-0">
                      <div className="text-xs sm:text-sm font-extrabold text-slate-900">
                        {al.title}
                      </div>
                      <p className="text-xs text-slate-700 mt-0.5 leading-snug">{al.detail}</p>
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => handleAlertClick(al)}
                      className="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-900 hover:bg-blue-100 cursor-pointer"
                    >
                      <span>Ir a corregir</span>
                      <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
};
