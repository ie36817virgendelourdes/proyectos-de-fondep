import React, {useState} from 'react';
import {Info} from 'lucide-react';
import {CATEGORY_EXPLANATIONS} from '../data/cnpieCatalogs';
import {SCHEMA_FICHAS} from '../data/cnpieSchemas';
import type {ProjectModel, ViewId} from '../types/cnpie';
import {computeStepProgressData, getModalityAndProjectLabels} from '../utils/cnpieEngine';

interface StepTrackerProps {
  project: ProjectModel;
  activeView: ViewId;
  onNavigate: (view: ViewId) => void;
}

export const StepTracker: React.FC<StepTrackerProps> = ({project, activeView, onNavigate}) => {
  const [showCatInfo, setShowCatInfo] = useState(false);

  if (activeView === 'home') return null;

  const labels = getModalityAndProjectLabels(project);
  const prog = computeStepProgressData(project);
  const activeDetail = CATEGORY_EXPLANATIONS[project.category];
  const activeSchema = SCHEMA_FICHAS[project.category];

  const steps: Array<{
    view: ViewId;
    num: string;
    title: string;
    metricText: string;
    pct: number;
    tone: 'done' | 'mid' | 'base';
  }> = [
    {
      view: 'step1',
      num: '1',
      title: 'Contexto y Beneficiarios',
      metricText: `${prog.s1Pct}%`,
      pct: prog.s1Pct,
      tone: prog.s1Pct === 100 ? 'done' : prog.s1Pct >= 50 ? 'mid' : 'base',
    },
    {
      view: 'step2',
      num: '2',
      title: 'Misiones y Árboles',
      metricText: `${prog.s2Done}/${prog.s2Total} · ${prog.s2Pct}%`,
      pct: prog.s2Pct,
      tone: prog.s2Pct === 100 ? 'done' : prog.s2Pct >= 40 ? 'mid' : 'base',
    },
    {
      view: 'step3',
      num: '3',
      title: 'Auditoría y Word/PDF',
      metricText: `${prog.s3Score}/100 pts`,
      pct: prog.s3Score,
      tone: prog.s3Score >= 85 ? 'done' : prog.s3Score >= 70 ? 'mid' : 'base',
    },
  ];

  return (
    <section
      aria-label="Ruta del proyecto"
      className="no-print rounded-2xl border border-slate-200 bg-white p-3.5 shadow-xs"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-slate-100 text-xs sm:text-sm text-slate-600">
        <div
          className="relative"
          onMouseEnter={() => setShowCatInfo(true)}
          onMouseLeave={() => setShowCatInfo(false)}
          onBlur={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
              setShowCatInfo(false);
            }
          }}
        >
          <button
            type="button"
            onFocus={() => setShowCatInfo(true)}
            onClick={() => setShowCatInfo((v) => !v)}
            aria-expanded={showCatInfo}
            className="inline-flex items-center gap-1.5 font-bold text-slate-900 hover:text-blue-800 cursor-pointer text-left"
          >
            <span>{labels.catLabel}</span>
            <Info className="h-3.5 w-3.5 text-blue-700 shrink-0" aria-hidden="true" />
          </button>

          {showCatInfo && activeDetail && (
            <div
              role="tooltip"
              className="absolute left-0 top-full mt-2 z-40 w-[min(90vw,440px)] rounded-2xl border-2 border-blue-700 bg-white p-4 shadow-xl text-left space-y-2"
            >
              <div className="flex items-center gap-2 text-xs font-extrabold">
                <span className="rounded-md bg-blue-800 px-2 py-0.5 text-white font-mono-tabular">
                  {activeSchema.code}
                </span>
                <span className="text-blue-800">{activeDetail.linea}</span>
              </div>
              <div className="text-sm font-extrabold text-slate-900">{activeDetail.fullTitle}</div>
              <p className="text-xs sm:text-sm text-slate-800 leading-relaxed">
                {activeDetail.explicacion}
              </p>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs text-slate-800 space-y-1">
                <div>
                  <strong>Trayectoria:</strong> {activeDetail.trayectoria}
                </div>
                <div>
                  <strong>Financiamiento:</strong> {activeDetail.financiamiento}
                </div>
              </div>
              <ul className="list-disc pl-4 space-y-0.5 text-xs text-slate-700">
                {activeDetail.requisitosClave.map((req, idx) => (
                  <li key={idx}>{req}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
        <span className="font-mono-tabular">
          {labels.modLabel.split('(')[0].trim()} · {labels.montoLabel}
        </span>
      </div>

      <div className="mt-2.5 grid grid-cols-3 gap-2">
        {steps.map((st) => {
          const isCurrent = activeView === st.view;
          const barColor =
            st.tone === 'done'
              ? 'bg-emerald-600'
              : st.tone === 'mid'
              ? 'bg-blue-600'
              : 'bg-slate-400';

          return (
            <button
              key={st.view}
              type="button"
              onClick={() => onNavigate(st.view)}
              className={`flex flex-col justify-between gap-1.5 rounded-xl border px-3 py-2.5 text-left transition-colors cursor-pointer min-h-[56px] ${
                isCurrent
                  ? 'border-blue-700 bg-blue-50/80'
                  : 'border-slate-200 bg-slate-50/50 hover:bg-slate-50 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between gap-1.5 w-full">
                <span
                  className={`text-xs sm:text-sm font-bold truncate ${
                    isCurrent ? 'text-blue-900' : 'text-slate-900'
                  }`}
                >
                  {st.num}. {st.title}
                </span>
                <span className="text-xs font-bold text-slate-700 font-mono-tabular shrink-0 hidden sm:inline">
                  {st.metricText}
                </span>
              </div>

              <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
                <div
                  className={`h-full rounded-full transition-all duration-200 ${barColor}`}
                  style={{width: `${st.pct}%`}}
                />
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
};
