import React, {useState} from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Award,
  CheckCircle2,
  Highlighter,
  Rocket,
  Sparkles,
  X,
} from 'lucide-react';
import type {RubricFieldComparison, RubricNivel4Report} from '../utils/cnpieEngine';

interface RubricNivel4PanelProps {
  report: RubricNivel4Report;
  highlightWeakFields: boolean;
  onToggleHighlight: () => void;
  onJumpToField: (sectionId: string, fieldKey: string) => void;
  onDeepenField: (item: RubricFieldComparison) => void;
  onDeepenAllWeak: () => void;
  onClose: () => void;
}

export const RubricNivel4Panel: React.FC<RubricNivel4PanelProps> = ({
  report,
  highlightWeakFields,
  onToggleHighlight,
  onJumpToField,
  onDeepenField,
  onDeepenAllWeak,
  onClose,
}) => {
  const [filterMode, setFilterMode] = useState<'weak' | 'all'>(
    report.needsDepthCount > 0 ? 'weak' : 'all'
  );

  const visibleItems =
    filterMode === 'weak' ? report.items.filter((it) => it.needsDepth) : report.items;

  const levelStyles: Record<
    RubricFieldComparison['level'],
    {badge: string; cardBorder: string; scoreText: string}
  > = {
    'Nivel IV': {
      badge: 'bg-emerald-700 text-white',
      cardBorder: 'border-emerald-200 bg-emerald-50/30',
      scoreText: 'text-emerald-800',
    },
    'Nivel III': {
      badge: 'bg-amber-600 text-white',
      cardBorder: 'border-amber-300 bg-amber-50/50',
      scoreText: 'text-amber-900',
    },
    'Nivel II': {
      badge: 'bg-orange-700 text-white',
      cardBorder: 'border-orange-300 bg-orange-50/50',
      scoreText: 'text-orange-900',
    },
    'Nivel I': {
      badge: 'bg-red-700 text-white',
      cardBorder: 'border-red-300 bg-red-50/50',
      scoreText: 'text-red-800',
    },
  };

  return (
    <section
      aria-label="Comparativa con la Rúbrica de Nivel IV del FONDEP"
      className="rounded-2xl border-2 border-amber-300 bg-white p-4 sm:p-5 shadow-xs space-y-4"
    >
      {/* Cabecera de Comparación Rúbrica Nivel IV */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 border-b border-slate-200 pb-4">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-900">
            <Award className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base sm:text-lg font-extrabold text-slate-900">
                Comparativa con la Rúbrica de Nivel IV · FONDEP
              </h3>
              <span className="font-mono-tabular text-xs sm:text-sm font-extrabold text-amber-900">
                {report.estimatedLevel} ({report.overallPct}/100)
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-700 mt-0.5">
              Evalúa evidencia verificable, coherencia causal con el Problema Central y criterios
              oficiales de cada numeral para resaltar dónde profundizar tus argumentos.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onToggleHighlight}
            aria-pressed={highlightWeakFields}
            className={`inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs sm:text-sm font-bold cursor-pointer ${
              highlightWeakFields
                ? 'border-amber-700 bg-amber-700 text-white hover:bg-amber-800'
                : 'border-slate-300 bg-white text-slate-800 hover:bg-slate-50'
            }`}
          >
            <Highlighter className="h-4 w-4" aria-hidden="true" />
            <span>
              {highlightWeakFields ? 'Resaltado activo en tarjetas' : 'Resaltar campos débiles'}
            </span>
          </button>

          {report.needsDepthCount > 0 && (
            <button
              type="button"
              onClick={onDeepenAllWeak}
              className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg bg-red-800 px-3.5 py-1.5 text-xs sm:text-sm font-bold text-white hover:bg-red-900 cursor-pointer"
            >
              <Rocket className="h-4 w-4" aria-hidden="true" />
              <span>Profundizar {report.needsDepthCount} pendiente(s)</span>
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar comparativa Nivel IV"
            className="inline-flex min-h-[38px] items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
          >
            <X className="h-4 w-4" />
            <span>Cerrar</span>
          </button>
        </div>
      </div>

      {/* KPI y filtros */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 text-xs sm:text-sm">
          <span className="font-bold text-emerald-800 font-mono-tabular">
            {report.nivel4Count}/{report.totalFields} rubros en Nivel IV
          </span>
          <span className="text-slate-300" aria-hidden="true">
            |
          </span>
          <span
            className={`font-bold font-mono-tabular ${
              report.needsDepthCount > 0 ? 'text-amber-900' : 'text-emerald-800'
            }`}
          >
            {report.needsDepthCount} rubro(s) requieren mayor profundidad argumentativa
          </span>
        </div>

        <div className="inline-flex rounded-lg bg-slate-100 p-1 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setFilterMode('weak')}
            className={`rounded-md px-3 py-1 text-xs font-bold transition-colors cursor-pointer ${
              filterMode === 'weak'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Por profundizar ({report.needsDepthCount})
          </button>
          <button
            type="button"
            onClick={() => setFilterMode('all')}
            className={`rounded-md px-3 py-1 text-xs font-bold transition-colors cursor-pointer ${
              filterMode === 'all'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Todos ({report.totalFields})
          </button>
        </div>
      </div>

      {/* Lista comparativa de rubros */}
      {visibleItems.length === 0 ? (
        <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-4 flex items-center gap-3 text-sm font-semibold text-emerald-900">
          <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-700" />
          <span>
            ¡Excelente! Todos los rubros de tu ficha alcanzan el estándar argumentativo de la
            Rúbrica de Nivel IV del FONDEP.
          </span>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 max-h-[460px] overflow-y-auto pr-1">
          {visibleItems.map((it) => {
            const st = levelStyles[it.level];
            return (
              <div
                key={it.fieldKey}
                className={`flex flex-col justify-between gap-3 rounded-xl border-2 p-3.5 ${st.cardBorder}`}
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-slate-600 font-mono-tabular">
                        Rubro {it.order} · {it.code} · {it.words}/{it.metaPalabras} pal.
                      </div>
                      <h4 className="text-sm font-extrabold text-slate-900 leading-snug">
                        {it.label}
                      </h4>
                    </div>
                    <div className="text-right shrink-0">
                      <span
                        className={`inline-block rounded-md px-2 py-0.5 text-xs font-extrabold ${st.badge}`}
                      >
                        {it.level}
                      </span>
                      <div className={`mt-0.5 text-xs font-extrabold font-mono-tabular ${st.scoreText}`}>
                        {it.score}/100
                      </div>
                    </div>
                  </div>

                  {/* Exigencia oficial Nivel IV */}
                  <div className="rounded-lg border border-slate-200 bg-white/90 p-2.5 text-xs text-slate-800">
                    <span className="font-extrabold text-slate-900">Exigencia Nivel IV: </span>
                    {it.rubricCriteria}
                  </div>

                  {/* 4 dimensiones de profundidad */}
                  <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                    {it.criteriaChecks.map((chk) => (
                      <div
                        key={chk.id}
                        className={`flex items-center gap-1 rounded-md px-2 py-1 font-semibold ${
                          chk.passed
                            ? 'bg-emerald-100/70 text-emerald-900'
                            : 'bg-amber-100/80 text-amber-950'
                        }`}
                      >
                        {chk.passed ? (
                          <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-700" />
                        ) : (
                          <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-700" />
                        )}
                        <span className="truncate">{chk.label}</span>
                      </div>
                    ))}
                  </div>

                  {/* Brechas argumentativas concretas */}
                  {it.argumentGaps.length > 0 && (
                    <ul className="space-y-1 text-xs text-slate-800 list-disc pl-4">
                      {it.argumentGaps.slice(0, 2).map((gap, gIdx) => (
                        <li key={gIdx}>{gap}</li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* Acciones por campo */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200/80">
                  <button
                    type="button"
                    onClick={() => onJumpToField(it.sectionId, it.fieldKey)}
                    className="inline-flex min-h-[36px] items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-800 hover:bg-slate-50 cursor-pointer"
                  >
                    <span>Ir al campo</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>

                  {it.needsDepth && (
                    <button
                      type="button"
                      onClick={() => onDeepenField(it)}
                      className="inline-flex min-h-[36px] items-center gap-1 rounded-lg bg-teal-700 px-3 py-1.5 text-xs font-bold text-white hover:bg-teal-800 cursor-pointer"
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      <span>Profundizar a Nivel IV</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};
