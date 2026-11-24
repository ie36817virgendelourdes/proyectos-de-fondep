import React, {useEffect, useMemo, useState} from 'react';
import {
  ArrowLeft,
  BookOpen,
  List,
  Maximize2,
  Minimize2,
  Printer,
  Type,
  X,
} from 'lucide-react';
import {buildProjectContext, countWords, generateArbolObjetivosData} from '../utils/cnpieEngine';
import {buildOrderedExpedienteSections} from '../utils/cnpieExporters';
import type {ProjectModel} from '../types/cnpie';

interface ProjectReadingModeProps {
  project: ProjectModel;
  onExit: () => void;
}

type PaperTheme = 'warm' | 'pure' | 'sepia';
type FontScale = 'normal' | 'large' | 'xlarge';
type FontStyle = 'serif' | 'sans';

const PAPER_STYLES: Record<
  PaperTheme,
  {
    label: string;
    outerBg: string;
    sheetBg: string;
    barBg: string;
    textPrimary: string;
    textSecondary: string;
    textMuted: string;
    border: string;
    tableHead: string;
    subtleSurface: string;
  }
> = {
  warm: {
    label: 'Papel Cálido',
    outerBg: 'bg-[#F5F2EB]',
    sheetBg: 'bg-[#FFFDF9]',
    barBg: 'bg-[#F5F2EB]/92',
    textPrimary: 'text-stone-900',
    textSecondary: 'text-stone-800',
    textMuted: 'text-stone-500',
    border: 'border-stone-200',
    tableHead: 'bg-stone-100 text-stone-900',
    subtleSurface: 'bg-stone-50/80',
  },
  pure: {
    label: 'Blanco Editorial',
    outerBg: 'bg-slate-100',
    sheetBg: 'bg-white',
    barBg: 'bg-white/92',
    textPrimary: 'text-slate-900',
    textSecondary: 'text-slate-800',
    textMuted: 'text-slate-500',
    border: 'border-slate-200',
    tableHead: 'bg-slate-100 text-slate-900',
    subtleSurface: 'bg-slate-50',
  },
  sepia: {
    label: 'Sepia Suave',
    outerBg: 'bg-[#EDE5D5]',
    sheetBg: 'bg-[#F8F3E8]',
    barBg: 'bg-[#EDE5D5]/92',
    textPrimary: 'text-stone-900',
    textSecondary: 'text-stone-800',
    textMuted: 'text-stone-600',
    border: 'border-amber-900/15',
    tableHead: 'bg-[#EAE0CC] text-stone-900',
    subtleSurface: 'bg-[#F2EBD9]',
  },
};

const FONT_SCALES: Record<FontScale, {label: string; prose: string}> = {
  normal: {label: 'Estándar', prose: 'text-[17px] leading-[1.82]'},
  large: {label: 'Amplia', prose: 'text-[19px] leading-[1.85]'},
  xlarge: {label: 'Máxima', prose: 'text-[21px] leading-[1.88]'},
};

export const ProjectReadingMode: React.FC<ProjectReadingModeProps> = ({project, onExit}) => {
  const [paperTheme, setPaperTheme] = useState<PaperTheme>('warm');
  const [fontScale, setFontScale] = useState<FontScale>('normal');
  const [fontStyle, setFontStyle] = useState<FontStyle>('serif');
  const [tocOpen, setTocOpen] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const ordered = useMemo(() => buildOrderedExpedienteSections(project), [project]);
  const arbolObjetivos = useMemo(() => {
    if (project.arbolObjetivos && project.arbolObjetivos.objetivoGeneral) {
      return project.arbolObjetivos;
    }
    return generateArbolObjetivosData(ordered.arbol, buildProjectContext(project));
  }, [project, ordered.arbol]);

  const sectionsWithRubros = useMemo(() => {
    let runningOrder = 1;
    return ordered.schema.sections
      .map((sec) => {
        const fields = sec.fields.map((f) => {
          const orderNum = runningOrder++;
          const raw = (project.fields[f.key] || '').trim();
          return {
            order: orderNum,
            key: f.key,
            code: f.code,
            label: f.label,
            rawText: raw,
            paragraphs: raw
              ? raw
                  .split(/\n\s*\n+/)
                  .map((p) => p.trim())
                  .filter(Boolean)
              : [],
          };
        });
        return {
          id: sec.id,
          tab: sec.tab,
          fields,
        };
      })
      .filter((s) => s.fields.length > 0);
  }, [ordered.schema.sections, project.fields]);

  const readingMetrics = useMemo(() => {
    let words = 0;
    words += countWords(project.seed.titulo || '');
    words += countWords(project.seed.problema || '');
    words += countWords(project.seed.solucion || '');
    sectionsWithRubros.forEach((sec) => {
      sec.fields.forEach((f) => {
        if (f.rawText) words += countWords(f.rawText);
      });
    });
    ordered.reqInst.forEach((inst) => {
      const txt = (project.instruments && project.instruments[inst.id]) || '';
      words += countWords(txt);
    });
    const minutes = Math.max(1, Math.round(words / 190));
    return {words, minutes};
  }, [ordered.reqInst, project, sectionsWithRubros]);

  const teamMembers = useMemo(
    () => [
      {rol: 'Director(a)', ...project.equipo.director},
      {rol: 'Coordinador(a)', ...project.equipo.coordinador},
      ...(project.equipo.integrantes || []).map((m) => ({
        rol: m.cargo || 'Docente integrante',
        ...m,
      })),
    ],
    [project.equipo]
  );

  const tocItems = useMemo(
    () => [
      {id: 'read-sec-1', label: 'I. Contexto Institucional y Equipo'},
      {id: 'read-sec-2', label: `II. Ficha Descriptiva (${ordered.schema.code})`},
      {id: 'read-sec-3', label: 'III. Marco Lógico: Problemas y Objetivos'},
      {id: 'read-sec-4', label: 'IV. Plan de Implementación 2027 (Cuadro A)'},
      {id: 'read-sec-5', label: 'V. Presupuesto Detallado (Cuadro B)'},
      {id: 'read-sec-6', label: 'VI. Declaraciones Juradas (Anexos 3 y 4)'},
      {id: 'read-sec-7', label: 'VII. Instrumentos y Evidencias'},
    ],
    [ordered.schema.code]
  );

  useEffect(() => {
    window.scrollTo({top: 0, behavior: 'auto'});
  }, []);

  useEffect(() => {
    const onScroll = () => {
      const doc = document.documentElement;
      const scrollTop = window.scrollY || doc.scrollTop;
      const maxScroll = Math.max(1, doc.scrollHeight - window.innerHeight);
      const pct = Math.min(100, Math.max(0, Math.round((scrollTop / maxScroll) * 100)));
      setScrollProgress(pct);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, {passive: true});
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const onFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (tocOpen) {
          setTocOpen(false);
        } else if (!document.fullscreenElement) {
          onExit();
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [tocOpen, onExit]);

  const handleToggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch {
      // Fallback: if embedded iframe denies fullscreen API, keep fluid full-viewport layout
    }
  };

  const handleExit = async () => {
    if (document.fullscreenElement) {
      try {
        await document.exitFullscreen();
      } catch {
        // ignore exit fullscreen errors
      }
    }
    onExit();
  };

  const jumpToSection = (id: string) => {
    setTocOpen(false);
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({behavior: 'smooth', block: 'start'});
    }
  };

  const theme = PAPER_STYLES[paperTheme];
  const scale = FONT_SCALES[fontScale];
  const proseFontClass = fontStyle === 'serif' ? 'font-academic-serif' : 'font-sans';

  return (
    <div
      className={`min-h-screen transition-colors duration-200 ${theme.outerBg} ${theme.textPrimary}`}
    >
      {/* Barra superior minimalista exclusiva de Lectura (se oculta al imprimir) */}
      <header
        className={`no-print sticky top-0 z-40 border-b ${theme.border} ${theme.barBg} backdrop-blur-md`}
      >
        <div
          className="h-0.5 bg-red-800 transition-transform duration-150 origin-left"
          style={{transform: `scaleX(${scrollProgress / 100})`}}
          aria-hidden="true"
        />
        <div className="mx-auto flex h-13 max-w-6xl items-center justify-between gap-3 px-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={handleExit}
              className={`inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border ${theme.border} bg-white/80 px-3 py-1.5 text-sm font-semibold ${theme.textPrimary} hover:bg-white whitespace-nowrap shrink-0 cursor-pointer`}
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              <span>Salir de Lectura</span>
            </button>
            <span
              className={`hidden sm:inline-block truncate text-xs font-medium ${theme.textMuted}`}
            >
              Modo Lectura de Proyecto · {scrollProgress}% leído
            </span>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setTocOpen((v) => !v)}
              className={`inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border ${theme.border} bg-white/80 px-2.5 sm:px-3 py-1.5 text-xs sm:text-sm font-semibold ${theme.textPrimary} hover:bg-white whitespace-nowrap cursor-pointer`}
            >
              <List className="h-4 w-4" aria-hidden="true" />
              <span className="hidden md:inline">Índice</span>
            </button>

            <button
              type="button"
              onClick={() =>
                setFontStyle((prev) => (prev === 'serif' ? 'sans' : 'serif'))
              }
              title="Cambiar tipografía"
              className={`inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border ${theme.border} bg-white/80 px-2.5 sm:px-3 py-1.5 text-xs sm:text-sm font-semibold ${theme.textPrimary} hover:bg-white whitespace-nowrap cursor-pointer`}
            >
              <BookOpen className="h-4 w-4" aria-hidden="true" />
              <span className="hidden lg:inline">
                {fontStyle === 'serif' ? 'Serif' : 'Sans'}
              </span>
            </button>

            <button
              type="button"
              onClick={() =>
                setFontScale((prev) =>
                  prev === 'normal' ? 'large' : prev === 'large' ? 'xlarge' : 'normal'
                )
              }
              title="Ajustar tamaño de texto"
              className={`inline-flex min-h-[38px] items-center gap-1 rounded-lg border ${theme.border} bg-white/80 px-2.5 sm:px-3 py-1.5 text-xs sm:text-sm font-semibold ${theme.textPrimary} hover:bg-white whitespace-nowrap cursor-pointer`}
            >
              <Type className="h-4 w-4" aria-hidden="true" />
              <span>{scale.label}</span>
            </button>

            <button
              type="button"
              onClick={() =>
                setPaperTheme((prev) =>
                  prev === 'warm' ? 'pure' : prev === 'pure' ? 'sepia' : 'warm'
                )
              }
              title="Cambiar tono de papel"
              className={`hidden sm:inline-flex min-h-[38px] items-center rounded-lg border ${theme.border} bg-white/80 px-2.5 py-1.5 text-xs font-semibold ${theme.textPrimary} hover:bg-white whitespace-nowrap cursor-pointer`}
            >
              {theme.label}
            </button>

            <button
              type="button"
              onClick={handleToggleFullscreen}
              title={isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
              className={`inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border ${theme.border} bg-white/80 px-2.5 sm:px-3 py-1.5 text-xs sm:text-sm font-semibold ${theme.textPrimary} hover:bg-white whitespace-nowrap cursor-pointer`}
            >
              {isFullscreen ? (
                <Minimize2 className="h-4 w-4" aria-hidden="true" />
              ) : (
                <Maximize2 className="h-4 w-4" aria-hidden="true" />
              )}
              <span className="hidden md:inline">
                {isFullscreen ? 'Restaurar' : 'Pantalla Completa'}
              </span>
            </button>

            <button
              type="button"
              onClick={() => window.print()}
              title="Imprimir documento"
              className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg bg-stone-900 px-3 py-1.5 text-xs sm:text-sm font-semibold text-white hover:bg-stone-800 whitespace-nowrap cursor-pointer"
            >
              <Printer className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">Imprimir</span>
            </button>
          </div>
        </div>
      </header>

      {/* Índice desplegable limpio */}
      {tocOpen && (
        <div className="no-print fixed inset-0 z-50 flex justify-end bg-black/25 backdrop-blur-[1px]">
          <nav
            aria-label="Índice del documento"
            className={`w-full max-w-sm h-full overflow-y-auto ${theme.sheetBg} border-l ${theme.border} p-6 shadow-xl space-y-5`}
          >
            <div className={`flex items-center justify-between border-b ${theme.border} pb-3`}>
              <span className="text-sm font-bold tracking-wide uppercase">
                Índice del Proyecto
              </span>
              <button
                type="button"
                onClick={() => setTocOpen(false)}
                aria-label="Cerrar índice"
                className="rounded-lg p-1.5 hover:bg-stone-200/60 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <ul className="space-y-1.5">
              {tocItems.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => jumpToSection(item.id)}
                    className={`w-full text-left rounded-lg px-3 py-2 text-sm font-medium ${theme.textSecondary} hover:bg-stone-200/50 transition-colors cursor-pointer`}
                  >
                    {item.label}
                  </button>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      )}

      {/* Documento Académico Fluido */}
      <main className="mx-auto max-w-5xl px-4 sm:px-8 py-6 sm:py-12">
        <article
          className={`mx-auto rounded-xl border ${theme.border} ${theme.sheetBg} px-6 py-10 sm:px-14 sm:py-14 shadow-sm`}
        >
          {/* Portada / Encabezado del Documento */}
          <header className={`border-b ${theme.border} pb-8`}>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-red-900">
              Concurso Nacional de Proyectos de Innovación Educativa 2027 · FONDEP
            </p>
            <h1
              className={`mt-3 text-3xl sm:text-4xl lg:text-[2.6rem] font-bold tracking-tight leading-[1.18] ${theme.textPrimary} ${proseFontClass}`}
            >
              {project.seed.titulo || 'Proyecto de Innovación Educativa sin título definido'}
            </h1>
            <div
              className={`mt-5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-sm ${theme.textMuted}`}
            >
              <span>{ordered.schema.code}</span>
              <span aria-hidden="true">·</span>
              <span>{ordered.labels.catLabel}</span>
              <span aria-hidden="true">·</span>
              <span>{ordered.labels.modLabel}</span>
              <span aria-hidden="true">·</span>
              <span>Subvención: {ordered.labels.montoLabel}</span>
              <span aria-hidden="true">·</span>
              <span className="tabular-nums">
                {readingMetrics.words} palabras ({readingMetrics.minutes} min de lectura)
              </span>
            </div>
          </header>

          {/* Resumen Ejecutivo Inicial (Problema Central y Propuesta) */}
          {(project.seed.problema || project.seed.solucion) && (
            <section className={`border-b ${theme.border} py-8`}>
              <div className="max-w-[68ch] space-y-5">
                {project.seed.problema && (
                  <div>
                    <h2
                      className={`text-xs font-semibold uppercase tracking-[0.14em] ${theme.textMuted}`}
                    >
                      Situación Problemática Central
                    </h2>
                    <p
                      className={`mt-2 ${scale.prose} ${proseFontClass} ${theme.textSecondary}`}
                    >
                      {project.seed.problema}
                    </p>
                  </div>
                )}
                {project.seed.solucion && (
                  <div>
                    <h2
                      className={`text-xs font-semibold uppercase tracking-[0.14em] ${theme.textMuted}`}
                    >
                      Propuesta de Innovación Pedagógica
                    </h2>
                    <p
                      className={`mt-2 ${scale.prose} ${proseFontClass} ${theme.textSecondary}`}
                    >
                      {project.seed.solucion}
                    </p>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* I. Contexto Institucional, Beneficiarios y Equipo */}
          <section id="read-sec-1" className={`scroll-mt-20 border-b ${theme.border} py-10`}>
            <p className={`text-xs font-semibold uppercase tracking-[0.14em] ${theme.textMuted}`}>
              Sección I · Anexo N° 1
            </p>
            <h2 className={`mt-1 text-2xl font-bold ${theme.textPrimary} ${proseFontClass}`}>
              Contexto Institucional, Beneficiarios y Equipo Responsable
            </h2>

            <dl
              className={`mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-4 border-y ${theme.border} py-5 text-sm`}
            >
              <div>
                <dt className={`text-xs uppercase tracking-wider ${theme.textMuted}`}>
                  Institución Educativa
                </dt>
                <dd className="mt-1 font-semibold">
                  {project.ie.nombre || 'Sin especificar'}
                </dd>
              </div>
              <div>
                <dt className={`text-xs uppercase tracking-wider ${theme.textMuted}`}>
                  Código Modular
                </dt>
                <dd className="mt-1 font-mono-tabular font-semibold">
                  {project.ie.codigo || '—'}
                </dd>
              </div>
              <div>
                <dt className={`text-xs uppercase tracking-wider ${theme.textMuted}`}>
                  DRE / UGEL
                </dt>
                <dd className="mt-1 font-semibold">
                  {project.ie.dre || '—'} / {project.ie.ugel || '—'}
                </dd>
              </div>
              <div>
                <dt className={`text-xs uppercase tracking-wider ${theme.textMuted}`}>
                  Ubicación Geográfica
                </dt>
                <dd className="mt-1 font-semibold">
                  {[project.ie.distrito, project.ie.provincia, project.ie.region]
                    .filter(Boolean)
                    .join(', ') || '—'}
                </dd>
              </div>
              <div>
                <dt className={`text-xs uppercase tracking-wider ${theme.textMuted}`}>
                  Nivel y Estudiantes
                </dt>
                <dd className="mt-1 font-semibold tabular-nums">
                  {project.ie.nivel || '—'} ({project.ie.estudiantes || 0} estudiantes)
                </dd>
              </div>
              <div>
                <dt className={`text-xs uppercase tracking-wider ${theme.textMuted}`}>
                  Ámbito / Atención EIB
                </dt>
                <dd className="mt-1 font-semibold">
                  {project.ie.area} · {project.ie.eib_tipo}
                  {project.ie.lengua ? ` (${project.ie.lengua})` : ''}
                </dd>
              </div>
            </dl>

            {(project.beneficiarios?.directos || project.beneficiarios?.indirectos) && (
              <div className="mt-6 max-w-[68ch] space-y-4">
                {project.beneficiarios?.directos && (
                  <div>
                    <h3 className={`text-sm font-bold ${theme.textPrimary}`}>
                      Beneficiarios Directos
                    </h3>
                    <p
                      className={`mt-1 ${scale.prose} ${proseFontClass} ${theme.textSecondary}`}
                    >
                      {project.beneficiarios.directos}
                    </p>
                  </div>
                )}
                {project.beneficiarios?.indirectos && (
                  <div>
                    <h3 className={`text-sm font-bold ${theme.textPrimary}`}>
                      Beneficiarios Indirectos
                    </h3>
                    <p
                      className={`mt-1 ${scale.prose} ${proseFontClass} ${theme.textSecondary}`}
                    >
                      {project.beneficiarios.indirectos}
                    </p>
                  </div>
                )}
              </div>
            )}

            <div className="mt-7 overflow-x-auto">
              <table className={`w-full border-collapse text-sm border ${theme.border}`}>
                <thead>
                  <tr className={theme.tableHead}>
                    <th className={`border ${theme.border} px-3 py-2 text-left font-semibold`}>
                      Rol en el Equipo
                    </th>
                    <th className={`border ${theme.border} px-3 py-2 text-left font-semibold`}>
                      Apellidos y Nombres
                    </th>
                    <th className={`border ${theme.border} px-3 py-2 text-left font-semibold`}>
                      DNI
                    </th>
                    <th className={`border ${theme.border} px-3 py-2 text-left font-semibold`}>
                      Contacto
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {teamMembers.map((m, idx) => (
                    <tr key={idx}>
                      <td className={`border ${theme.border} px-3 py-2 font-medium`}>
                        {m.rol}
                      </td>
                      <td className={`border ${theme.border} px-3 py-2`}>
                        {m.nombre || '—'}
                      </td>
                      <td className={`border ${theme.border} px-3 py-2 font-mono-tabular`}>
                        {m.dni || '—'}
                      </td>
                      <td className={`border ${theme.border} px-3 py-2`}>
                        {[m.celular, m.correo].filter(Boolean).join(' · ') || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* II. Cuerpo Descriptivo del Proyecto (Ficha Oficial) */}
          <section id="read-sec-2" className={`scroll-mt-20 border-b ${theme.border} py-10`}>
            <p className={`text-xs font-semibold uppercase tracking-[0.14em] ${theme.textMuted}`}>
              Sección II · {ordered.schema.code}
            </p>
            <h2 className={`mt-1 text-2xl font-bold ${theme.textPrimary} ${proseFontClass}`}>
              Desarrollo Narrativo del Proyecto ({ordered.schema.linea})
            </h2>

            <div className="mt-8 space-y-10">
              {sectionsWithRubros.map((sec) => (
                <div key={sec.id} className="space-y-6">
                  <h3
                    className={`border-b ${theme.border} pb-2 text-lg font-bold tracking-tight ${theme.textPrimary}`}
                  >
                    {sec.tab}
                  </h3>

                  <div className="space-y-8">
                    {sec.fields.map((f) => (
                      <div key={f.key} className="max-w-[68ch]">
                        <h4
                          className={`text-base sm:text-lg font-bold ${theme.textPrimary} ${proseFontClass}`}
                        >
                          {f.order}. {f.code} — {f.label}
                        </h4>
                        {f.paragraphs.length > 0 ? (
                          <div className="mt-3 space-y-4">
                            {f.paragraphs.map((p, idx) => (
                              <p
                                key={idx}
                                className={`${scale.prose} ${proseFontClass} ${theme.textSecondary} text-pretty`}
                              >
                                {p}
                              </p>
                            ))}
                          </div>
                        ) : (
                          <p className={`mt-2 text-sm italic ${theme.textMuted}`}>
                            Sin redacción registrada en este numeral.
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* III. Árbol de Problemas y Árbol de Objetivos */}
          <section id="read-sec-3" className={`scroll-mt-20 border-b ${theme.border} py-10`}>
            <p className={`text-xs font-semibold uppercase tracking-[0.14em] ${theme.textMuted}`}>
              Sección III · Marco Lógico (Numeral 1.1.1)
            </p>
            <h2 className={`mt-1 text-2xl font-bold ${theme.textPrimary} ${proseFontClass}`}>
              Árbol de Problemas y Árbol de Objetivos
            </h2>

            <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className={`rounded-lg border ${theme.border} ${theme.subtleSurface} p-5 space-y-4`}>
                <h3 className={`text-base font-bold ${theme.textPrimary}`}>
                  Árbol de Problemas (Situación Negativa)
                </h3>
                <div className="space-y-3 text-sm leading-relaxed">
                  <div>
                    <div className={`text-xs font-semibold uppercase tracking-wider ${theme.textMuted}`}>
                      Efecto Final
                    </div>
                    <p className="mt-0.5">{ordered.arbol.efectoFinal}</p>
                  </div>
                  <div>
                    <div className={`text-xs font-semibold uppercase tracking-wider ${theme.textMuted}`}>
                      Efectos Directos
                    </div>
                    <ol className="mt-1 list-decimal pl-5 space-y-1">
                      {ordered.arbol.efectosDirectos.map((ef, i) => (
                        <li key={i}>{ef}</li>
                      ))}
                    </ol>
                  </div>
                  <div className={`rounded-md border ${theme.border} ${theme.sheetBg} p-3`}>
                    <div className={`text-xs font-semibold uppercase tracking-wider ${theme.textMuted}`}>
                      Problema Central (Tronco)
                    </div>
                    <p className="mt-0.5 font-semibold">{ordered.arbol.problemaCentral}</p>
                  </div>
                  <div>
                    <div className={`text-xs font-semibold uppercase tracking-wider ${theme.textMuted}`}>
                      Causas Directas e Indirectas
                    </div>
                    <ol className="mt-1 list-decimal pl-5 space-y-1.5">
                      {ordered.arbol.causasDirectas.map((cd, i) => (
                        <li key={i}>
                          <span>{cd}</span>
                          {ordered.arbol.causasIndirectas[i] && (
                            <span className={`block text-xs italic ${theme.textMuted}`}>
                              Causa indirecta: {ordered.arbol.causasIndirectas[i]}
                            </span>
                          )}
                        </li>
                      ))}
                    </ol>
                  </div>
                </div>
              </div>

              <div className={`rounded-lg border ${theme.border} ${theme.subtleSurface} p-5 space-y-4`}>
                <h3 className={`text-base font-bold ${theme.textPrimary}`}>
                  Árbol de Objetivos (Situación Transformada)
                </h3>
                <div className="space-y-3 text-sm leading-relaxed">
                  <div>
                    <div className={`text-xs font-semibold uppercase tracking-wider ${theme.textMuted}`}>
                      Fin Principal
                    </div>
                    <p className="mt-0.5">{arbolObjetivos.finPrincipal}</p>
                  </div>
                  <div>
                    <div className={`text-xs font-semibold uppercase tracking-wider ${theme.textMuted}`}>
                      Fines Directos
                    </div>
                    <ol className="mt-1 list-decimal pl-5 space-y-1">
                      {arbolObjetivos.finesDirectos.map((fn, i) => (
                        <li key={i}>{fn}</li>
                      ))}
                    </ol>
                  </div>
                  <div className={`rounded-md border ${theme.border} ${theme.sheetBg} p-3`}>
                    <div className={`text-xs font-semibold uppercase tracking-wider ${theme.textMuted}`}>
                      Objetivo General
                    </div>
                    <p className="mt-0.5 font-semibold">{arbolObjetivos.objetivoGeneral}</p>
                  </div>
                  <div>
                    <div className={`text-xs font-semibold uppercase tracking-wider ${theme.textMuted}`}>
                      Objetivos Específicos y Medios
                    </div>
                    <ol className="mt-1 list-decimal pl-5 space-y-1.5">
                      {arbolObjetivos.objetivosEspecificos.map((oe, i) => (
                        <li key={i}>
                          <span>{oe}</span>
                          {arbolObjetivos.mediosAccion[i] && (
                            <span className={`block text-xs italic ${theme.textMuted}`}>
                              Medio de acción: {arbolObjetivos.mediosAccion[i]}
                            </span>
                          )}
                        </li>
                      ))}
                    </ol>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* IV. Cuadro A · Plan de Implementación 2027 */}
          <section id="read-sec-4" className={`scroll-mt-20 border-b ${theme.border} py-10`}>
            <p className={`text-xs font-semibold uppercase tracking-[0.14em] ${theme.textMuted}`}>
              Sección IV · Cuadro A
            </p>
            <h2 className={`mt-1 text-2xl font-bold ${theme.textPrimary} ${proseFontClass}`}>
              Plan de Actividades e Implementación 2027
            </h2>

            {(project.cuadroA || []).length === 0 ? (
              <p className={`mt-4 text-sm italic ${theme.textMuted}`}>
                No se registraron actividades en el Cuadro A.
              </p>
            ) : (
              <div className="mt-6 overflow-x-auto">
                <table className={`w-full border-collapse text-sm border ${theme.border}`}>
                  <thead>
                    <tr className={theme.tableHead}>
                      <th className={`border ${theme.border} px-3 py-2 text-left font-semibold`}>
                        Objetivo / Fase
                      </th>
                      <th className={`border ${theme.border} px-3 py-2 text-left font-semibold`}>
                        Actividad Principal 2027
                      </th>
                      <th className={`border ${theme.border} px-3 py-2 text-left font-semibold`}>
                        Metas y Evidencias
                      </th>
                      <th className={`border ${theme.border} px-3 py-2 text-left font-semibold`}>
                        Responsable
                      </th>
                      <th className={`border ${theme.border} px-3 py-2 text-left font-semibold`}>
                        Plazo
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {(project.cuadroA || []).map((r, idx) => (
                      <tr key={idx}>
                        <td className={`border ${theme.border} px-3 py-2 font-medium`}>
                          {r.fase}
                        </td>
                        <td className={`border ${theme.border} px-3 py-2`}>{r.actividad}</td>
                        <td className={`border ${theme.border} px-3 py-2`}>{r.evidencia}</td>
                        <td className={`border ${theme.border} px-3 py-2`}>{r.responsable}</td>
                        <td className={`border ${theme.border} px-3 py-2 font-mono-tabular`}>
                          {r.plazo}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* V. Cuadro B · Presupuesto Detallado (Anexo N° 5) */}
          <section id="read-sec-5" className={`scroll-mt-20 border-b ${theme.border} py-10`}>
            <p className={`text-xs font-semibold uppercase tracking-[0.14em] ${theme.textMuted}`}>
              Sección V · Cuadro B (Anexo N° 5)
            </p>
            <h2 className={`mt-1 text-2xl font-bold ${theme.textPrimary} ${proseFontClass}`}>
              Presupuesto de Bienes y Servicios
            </h2>

            {(project.cuadroB || []).length === 0 ? (
              <p className={`mt-4 text-sm italic ${theme.textMuted}`}>
                No se registraron partidas presupuestales en el Cuadro B.
              </p>
            ) : (
              <div className="mt-6 overflow-x-auto">
                <table className={`w-full border-collapse text-sm border ${theme.border}`}>
                  <thead>
                    <tr className={theme.tableHead}>
                      <th className={`border ${theme.border} px-3 py-2 text-left font-semibold`}>
                        Rubro
                      </th>
                      <th className={`border ${theme.border} px-3 py-2 text-left font-semibold`}>
                        Descripción
                      </th>
                      <th className={`border ${theme.border} px-3 py-2 text-left font-semibold`}>
                        Unidad
                      </th>
                      <th className={`border ${theme.border} px-3 py-2 text-right font-semibold`}>
                        Cant.
                      </th>
                      <th className={`border ${theme.border} px-3 py-2 text-right font-semibold`}>
                        P. Unit (S/)
                      </th>
                      <th className={`border ${theme.border} px-3 py-2 text-right font-semibold`}>
                        Subtotal (S/)
                      </th>
                      <th className={`border ${theme.border} px-3 py-2 text-left font-semibold`}>
                        Justificación
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {(project.cuadroB || []).map((r, idx) => {
                      const sub = (Number(r.cant) || 0) * (Number(r.unit) || 0);
                      return (
                        <tr key={idx}>
                          <td className={`border ${theme.border} px-3 py-2 font-medium`}>
                            {r.rubro}
                          </td>
                          <td className={`border ${theme.border} px-3 py-2`}>{r.desc}</td>
                          <td className={`border ${theme.border} px-3 py-2`}>{r.unidad}</td>
                          <td className={`border ${theme.border} px-3 py-2 text-right font-mono-tabular`}>
                            {r.cant}
                          </td>
                          <td className={`border ${theme.border} px-3 py-2 text-right font-mono-tabular`}>
                            {Number(r.unit).toFixed(2)}
                          </td>
                          <td className={`border ${theme.border} px-3 py-2 text-right font-mono-tabular font-semibold`}>
                            {sub.toFixed(2)}
                          </td>
                          <td className={`border ${theme.border} px-3 py-2`}>{r.just}</td>
                        </tr>
                      );
                    })}
                    <tr className={theme.subtleSurface}>
                      <td
                        colSpan={5}
                        className={`border ${theme.border} px-3 py-2 text-right font-semibold`}
                      >
                        Subtotal Bienes
                      </td>
                      <td
                        colSpan={2}
                        className={`border ${theme.border} px-3 py-2 font-mono-tabular font-semibold`}
                      >
                        S/ {ordered.bSum.toFixed(2)}
                      </td>
                    </tr>
                    <tr className={theme.subtleSurface}>
                      <td
                        colSpan={5}
                        className={`border ${theme.border} px-3 py-2 text-right font-semibold`}
                      >
                        Subtotal Servicios
                      </td>
                      <td
                        colSpan={2}
                        className={`border ${theme.border} px-3 py-2 font-mono-tabular font-semibold`}
                      >
                        S/ {ordered.sSum.toFixed(2)}
                      </td>
                    </tr>
                    <tr className={theme.tableHead}>
                      <td colSpan={5} className={`border ${theme.border} px-3 py-2.5 text-right font-bold`}>
                        Total Subvención Solicitada (Tope S/{' '}
                        {ordered.fin.maxMonto.toLocaleString('es-PE')})
                      </td>
                      <td
                        colSpan={2}
                        className={`border ${theme.border} px-3 py-2.5 font-mono-tabular font-bold`}
                      >
                        S/ {ordered.totalSum.toFixed(2)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* VI. Declaraciones Juradas (Anexo 3 y Anexo 4) */}
          <section id="read-sec-6" className={`scroll-mt-20 border-b ${theme.border} py-10`}>
            <p className={`text-xs font-semibold uppercase tracking-[0.14em] ${theme.textMuted}`}>
              Sección VI · Anexos Oficiales
            </p>
            <h2 className={`mt-1 text-2xl font-bold ${theme.textPrimary} ${proseFontClass}`}>
              Declaraciones Juradas (Anexo N° 3 y Anexo N° 4)
            </h2>

            <div className="mt-6 space-y-6 max-w-[68ch]">
              <div className={`rounded-lg border ${theme.border} ${theme.subtleSurface} p-5`}>
                <h3 className={`text-sm font-bold ${theme.textPrimary} mb-2`}>
                  Anexo N° 3 · Declaración Jurada del Director(a) y Equipo
                </h3>
                <div className="whitespace-pre-wrap text-sm leading-relaxed">
                  {ordered.anexo3}
                </div>
              </div>
              <div className={`rounded-lg border ${theme.border} ${theme.subtleSurface} p-5`}>
                <h3 className={`text-sm font-bold ${theme.textPrimary} mb-2`}>
                  Anexo N° 4 · Compromiso Institucional y Sostenibilidad
                </h3>
                <div className="whitespace-pre-wrap text-sm leading-relaxed">
                  {ordered.anexo4}
                </div>
              </div>
            </div>
          </section>

          {/* VII. Instrumentos y Evidencias Obligatorias */}
          <section id="read-sec-7" className="scroll-mt-20 pt-10">
            <p className={`text-xs font-semibold uppercase tracking-[0.14em] ${theme.textMuted}`}>
              Sección VII · Evidencias por Modalidad
            </p>
            <h2 className={`mt-1 text-2xl font-bold ${theme.textPrimary} ${proseFontClass}`}>
              Instrumentos Técnicos y Material Audiovisual
            </h2>

            <p className="mt-4 text-sm">
              <strong>Enlace de Video YouTube:</strong>{' '}
              {project.videoUrl ? (
                <span className="underline">{project.videoUrl}</span>
              ) : (
                <span className={`italic ${theme.textMuted}`}>Pendiente de registro</span>
              )}
            </p>

            <div className="mt-6 space-y-8 max-w-[68ch]">
              {ordered.reqInst.map((inst, idx) => {
                const content = (project.instruments && project.instruments[inst.id]) || '';
                return (
                  <div key={inst.id} className={`border-t ${theme.border} pt-5`}>
                    <h3
                      className={`text-base sm:text-lg font-bold ${theme.textPrimary} ${proseFontClass}`}
                    >
                      Instrumento {idx + 1}. {inst.title} ({inst.format})
                    </h3>
                    {content.trim() ? (
                      <div
                        className={`mt-2.5 whitespace-pre-line ${scale.prose} ${proseFontClass} ${theme.textSecondary}`}
                      >
                        {content}
                      </div>
                    ) : (
                      <p className={`mt-2 text-sm italic ${theme.textMuted}`}>
                        Instrumento pendiente de redacción.
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        </article>
      </main>
    </div>
  );
};
