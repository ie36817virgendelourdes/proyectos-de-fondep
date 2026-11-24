import React from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  FileCode2,
  FileJson,
  FileText,
  FileType,
  Home,
  RefreshCw,
} from 'lucide-react';
import {RUBRO_ACCENT_COLORS} from '../data/cnpieCatalogs';
import {SCHEMA_FICHAS} from '../data/cnpieSchemas';
import type {ProjectModel} from '../types/cnpie';
import {
  computeStepProgressData,
  getProjectBonuses,
  getProjectFinancialRules,
  getRequiredInstrumentsForProject,
} from '../utils/cnpieEngine';
import {buildOrderedExpedienteSections} from '../utils/cnpieExporters';
import {ProjectDashboardPanel} from './ProjectDashboardPanel';

interface Step3AuditViewProps {
  project: ProjectModel;
  onExportWord: () => void;
  onExportPDF: () => void;
  onExportWeb: () => void;
  onExportJSON: () => void;
  onBackToRubros: () => void;
  onBackHome: () => void;
  onNavigateAlert: (targetView: 'step1' | 'step2', sectionId: string, fieldKey?: string) => void;
  onEnterReadingMode: () => void;
  onNotify: (msg: string) => void;
}

export const Step3AuditView: React.FC<Step3AuditViewProps> = ({
  project,
  onExportWord,
  onExportPDF,
  onExportWeb,
  onExportJSON,
  onBackToRubros,
  onBackHome,
  onNavigateAlert,
  onEnterReadingMode,
  onNotify,
}) => {
  const prog = computeStepProgressData(project);
  const bonus = getProjectBonuses(project);
  const fin = getProjectFinancialRules(project);
  const schema = SCHEMA_FICHAS[project.category];
  const reqInst = getRequiredInstrumentsForProject(project);
  const ordered = buildOrderedExpedienteSections(project);

  const readyInst = reqInst.filter(
    (i) =>
      ((project.instruments && project.instruments[i.id]) || '').trim().length >= 60 ||
      Boolean(project.instrumentsChecked && project.instrumentsChecked[i.id])
  ).length;

  let totalB = 0;
  (project.cuadroB || []).forEach((r) => {
    totalB += (Number(r.cant) || 0) * (Number(r.unit) || 0);
  });

  const checks = [
    {
      ok: prog.missingNarrativeCount === 0,
      title: `Rubros Narrativos (${schema.code})`,
      desc:
        prog.missingNarrativeCount === 0
          ? 'Todos los rubros completos y calibrados a -100 palabras.'
          : `Faltan completar ${prog.missingNarrativeCount} rubro(s) en el Paso 2.`,
    },
    {
      ok: Boolean(project.arbolProblemas && project.arbolProblemas.problemaCentral),
      title: 'Árbol de Problemas (Numeral 1.1.1)',
      desc: 'Diagrama causal con Efecto Final, 3 Efectos, Problema Central y 3 Causas Directas/Indirectas.',
    },
    {
      ok: (project.cuadroA || []).length >= 3 && totalB > 0 && totalB <= fin.maxMonto,
      title: 'Cuadro A (Plan 2027) y Cuadro B (Anexo N° 5)',
      desc: `Presupuesto total: S/ ${totalB.toFixed(2)} / Tope S/ ${fin.maxMonto.toLocaleString('es-PE')}.`,
    },
    {
      ok: readyInst === reqInst.length,
      title: 'Instrumentos y Evidencias por Modalidad',
      desc: `${readyInst} de ${reqInst.length} instrumentos obligatorios listos.`,
    },
  ];

  const scoreTone =
    prog.s3Score >= 85
      ? {
          ring: 'border-emerald-600 text-emerald-700',
          label: 'Nivel IV · Excelente (Apto para postular)',
        }
      : prog.s3Score >= 70
      ? {
          ring: 'border-amber-600 text-amber-700',
          label: 'Nivel III · Aprobatorio (Revisar detalles)',
        }
      : {
          ring: 'border-red-600 text-red-700',
          label: 'En proceso · Completar rubros faltantes',
        };

  return (
    <div className="space-y-5">
      {/* Panel de Control Visual con Recharts y Alertas */}
      <ProjectDashboardPanel project={project} onNavigateAlert={onNavigateAlert} />

      {/* Auditoría Rúbrica Nivel IV */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div>
            <h2 className="text-xl font-extrabold text-slate-900">
              Auditoría Pedagógica y Financiera (Rúbrica Nivel IV · 100 pts)
            </h2>
            <p className="mt-1 text-sm sm:text-base text-slate-700">
              Verifica el cumplimiento de extensión (-100 pal.), presupuesto Anexo N° 5, Árbol de
              Problemas e instrumentos.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onEnterReadingMode}
              className="inline-flex min-h-[42px] items-center gap-1.5 rounded-lg border border-stone-300 bg-stone-50 px-3.5 py-2 text-sm font-semibold text-stone-900 hover:bg-stone-100 whitespace-nowrap cursor-pointer"
            >
              <BookOpen className="h-4 w-4 text-red-800" />
              <span>Lectura de Proyecto</span>
            </button>
            <button
              type="button"
              onClick={() => onNotify(`Puntaje actualizado: ${prog.s3Score}/100 puntos.`)}
              className="inline-flex min-h-[42px] items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50 whitespace-nowrap cursor-pointer"
            >
              <RefreshCw className="h-4 w-4" />
              <span>Recalcular Puntaje</span>
            </button>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 lg:grid-cols-12 gap-5 items-center">
          <div className="lg:col-span-4 flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-slate-50/70 p-5 text-center">
            <div
              className={`flex h-28 w-28 flex-col items-center justify-center rounded-full border-8 bg-white ${scoreTone.ring}`}
            >
              <span className="text-3xl font-extrabold font-mono-tabular text-slate-900 leading-none">
                {prog.s3Score}
              </span>
              <span className="text-sm font-semibold text-slate-600 mt-1">/ 100 pts</span>
            </div>
            <div className={`mt-3 text-base font-bold ${scoreTone.ring.split(' ')[1]}`}>
              {scoreTone.label}
            </div>
            <div className="mt-1 text-sm font-semibold text-teal-800">
              Bonificación adicional: +{bonus.pct}%
              {bonus.points ? ` y +${bonus.points} pts` : ''}
            </div>
          </div>

          <div className="lg:col-span-8 space-y-2.5">
            {checks.map((c, idx) => (
              <div
                key={idx}
                className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4"
              >
                {c.ok ? (
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600 mt-0.5" />
                ) : (
                  <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600 mt-0.5" />
                )}
                <div>
                  <div className="text-base font-bold text-slate-900">{c.title}</div>
                  <div className="text-sm text-slate-700 mt-0.5">{c.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Barra de Descargas Ordenadas */}
        <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <div className="text-sm sm:text-base font-bold text-slate-900 mb-3">
            Descargar Expediente Ordenado por 7 Secciones Oficiales (100% Offline)
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
            <button
              type="button"
              onClick={onExportWord}
              className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-800 cursor-pointer"
            >
              <FileType className="h-4 w-4" />
              <span>Word (.doc)</span>
            </button>
            <button
              type="button"
              onClick={onExportPDF}
              className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-xl bg-red-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-red-800 cursor-pointer"
            >
              <FileText className="h-4 w-4" />
              <span>PDF Nativo (.pdf)</span>
            </button>
            <button
              type="button"
              onClick={onExportWeb}
              className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-xl bg-teal-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-teal-800 cursor-pointer"
            >
              <FileCode2 className="h-4 w-4" />
              <span>Formato Web (.html)</span>
            </button>
            <button
              type="button"
              onClick={onExportJSON}
              className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-xl bg-slate-800 px-4 py-2.5 text-sm font-bold text-white hover:bg-slate-900 cursor-pointer"
            >
              <FileJson className="h-4 w-4" />
              <span>Respaldo (.json)</span>
            </button>
          </div>
        </div>
      </section>

      {/* Vista Previa Consolidada y Ordenada */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs">
        <div className="border-b border-slate-200 pb-4">
          <p className="text-sm font-bold text-red-800">
            Concurso Nacional de Proyectos de Innovación Educativa 2027 · FONDEP
          </p>
          <h3 className="mt-1 text-xl sm:text-2xl font-extrabold text-slate-900">
            {project.seed.titulo || 'Proyecto sin título'}
          </h3>
          <p className="mt-1 text-sm text-slate-700">
            {ordered.labels.catLabel} · {ordered.labels.modLabel} · {ordered.labels.montoLabel}
          </p>
        </div>

        <div className="mt-5 space-y-6 text-base text-slate-800">
          <div>
            <h4 className="text-sm font-extrabold text-blue-800 mb-2">
              SECCIÓN I · ANEXO N° 1: DATOS DE LA IE, BENEFICIARIOS Y EQUIPO RESPONSABLE
            </h4>
            <p className="text-sm sm:text-base text-slate-800 leading-relaxed">
              <strong>IE:</strong> {project.ie.nombre || '-'} (Cód. Mod. {project.ie.codigo || '-'}
              ) · <strong>DRE/UGEL:</strong> {project.ie.dre || '-'} / {project.ie.ugel || '-'} ·{' '}
              <strong>Ubicación:</strong> {project.ie.distrito || '-'},{' '}
              {project.ie.provincia || '-'}, {project.ie.region || '-'} ({project.ie.area})
            </p>
            <p className="mt-1.5 text-sm sm:text-base text-slate-800 leading-relaxed">
              <strong>Director(a):</strong> {project.equipo.director.nombre || '-'} (DNI{' '}
              {project.equipo.director.dni || '-'}) · <strong>Coordinador(a):</strong>{' '}
              {project.equipo.coordinador.nombre || '-'} (DNI{' '}
              {project.equipo.coordinador.dni || '-'})
            </p>
            {project.beneficiarios &&
              (project.beneficiarios.directos || project.beneficiarios.indirectos) && (
                <p className="mt-1.5 text-sm sm:text-base text-slate-800 leading-relaxed">
                  <strong>Beneficiarios Directos:</strong>{' '}
                  {project.beneficiarios.directos || '-'} ·{' '}
                  <strong>Indirectos:</strong> {project.beneficiarios.indirectos || '-'}
                </p>
              )}
          </div>

          <div>
            <h4 className="text-sm font-extrabold text-blue-800 mb-3">
              SECCIÓN II · FICHA DESCRIPTIVA ORDENADA ({ordered.schema.code})
            </h4>
            <div className="space-y-4">
              {ordered.rubrosOrdered.map((r) => {
                const pal = RUBRO_ACCENT_COLORS[(r.order - 1) % RUBRO_ACCENT_COLORS.length];
                return (
                  <div
                    key={r.code}
                    className={`overflow-hidden rounded-xl border-2 bg-white ${pal.cardBorder}`}
                  >
                    <div className={`h-1.5 w-full ${pal.topStripe}`} aria-hidden="true" />
                    <div className="p-4">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <span
                          className={`rounded-md px-2.5 py-0.5 text-xs font-bold font-mono-tabular ${pal.badge}`}
                        >
                          Rubro {r.order} · {r.code}
                        </span>
                        <span className="text-base font-bold text-slate-900">{r.label}</span>
                      </div>
                      <div className="whitespace-pre-line text-sm sm:text-base text-slate-800 leading-relaxed">
                        {r.text}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div>
            <h4 className="text-sm font-extrabold text-blue-800 mb-2">
              SECCIÓN III · ÁRBOL DE PROBLEMAS Y ÁRBOL DE OBJETIVOS (MARCO LÓGICO · 1.1.1)
            </h4>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-2 text-sm sm:text-base leading-relaxed">
              <p>
                <strong>Efecto Final:</strong> {ordered.arbol.efectoFinal}
              </p>
              <p>
                <strong>Efectos Directos:</strong> 1) {ordered.arbol.efectosDirectos[0]} · 2){' '}
                {ordered.arbol.efectosDirectos[1]} · 3) {ordered.arbol.efectosDirectos[2]}
              </p>
              <p>
                <strong>Problema Central:</strong> {ordered.arbol.problemaCentral}
              </p>
              <p>
                <strong>Causas Directas:</strong> 1) {ordered.arbol.causasDirectas[0]} · 2){' '}
                {ordered.arbol.causasDirectas[1]} · 3) {ordered.arbol.causasDirectas[2]}
              </p>
              {project.arbolObjetivos && project.arbolObjetivos.objetivoGeneral && (
                <div className="mt-2 border-t border-slate-200 pt-2 text-blue-950 space-y-1">
                  <p>
                    <strong>Objetivo General (En positivo):</strong>{' '}
                    {project.arbolObjetivos.objetivoGeneral}
                  </p>
                  <p>
                    <strong>Fin Principal:</strong> {project.arbolObjetivos.finPrincipal}
                  </p>
                </div>
              )}
            </div>
          </div>

          <div>
            <h4 className="text-sm font-extrabold text-red-800 mb-1.5">
              SECCIÓN IV Y V · PLAN DE ACTIVIDADES (CUADRO A) Y PRESUPUESTO (CUADRO B)
            </h4>
            <p className="text-sm sm:text-base text-slate-800 font-mono-tabular">
              Actividades registradas: {(project.cuadroA || []).length} · Subtotal Bienes: S/{' '}
              {ordered.bSum.toFixed(2)} · Subtotal Servicios: S/ {ordered.sSum.toFixed(2)} ·{' '}
              <strong>Total: S/ {ordered.totalSum.toFixed(2)}</strong>
            </p>
          </div>

          <div>
            <h4 className="text-sm font-extrabold text-red-800 mb-1.5">
              SECCIÓN VI Y VII · DECLARACIONES JURADAS (ANEXOS 3 Y 4) E INSTRUMENTOS (
              {ordered.reqInst.length})
            </h4>
            <p className="text-sm sm:text-base text-slate-800 leading-relaxed">
              Incluye Anexos N° 3 y N° 4 completos, enlace YouTube (
              {project.videoUrl || 'Por registrar'}) y los {ordered.reqInst.length} instrumentos
              técnicos de la modalidad.
            </p>
          </div>
        </div>
      </section>

      {/* Navegación inferior */}
      <div className="no-print flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBackToRubros}
          className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50 cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Volver a Rubros</span>
        </button>
        <button
          type="button"
          onClick={onBackHome}
          className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 cursor-pointer"
        >
          <Home className="h-4 w-4" />
          <span>Volver al Inicio</span>
        </button>
      </div>
    </div>
  );
};
