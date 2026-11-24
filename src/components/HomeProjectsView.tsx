import React, {useRef} from 'react';
import {
  BookOpen,
  Copy,
  FilePlus2,
  FolderOpen,
  Image as ImageIcon,
  KeyRound,
  Sparkles,
  Trash2,
  Upload,
} from 'lucide-react';
import {SCHEMA_FICHAS} from '../data/cnpieSchemas';
import type {AuthState, ProjectModel} from '../types/cnpie';
import {
  getTrialStatus,
  isAdminSession,
  isLicensedUser,
} from '../utils/cnpieAuth';
import {computeStepProgressData, getModalityAndProjectLabels} from '../utils/cnpieEngine';

interface HomeProjectsViewProps {
  projects: ProjectModel[];
  activeProjectId: string | null;
  auth: AuthState;
  onCreateNew: () => void;
  onCreateDemo: () => void;
  onOpenProject: (id: string) => void;
  onDuplicateProject: (id: string) => void;
  onDeleteProject: (id: string) => void;
  onImportJSON: (file: File) => void;
  onOpenAuth: () => void;
  onOpenAdminTeachers?: () => void;
  onShowCover?: () => void;
  onReadProject?: (id: string) => void;
}

export const HomeProjectsView: React.FC<HomeProjectsViewProps> = ({
  projects,
  activeProjectId,
  auth,
  onCreateNew,
  onCreateDemo,
  onOpenProject,
  onDuplicateProject,
  onDeleteProject,
  onImportJSON,
  onOpenAuth,
  onOpenAdminTeachers,
  onShowCover,
  onReadProject,
}) => {
  const fileRef = useRef<HTMLInputElement>(null);
  const licensed = isLicensedUser(auth);
  const admin = isAdminSession(auth);
  const trial = getTrialStatus(auth);
  const teacherCount = (auth.registeredTeachers || []).length;

  return (
    <div className="space-y-6">
      {/* Portada del Taller Guiado por Misiones y Marco Lógico */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-7 shadow-xs space-y-5">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          <div className="lg:col-span-7 flex flex-col justify-between space-y-4">
            <div>
              <p className="text-sm font-extrabold text-blue-800">
                Asistente Offline de Proyectos Pedagógicos · FONDEP CNPIE 2027
              </p>
              <h1 className="mt-1.5 text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
                Formula tu Proyecto de Innovación Educativa paso a paso por Misiones
              </h1>
              <p className="mt-2.5 text-base text-slate-700 leading-relaxed">
                Organiza tu diagnóstico institucional, transforma tu Árbol de Problemas en Árbol de
                Objetivos, redacta cada misión con dictado por voz y sugerencias, y descarga tu ficha
                en Word o PDF sin conexión a internet.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 pt-1">
              <button
                type="button"
                onClick={onCreateNew}
                className="inline-flex min-h-[46px] items-center gap-2 rounded-xl bg-blue-700 px-4.5 py-2.5 text-sm sm:text-base font-bold text-white transition-colors hover:bg-blue-800 whitespace-nowrap shrink-0 cursor-pointer"
              >
                <FilePlus2 className="h-4 w-4" aria-hidden="true" />
                <span>Nuevo Proyecto</span>
              </button>
              <button
                type="button"
                onClick={onCreateDemo}
                className="inline-flex min-h-[46px] items-center gap-2 rounded-xl bg-teal-700 px-4.5 py-2.5 text-sm sm:text-base font-bold text-white transition-colors hover:bg-teal-800 whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Sparkles className="h-4 w-4" aria-hidden="true" />
                <span>Cargar Ejemplo</span>
              </button>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="inline-flex min-h-[46px] items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 transition-colors hover:bg-slate-50 whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Upload className="h-4 w-4" aria-hidden="true" />
                <span>Importar JSON</span>
              </button>
              {onShowCover && (
                <button
                  type="button"
                  onClick={onShowCover}
                  className="inline-flex min-h-[46px] items-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-4 py-2.5 text-sm font-semibold text-amber-950 transition-colors hover:bg-amber-100 whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <ImageIcon className="h-4 w-4 text-amber-700" aria-hidden="true" />
                  <span>Ver Portada</span>
                </button>
              )}
              <input
                ref={fileRef}
                type="file"
                accept=".json"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) onImportJSON(f);
                  e.target.value = '';
                }}
              />
            </div>
          </div>

          {/* 4 Bloques de la Ruta Metodológica */}
          <div className="lg:col-span-5 rounded-xl border border-blue-200 bg-blue-50/60 p-4 sm:p-5 flex flex-col justify-between space-y-3">
            <div className="text-sm font-extrabold text-blue-950">
              Ruta de Formulación (Enfoque Marco Lógico)
            </div>
            <div className="divide-y divide-blue-200/70 text-sm text-slate-800">
              <div className="py-2 first:pt-0">
                <span className="font-extrabold text-blue-800">01. Contexto y Beneficiarios:</span>{' '}
                Registra tu IE, modalidad, equipo y estudiantes directos e indirectos.
              </div>
              <div className="py-2">
                <span className="font-extrabold text-teal-800">02. Árbol de Problemas y Objetivos:</span>{' '}
                Parte del Problema Central y conviértelo en fines y objetivos medibles.
              </div>
              <div className="py-2">
                <span className="font-extrabold text-indigo-800">03. Misiones con Dictado y Guía:</span>{' '}
                Redacta rubro por rubro con sugerencias Nivel IV, Cuadro A y Anexo N° 5.
              </div>
              <div className="py-2 last:pb-0">
                <span className="font-extrabold text-red-800">04. Vista Previa y Descarga:</span>{' '}
                Audita tu puntaje (0–100) y exporta en Word, PDF o Web offline.
              </div>
            </div>
          </div>
        </div>

        {/* Estado de sesión / Ingreso libre de 2 días / Registro de Docentes */}
        <div
          className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-xl border p-4 text-sm sm:text-base ${
            licensed
              ? 'border-emerald-200 bg-emerald-50/70 text-emerald-950'
              : trial.status === 'active'
              ? 'border-blue-200 bg-blue-50/60 text-slate-900'
              : 'border-amber-200 bg-amber-50 text-amber-950'
          }`}
        >
          <div>
            {admin ? (
              <span>
                <strong>Sesión de Administrador activa:</strong> Tienes{' '}
                <strong>{teacherCount}</strong> docente(s) registrados con usuario y clave. Puedes
                agregar o administrar sus accesos aquí.
              </span>
            ) : licensed ? (
              <span>
                <strong>
                  Sesión Docente Activa ({auth.activeDisplayName || auth.activeUser}):
                </strong>{' '}
                Acceso habilitado para formular, auditar y exportar proyectos CNPIE 2027 sin
                conexión.
              </span>
            ) : (
              <span>
                <strong>Ingreso Libre por 2 Días (48 horas):</strong> Te quedan{' '}
                <strong>{trial.remainingLabel}</strong> de uso libre. Después de 2 días, el
                aplicativo solicitará tu usuario y contraseña de Docente o Administrador.
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {admin && onOpenAdminTeachers && (
              <button
                type="button"
                onClick={onOpenAdminTeachers}
                className="inline-flex min-h-[42px] items-center gap-1.5 rounded-lg bg-teal-700 px-3.5 py-2 text-sm font-bold text-white hover:bg-teal-800 whitespace-nowrap cursor-pointer"
              >
                <KeyRound className="h-4 w-4" aria-hidden="true" />
                <span>Registrar Docentes ({teacherCount})</span>
              </button>
            )}
            <button
              type="button"
              onClick={onOpenAuth}
              className="inline-flex min-h-[42px] items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50 whitespace-nowrap cursor-pointer"
            >
              <KeyRound className="h-4 w-4" aria-hidden="true" />
              <span>{licensed ? 'Cuenta / Admin' : 'Usuario y Clave / Admin'}</span>
            </button>
          </div>
        </div>
      </section>

      {/* Lista de proyectos */}
      <section aria-label="Lista de proyectos guardados">
        {projects.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
            <h2 className="text-base font-bold text-slate-900">
              Aún no tienes proyectos guardados en este dispositivo
            </h2>
            <p className="mt-1.5 text-sm text-slate-600 max-w-md mx-auto">
              Explora una postulación completa de ejemplo con Árbol de Problemas, Árbol de Objetivos
              e instrumentos, o inicia un nuevo proyecto desde cero.
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-2.5">
              <button
                type="button"
                onClick={onCreateDemo}
                className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-800 cursor-pointer"
              >
                <Sparkles className="h-4 w-4" />
                <span>Cargar Proyecto Ejemplo</span>
              </button>
              <button
                type="button"
                onClick={onCreateNew}
                className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 cursor-pointer"
              >
                <FilePlus2 className="h-4 w-4" />
                <span>Nuevo Proyecto</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {projects.map((p) => {
              const schema = SCHEMA_FICHAS[p.category] || SCHEMA_FICHAS['2B'];
              const prog = computeStepProgressData(p);
              const labels = getModalityAndProjectLabels(p);
              const isActive = p.id === activeProjectId;

              return (
                <article
                  key={p.id}
                  className={`flex flex-col justify-between rounded-2xl border bg-white p-4 sm:p-5 transition-colors ${
                    isActive ? 'border-blue-700 ring-1 ring-blue-700/15' : 'border-slate-200'
                  }`}
                >
                  <div>
                    {/* Quiet 1-line unboxed metadata */}
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-slate-600 font-mono-tabular">
                      <span className="font-bold text-blue-800">{schema.code}</span>
                      <span aria-hidden="true">·</span>
                      <span>{labels.modLabel}</span>
                      <span aria-hidden="true">·</span>
                      <span>Avance {prog.s2Pct}%</span>
                      <span aria-hidden="true">·</span>
                      <span>Puntaje {prog.s3Score}/100</span>
                    </div>

                    <h2 className="mt-2 text-lg font-extrabold text-slate-900 leading-snug">
                      {p.seed.titulo || 'Proyecto sin título definido'}
                    </h2>

                    <p className="mt-1.5 text-sm text-slate-700">
                      IE: {p.ie.nombre || 'Sin Institución Educativa'} · UGEL:{' '}
                      {p.ie.ugel || 'Sin UGEL'}
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => onOpenProject(p.id)}
                      className="inline-flex min-h-[44px] flex-1 sm:flex-none items-center justify-center gap-1.5 rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 whitespace-nowrap cursor-pointer"
                    >
                      <FolderOpen className="h-4 w-4" aria-hidden="true" />
                      <span>Abrir y Editar</span>
                    </button>

                    <div className="flex items-center gap-1.5">
                      {onReadProject && (
                        <button
                          type="button"
                          onClick={() => onReadProject(p.id)}
                          className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-stone-300 bg-stone-50 px-3.5 py-2 text-sm font-semibold text-stone-900 hover:bg-stone-100 whitespace-nowrap cursor-pointer"
                        >
                          <BookOpen className="h-4 w-4 text-red-800" aria-hidden="true" />
                          <span>Leer</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => onDuplicateProject(p.id)}
                        className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50 whitespace-nowrap cursor-pointer"
                      >
                        <Copy className="h-4 w-4" aria-hidden="true" />
                        <span>Duplicar</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteProject(p.id)}
                        aria-label="Eliminar proyecto"
                        className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-red-200 bg-white text-red-700 hover:bg-red-50 cursor-pointer"
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};
