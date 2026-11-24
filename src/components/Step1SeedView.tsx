import React, {useCallback, useState} from 'react';
import {
  ArrowLeft,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Lightbulb,
  Mic,
  Plus,
  Sparkles,
  Square,
  Trash2,
} from 'lucide-react';
import {COMPETENCIAS_CNEB, TEMATICAS_CNPIE} from '../data/cnpieCatalogs';
import {useSpeechDictation} from '../hooks/useSpeechDictation';
import type {DensityId, ProjectModel} from '../types/cnpie';
import {
  generateBeneficiariosDefault,
  getDefaultProblemaByModality,
  getProjectBonuses,
  inferProblemProfile,
} from '../utils/cnpieEngine';
import {ProblemaCentralPanel} from './ProblemaCentralPanel';

interface Step1SeedViewProps {
  project: ProjectModel;
  onUpdateProject: (updater: (prev: ProjectModel) => ProjectModel) => void;
  onGenerateFullProject: () => void;
  onGenerateSelectedParts: (partIds: string[]) => void;
  onBackHome: () => void;
  onNextStep: () => void;
  onNotify: (msg: string) => void;
}

export const Step1SeedView: React.FC<Step1SeedViewProps> = ({
  project,
  onUpdateProject,
  onGenerateFullProject,
  onGenerateSelectedParts,
  onBackHome,
  onNextStep,
  onNotify,
}) => {
  const bonus = getProjectBonuses(project);
  const showSftExtra = project.category === '2C' || project.modalidad === 'MSE_SFT';

  const [showIeExtras, setShowIeExtras] = useState(
    project.modalidad === 'EIB_AMAZ' || showSftExtra
  );
  const [showTeamExtras, setShowTeamExtras] = useState(
    project.equipo.integrantes.length > 0
  );
  const [showPickers, setShowPickers] = useState(false);

  const appendSpokenText = useCallback((existing: string, spoken: string): string => {
    const clean = spoken.trim();
    if (!clean) return existing;
    const trimmed = existing.replace(/\s+$/, '');
    const needsCap = !trimmed || /[.!?\n]$/.test(trimmed);
    const formatted = needsCap ? clean.charAt(0).toUpperCase() + clean.slice(1) : clean;
    return trimmed ? `${trimmed} ${formatted}` : formatted;
  }, []);

  const handleSpeechFinal = useCallback(
    (targetId: string, spoken: string) => {
      onUpdateProject((prev) => {
        if (targetId === 'titulo') {
          return {
            ...prev,
            seed: {...prev.seed, titulo: appendSpokenText(prev.seed.titulo || '', spoken)},
          };
        }
        if (targetId === 'solucion') {
          return {
            ...prev,
            seed: {...prev.seed, solucion: appendSpokenText(prev.seed.solucion || '', spoken)},
          };
        }
        if (targetId === 'ben_directos') {
          return {
            ...prev,
            beneficiarios: {
              directos: appendSpokenText(prev.beneficiarios?.directos || '', spoken),
              indirectos: prev.beneficiarios?.indirectos || '',
            },
          };
        }
        if (targetId === 'ben_indirectos') {
          return {
            ...prev,
            beneficiarios: {
              directos: prev.beneficiarios?.directos || '',
              indirectos: appendSpokenText(prev.beneficiarios?.indirectos || '', spoken),
            },
          };
        }
        return prev;
      });
    },
    [appendSpokenText, onUpdateProject]
  );

  const {
    activeTargetId: seedDictTarget,
    interimText: seedDictInterim,
    startDictation,
    stopDictation,
  } = useSpeechDictation({
    onFinalTranscript: handleSpeechFinal,
    onNotify,
  });

  const autoFillIE = () => {
    onUpdateProject((prev) => {
      const isSFT = prev.category === '2C' || prev.modalidad === 'MSE_SFT';
      const isAmaz = prev.modalidad === 'EIB_AMAZ';
      return {
        ...prev,
        ie: {
          ...prev.ie,
          nombre: isSFT
            ? 'I.E. Técnico Industrial José Carlos Mariátegui'
            : isAmaz
            ? 'I.E. N° 64120 Bilingüe Río Tambo'
            : 'I.E. N° 36150 Virgen de Lourdes',
          codigo: isSFT ? '0584129' : isAmaz ? '0712458' : '0421895',
          nivel: isSFT ? 'Secundaria' : 'Primaria',
          estudiantes: isSFT ? 210 : 145,
          dre: isAmaz ? 'DRE Junín' : 'DRE Huancavelica',
          ugel: isAmaz ? 'UGEL Río Tambo' : 'UGEL Acobamba',
          region: isAmaz ? 'Junín' : 'Huancavelica',
          provincia: isAmaz ? 'Satipo' : 'Acobamba',
          distrito: isAmaz ? 'Río Tambo' : 'Pomacocha',
          area: 'Rural 1',
          eib_tipo: isAmaz ? 'EIB Fortalecimiento' : 'No aplica',
          lengua: isAmaz ? 'Asháninka' : '',
          especialidad: isSFT ? 'Industrias Alimentarias y Agroindustria' : prev.ie.especialidad,
          modulo: isSFT ? 'Procesamiento y Control de Calidad de Productos Locales' : prev.ie.modulo,
        },
      };
    });
    onNotify('Datos de la Institución Educativa autocompletados.');
  };

  const autoFillTeam = () => {
    onUpdateProject((prev) => ({
      ...prev,
      equipo: {
        director: {
          nombre: 'Mg. Elena Victoria Quispe Huamán',
          dni: '23456789',
          celular: '967412580',
          correo: 'direccion.ie@minedu.edu.pe',
          exp: 'Sí',
        },
        coordinador: {
          nombre: 'Prof. Juan Carlos Mendoza Taipe',
          dni: '41258963',
          celular: '954123698',
          correo: 'coordinador@minedu.edu.pe',
          exp: 'Sí',
        },
        integrantes:
          prev.equipo.integrantes.length > 0
            ? prev.equipo.integrantes
            : [
                {
                  nombre: 'Prof. Rosa Luz Palomino Castro',
                  dni: '42589631',
                  cargo: 'Docente',
                  celular: '945123874',
                  correo: 'docente@minedu.edu.pe',
                  exp: 'No',
                },
              ],
      },
    }));
    onNotify('Equipo responsable autocompletado.');
  };

  const handleSuggestTitle = () => {
    onUpdateProject((prev) => {
      const profile = inferProblemProfile(prev.seed.problema, prev);
      return {
        ...prev,
        seed: {
          ...prev.seed,
          titulo: profile.suggestedTitle,
          competencias:
            profile.domain !== 'general' ? profile.competencias.slice(0, 2) : prev.seed.competencias,
          tematicas: profile.domain !== 'general' ? profile.tematicas : prev.seed.tematicas,
        },
      };
    });
    onNotify('Título sugerido según el Problema Central.');
  };

  const autoFillSeed = () => {
    onUpdateProject((prev) => {
      const nextProb = prev.seed.problema.trim()
        ? prev.seed.problema
        : getDefaultProblemaByModality(prev);
      const profile = inferProblemProfile(nextProb, prev);
      return {
        ...prev,
        seed: {
          ...prev.seed,
          problema: nextProb,
          titulo: prev.seed.titulo.trim() ? prev.seed.titulo : profile.suggestedTitle,
          solucion: profile.suggestedSolution,
          competencias:
            profile.domain !== 'general' ? profile.competencias.slice(0, 2) : prev.seed.competencias,
          tematicas: profile.domain !== 'general' ? profile.tematicas : prev.seed.tematicas,
        },
      };
    });
    onNotify('Semilla pedagógica completada de acuerdo al Problema Central.');
  };

  const toggleTematica = (item: string) => {
    onUpdateProject((prev) => {
      const exists = prev.seed.tematicas.includes(item);
      if (exists && prev.seed.tematicas.length <= 1) return prev;
      const next = exists
        ? prev.seed.tematicas.filter((t) => t !== item)
        : [...prev.seed.tematicas, item];
      return {...prev, seed: {...prev.seed, tematicas: next}};
    });
  };

  const toggleCompetencia = (item: string) => {
    onUpdateProject((prev) => {
      const exists = prev.seed.competencias.includes(item);
      if (exists && prev.seed.competencias.length <= 1) return prev;
      const next = exists
        ? prev.seed.competencias.filter((c) => c !== item)
        : [...prev.seed.competencias, item];
      return {...prev, seed: {...prev.seed, competencias: next}};
    });
  };

  const inputClass =
    'w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-base text-slate-950 focus:border-red-700 focus:outline-none';
  const labelClass = 'block text-sm font-bold text-slate-900 mb-1.5';

  return (
    <div className="space-y-5">
      {/* 1. Núcleo del Proyecto */}
      <ProblemaCentralPanel
        project={project}
        onUpdateProject={onUpdateProject}
        onGenerateFullProject={onGenerateFullProject}
        onGenerateSelectedParts={onGenerateSelectedParts}
        onNotify={onNotify}
      />

      {/* 2. Misión 1: Institución Educativa */}
      <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <h2 className="text-lg sm:text-xl font-extrabold text-blue-900">
            Misión 1 · Institución Educativa (Anexo N° 1)
          </h2>
          <button
            type="button"
            onClick={autoFillIE}
            className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-800 hover:bg-slate-50 cursor-pointer"
          >
            <Sparkles className="h-4 w-4 text-teal-700" />
            <span>Autocompletar IE</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          <div className="md:col-span-2">
            <label className={labelClass} htmlFor="p_ie_nombre">
              Nombre de la IE *
            </label>
            <input
              id="p_ie_nombre"
              type="text"
              value={project.ie.nombre}
              onChange={(e) =>
                onUpdateProject((p) => ({...p, ie: {...p.ie, nombre: e.target.value}}))
              }
              placeholder="Ej. I.E. N° 36150 Virgen de Lourdes"
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass} htmlFor="p_ie_codigo">
              Código Modular *
            </label>
            <input
              id="p_ie_codigo"
              type="text"
              value={project.ie.codigo}
              onChange={(e) =>
                onUpdateProject((p) => ({...p, ie: {...p.ie, codigo: e.target.value}}))
              }
              placeholder="Ej. 0421895"
              className={`${inputClass} font-mono-tabular`}
            />
          </div>

          <div>
            <label className={labelClass} htmlFor="p_ie_nivel">
              Nivel Educativo
            </label>
            <select
              id="p_ie_nivel"
              value={project.ie.nivel}
              onChange={(e) =>
                onUpdateProject((p) => ({...p, ie: {...p.ie, nivel: e.target.value}}))
              }
              className={inputClass}
            >
              <option value="Inicial">Inicial</option>
              <option value="Primaria">Primaria</option>
              <option value="Secundaria">Secundaria</option>
              <option value="EBA">EBA</option>
              <option value="EBE">EBE</option>
            </select>
          </div>

          <div>
            <label className={labelClass} htmlFor="p_ie_est">
              Estudiantes Beneficiarios
            </label>
            <input
              id="p_ie_est"
              type="number"
              min={1}
              value={project.ie.estudiantes}
              onChange={(e) =>
                onUpdateProject((p) => ({
                  ...p,
                  ie: {...p.ie, estudiantes: parseInt(e.target.value, 10) || 1},
                }))
              }
              className={`${inputClass} font-mono-tabular`}
            />
          </div>

          <div>
            <label className={labelClass} htmlFor="p_ie_ugel">
              UGEL *
            </label>
            <input
              id="p_ie_ugel"
              type="text"
              value={project.ie.ugel}
              onChange={(e) =>
                onUpdateProject((p) => ({...p, ie: {...p.ie, ugel: e.target.value}}))
              }
              placeholder="Ej. UGEL Acobamba"
              className={inputClass}
            />
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowIeExtras((v) => !v)}
          className="inline-flex min-h-[38px] items-center gap-1.5 text-sm font-bold text-slate-700 hover:text-red-800 cursor-pointer"
        >
          {showIeExtras ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          <span>
            {showIeExtras
              ? 'Ocultar ubicación y bonificaciones'
              : `Ubicación, EIB y bonificaciones (${bonus.pctReason})`}
          </span>
        </button>

        {showIeExtras && (
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              <div>
                <label className={labelClass} htmlFor="p_ie_dre">
                  DRE / GRE
                </label>
                <input
                  id="p_ie_dre"
                  type="text"
                  value={project.ie.dre}
                  onChange={(e) =>
                    onUpdateProject((p) => ({...p, ie: {...p.ie, dre: e.target.value}}))
                  }
                  placeholder="Ej. DRE Huancavelica"
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass} htmlFor="p_ie_region">
                  Región
                </label>
                <input
                  id="p_ie_region"
                  type="text"
                  value={project.ie.region}
                  onChange={(e) =>
                    onUpdateProject((p) => ({...p, ie: {...p.ie, region: e.target.value}}))
                  }
                  placeholder="Ej. Huancavelica"
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass} htmlFor="p_ie_prov">
                  Provincia
                </label>
                <input
                  id="p_ie_prov"
                  type="text"
                  value={project.ie.provincia}
                  onChange={(e) =>
                    onUpdateProject((p) => ({...p, ie: {...p.ie, provincia: e.target.value}}))
                  }
                  placeholder="Ej. Acobamba"
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass} htmlFor="p_ie_dist">
                  Distrito / Comunidad
                </label>
                <input
                  id="p_ie_dist"
                  type="text"
                  value={project.ie.distrito}
                  onChange={(e) =>
                    onUpdateProject((p) => ({...p, ie: {...p.ie, distrito: e.target.value}}))
                  }
                  placeholder="Ej. Pomacocha"
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass} htmlFor="p_ie_area">
                  Ámbito / Ruralidad
                </label>
                <select
                  id="p_ie_area"
                  value={project.ie.area}
                  onChange={(e) =>
                    onUpdateProject((p) => ({...p, ie: {...p.ie, area: e.target.value}}))
                  }
                  className={inputClass}
                >
                  <option value="Urbana">Urbana</option>
                  <option value="Rural 1">Rural 1 (+10%)</option>
                  <option value="Rural 2">Rural 2 (+5%)</option>
                  <option value="Rural 3">Rural 3</option>
                </select>
              </div>

              <div>
                <label className={labelClass} htmlFor="p_ie_zona">
                  Condición Especial / Convenio
                </label>
                <select
                  id="p_ie_zona"
                  value={project.ie.zona_especial}
                  onChange={(e) =>
                    onUpdateProject((p) => ({...p, ie: {...p.ie, zona_especial: e.target.value}}))
                  }
                  className={inputClass}
                >
                  <option value="Ninguna">Ninguna</option>
                  <option value="VRAEM">Zona VRAEM (+10%)</option>
                  <option value="Frontera">Zona de Frontera (+10%)</option>
                  <option value="Multigrado / Unidocente">Multigrado / Unidocente (+5%)</option>
                  <option value="Con Convenio CETPRO/IEST">Convenio CETPRO/IEST (+2 pts)</option>
                  <option value="Rural 1 + Convenio">Rural 1 + Convenio (+10% y +2 pts)</option>
                </select>
              </div>

              <div>
                <label className={labelClass} htmlFor="p_ie_eib">
                  Atención EIB
                </label>
                <select
                  id="p_ie_eib"
                  value={project.ie.eib_tipo}
                  onChange={(e) =>
                    onUpdateProject((p) => ({...p, ie: {...p.ie, eib_tipo: e.target.value}}))
                  }
                  className={inputClass}
                >
                  <option value="No aplica">No aplica</option>
                  <option value="EIB Fortalecimiento">EIB Fortalecimiento (+5%)</option>
                  <option value="EIB Revitalización">EIB Revitalización (+5%)</option>
                  <option value="EIB Ámbito Urbano">EIB Ámbitos Urbanos (+5%)</option>
                </select>
              </div>

              <div>
                <label className={labelClass} htmlFor="p_ie_lengua">
                  Lengua Originaria
                </label>
                <input
                  id="p_ie_lengua"
                  type="text"
                  value={project.ie.lengua}
                  onChange={(e) =>
                    onUpdateProject((p) => ({...p, ie: {...p.ie, lengua: e.target.value}}))
                  }
                  placeholder="Ej. Quechua Chanka / Asháninka"
                  className={inputClass}
                />
              </div>
            </div>

            {showSftExtra && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 rounded-xl border border-teal-200 bg-teal-50/70 p-3.5">
                <div>
                  <label className={labelClass} htmlFor="p_ie_esp">
                    Especialidad Técnica (MSE-SFT)
                  </label>
                  <input
                    id="p_ie_esp"
                    type="text"
                    value={project.ie.especialidad}
                    onChange={(e) =>
                      onUpdateProject((p) => ({...p, ie: {...p.ie, especialidad: e.target.value}}))
                    }
                    placeholder="Ej. Industrias Alimentarias"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass} htmlFor="p_ie_mod">
                    Módulo Formativo CNOF
                  </label>
                  <input
                    id="p_ie_mod"
                    type="text"
                    value={project.ie.modulo}
                    onChange={(e) =>
                      onUpdateProject((p) => ({...p, ie: {...p.ie, modulo: e.target.value}}))
                    }
                    placeholder="Ej. Control de Calidad"
                    className={inputClass}
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      {/* 3. Misión 2: Beneficiarios y Equipo Responsable */}
      <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <h2 className="text-lg sm:text-xl font-extrabold text-blue-900">
            Misión 2 · Beneficiarios y Equipo Responsable
          </h2>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                onUpdateProject((prev) => ({
                  ...prev,
                  beneficiarios: generateBeneficiariosDefault(prev),
                }));
                onNotify('Beneficiarios directos e indirectos completados.');
              }}
              className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-sm font-semibold text-blue-900 hover:bg-blue-100 cursor-pointer"
            >
              <Sparkles className="h-4 w-4 text-blue-700" />
              <span>Autocompletar Beneficiarios</span>
            </button>
            <button
              type="button"
              onClick={autoFillTeam}
              className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-800 hover:bg-slate-50 cursor-pointer"
            >
              <Sparkles className="h-4 w-4 text-teal-700" />
              <span>Autocompletar Equipo</span>
            </button>
          </div>
        </div>

        {/* Beneficiarios Directos e Indirectos */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 rounded-xl border border-blue-200 bg-blue-50/40 p-3.5">
          <div>
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <label className="text-sm font-bold text-slate-900" htmlFor="ben_directos">
                Beneficiarios Directos (Estudiantes y Docentes)
              </label>
              <button
                type="button"
                onClick={() => startDictation('ben_directos')}
                aria-pressed={seedDictTarget === 'ben_directos'}
                className={`inline-flex min-h-[32px] items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-bold transition-colors cursor-pointer ${
                  seedDictTarget === 'ben_directos'
                    ? 'bg-red-700 text-white hover:bg-red-800'
                    : 'border border-red-300 bg-white text-red-900 hover:bg-red-50'
                }`}
              >
                {seedDictTarget === 'ben_directos' ? (
                  <>
                    <Square className="h-3 w-3 fill-current" />
                    <span>Detener</span>
                  </>
                ) : (
                  <>
                    <Mic className="h-3.5 w-3.5 text-red-700" />
                    <span>Dictar</span>
                  </>
                )}
              </button>
            </div>
            {seedDictTarget === 'ben_directos' && (
              <div className="mb-1.5 flex items-center justify-between gap-2 rounded-lg border border-red-300 bg-red-50 px-2.5 py-1.5 text-xs text-red-950">
                <span>
                  {seedDictInterim ? `"${seedDictInterim}"` : 'Escuchando dictado en español...'}
                </span>
                <button
                  type="button"
                  onClick={stopDictation}
                  className="font-bold underline cursor-pointer"
                >
                  Detener
                </button>
              </div>
            )}
            <textarea
              id="ben_directos"
              rows={2}
              value={project.beneficiarios?.directos || ''}
              onChange={(e) =>
                onUpdateProject((p) => ({
                  ...p,
                  beneficiarios: {
                    directos: e.target.value,
                    indirectos: p.beneficiarios?.indirectos || '',
                  },
                }))
              }
              placeholder="Ej. 145 estudiantes de Primaria y 8 docentes participantes..."
              className={inputClass}
            />
          </div>
          <div>
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <label className="text-sm font-bold text-slate-900" htmlFor="ben_indirectos">
                Beneficiarios Indirectos (Familias y Comunidad)
              </label>
              <button
                type="button"
                onClick={() => startDictation('ben_indirectos')}
                aria-pressed={seedDictTarget === 'ben_indirectos'}
                className={`inline-flex min-h-[32px] items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-bold transition-colors cursor-pointer ${
                  seedDictTarget === 'ben_indirectos'
                    ? 'bg-red-700 text-white hover:bg-red-800'
                    : 'border border-red-300 bg-white text-red-900 hover:bg-red-50'
                }`}
              >
                {seedDictTarget === 'ben_indirectos' ? (
                  <>
                    <Square className="h-3 w-3 fill-current" />
                    <span>Detener</span>
                  </>
                ) : (
                  <>
                    <Mic className="h-3.5 w-3.5 text-red-700" />
                    <span>Dictar</span>
                  </>
                )}
              </button>
            </div>
            {seedDictTarget === 'ben_indirectos' && (
              <div className="mb-1.5 flex items-center justify-between gap-2 rounded-lg border border-red-300 bg-red-50 px-2.5 py-1.5 text-xs text-red-950">
                <span>
                  {seedDictInterim ? `"${seedDictInterim}"` : 'Escuchando dictado en español...'}
                </span>
                <button
                  type="button"
                  onClick={stopDictation}
                  className="font-bold underline cursor-pointer"
                >
                  Detener
                </button>
              </div>
            )}
            <textarea
              id="ben_indirectos"
              rows={2}
              value={project.beneficiarios?.indirectos || ''}
              onChange={(e) =>
                onUpdateProject((p) => ({
                  ...p,
                  beneficiarios: {
                    directos: p.beneficiarios?.directos || '',
                    indirectos: e.target.value,
                  },
                }))
              }
              placeholder="Ej. Familias de la comunidad, APAFA, especialistas UGEL..."
              className={inputClass}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 space-y-2.5">
            <div className="text-sm font-bold text-red-800">Director(a) de la IE *</div>
            <input
              id="dir_nom"
              type="text"
              placeholder="Apellidos y Nombres *"
              value={project.equipo.director.nombre}
              onChange={(e) =>
                onUpdateProject((p) => ({
                  ...p,
                  equipo: {...p.equipo, director: {...p.equipo.director, nombre: e.target.value}},
                }))
              }
              className={inputClass}
            />
            <input
              id="dir_dni"
              type="text"
              maxLength={8}
              placeholder="DNI *"
              value={project.equipo.director.dni}
              onChange={(e) =>
                onUpdateProject((p) => ({
                  ...p,
                  equipo: {...p.equipo, director: {...p.equipo.director, dni: e.target.value}},
                }))
              }
              className={`${inputClass} font-mono-tabular`}
            />
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 space-y-2.5">
            <div className="text-sm font-bold text-teal-800">Docente Coordinador(a) *</div>
            <input
              id="coord_nom"
              type="text"
              placeholder="Apellidos y Nombres *"
              value={project.equipo.coordinador.nombre}
              onChange={(e) =>
                onUpdateProject((p) => ({
                  ...p,
                  equipo: {
                    ...p.equipo,
                    coordinador: {...p.equipo.coordinador, nombre: e.target.value},
                  },
                }))
              }
              className={inputClass}
            />
            <input
              id="coord_dni"
              type="text"
              maxLength={8}
              placeholder="DNI *"
              value={project.equipo.coordinador.dni}
              onChange={(e) =>
                onUpdateProject((p) => ({
                  ...p,
                  equipo: {
                    ...p.equipo,
                    coordinador: {...p.equipo.coordinador, dni: e.target.value},
                  },
                }))
              }
              className={`${inputClass} font-mono-tabular`}
            />
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowTeamExtras((v) => !v)}
          className="inline-flex min-h-[38px] items-center gap-1.5 text-sm font-bold text-slate-700 hover:text-red-800 cursor-pointer"
        >
          {showTeamExtras ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          <span>
            {showTeamExtras
              ? 'Ocultar contacto y otros integrantes'
              : `Teléfonos, correos y otros integrantes (${project.equipo.integrantes.length})`}
          </span>
        </button>

        {showTeamExtras && (
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <input
                type="text"
                placeholder="Celular Director(a)"
                value={project.equipo.director.celular || ''}
                onChange={(e) =>
                  onUpdateProject((p) => ({
                    ...p,
                    equipo: {...p.equipo, director: {...p.equipo.director, celular: e.target.value}},
                  }))
                }
                className={`${inputClass} font-mono-tabular`}
              />
              <input
                type="text"
                placeholder="Correo Director(a)"
                value={project.equipo.director.correo || ''}
                onChange={(e) =>
                  onUpdateProject((p) => ({
                    ...p,
                    equipo: {...p.equipo, director: {...p.equipo.director, correo: e.target.value}},
                  }))
                }
                className={inputClass}
              />
              <select
                value={project.equipo.director.exp || 'No'}
                onChange={(e) =>
                  onUpdateProject((p) => ({
                    ...p,
                    equipo: {...p.equipo, director: {...p.equipo.director, exp: e.target.value}},
                  }))
                }
                className={inputClass}
              >
                <option value="No">Director: Sin CNPIE previo</option>
                <option value="Sí">Director: Ganador CNPIE previo</option>
              </select>

              <input
                type="text"
                placeholder="Celular Coordinador(a)"
                value={project.equipo.coordinador.celular || ''}
                onChange={(e) =>
                  onUpdateProject((p) => ({
                    ...p,
                    equipo: {
                      ...p.equipo,
                      coordinador: {...p.equipo.coordinador, celular: e.target.value},
                    },
                  }))
                }
                className={`${inputClass} font-mono-tabular`}
              />
              <input
                type="text"
                placeholder="Correo Coordinador(a)"
                value={project.equipo.coordinador.correo || ''}
                onChange={(e) =>
                  onUpdateProject((p) => ({
                    ...p,
                    equipo: {
                      ...p.equipo,
                      coordinador: {...p.equipo.coordinador, correo: e.target.value},
                    },
                  }))
                }
                className={inputClass}
              />
              <select
                value={project.equipo.coordinador.exp || 'No'}
                onChange={(e) =>
                  onUpdateProject((p) => ({
                    ...p,
                    equipo: {
                      ...p.equipo,
                      coordinador: {...p.equipo.coordinador, exp: e.target.value},
                    },
                  }))
                }
                className={inputClass}
              >
                <option value="No">Coord.: Sin CNPIE previo</option>
                <option value="Sí">Coord.: Ganador CNPIE previo</option>
              </select>
            </div>

            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-bold text-slate-800">Otros Integrantes</span>
              <button
                type="button"
                onClick={() =>
                  onUpdateProject((p) => ({
                    ...p,
                    equipo: {
                      ...p.equipo,
                      integrantes: [
                        ...p.equipo.integrantes,
                        {nombre: '', dni: '', cargo: 'Docente', celular: '', correo: '', exp: 'No'},
                      ],
                    },
                  }))
                }
                className="inline-flex min-h-[38px] items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-800 hover:bg-slate-50 cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                <span>Agregar</span>
              </button>
            </div>

            <div className="space-y-2">
              {project.equipo.integrantes.map((m, idx) => (
                <div
                  key={idx}
                  className="rounded-xl border border-slate-200 bg-white p-2.5 grid grid-cols-1 md:grid-cols-4 gap-2 items-center"
                >
                  <input
                    type="text"
                    placeholder="Apellidos y Nombres"
                    value={m.nombre}
                    onChange={(e) =>
                      onUpdateProject((p) => {
                        const next = [...p.equipo.integrantes];
                        next[idx] = {...next[idx], nombre: e.target.value};
                        return {...p, equipo: {...p.equipo, integrantes: next}};
                      })
                    }
                    className={inputClass}
                  />
                  <input
                    type="text"
                    maxLength={8}
                    placeholder="DNI"
                    value={m.dni}
                    onChange={(e) =>
                      onUpdateProject((p) => {
                        const next = [...p.equipo.integrantes];
                        next[idx] = {...next[idx], dni: e.target.value};
                        return {...p, equipo: {...p.equipo, integrantes: next}};
                      })
                    }
                    className={`${inputClass} font-mono-tabular`}
                  />
                  <input
                    type="text"
                    placeholder="Cargo"
                    value={m.cargo || 'Docente'}
                    onChange={(e) =>
                      onUpdateProject((p) => {
                        const next = [...p.equipo.integrantes];
                        next[idx] = {...next[idx], cargo: e.target.value};
                        return {...p, equipo: {...p.equipo, integrantes: next}};
                      })
                    }
                    className={inputClass}
                  />
                  <button
                    type="button"
                    onClick={() =>
                      onUpdateProject((p) => ({
                        ...p,
                        equipo: {
                          ...p.equipo,
                          integrantes: p.equipo.integrantes.filter((_, i) => i !== idx),
                        },
                      }))
                    }
                    className="inline-flex min-h-[40px] items-center justify-center gap-1 rounded-lg border border-red-200 bg-white px-3 text-xs font-semibold text-red-700 hover:bg-red-50 cursor-pointer"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Quitar</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* 4. Misión 3: Título y Propuesta Central */}
      <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <h2 className="text-lg sm:text-xl font-extrabold text-blue-900">
            Misión 3 · Título y Propuesta Central
          </h2>
          <button
            type="button"
            onClick={autoFillSeed}
            className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-800 hover:bg-slate-50 cursor-pointer"
          >
            <Sparkles className="h-4 w-4 text-teal-700" />
            <span>Autocompletar Semilla</span>
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
              <label className="text-sm font-bold text-slate-900" htmlFor="p_titulo">
                Título del Proyecto (Máx. 20 palabras) *
              </label>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => startDictation('titulo')}
                  aria-pressed={seedDictTarget === 'titulo'}
                  className={`inline-flex min-h-[36px] items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-bold transition-colors cursor-pointer ${
                    seedDictTarget === 'titulo'
                      ? 'bg-red-700 text-white hover:bg-red-800'
                      : 'border border-red-300 bg-white text-red-900 hover:bg-red-50'
                  }`}
                >
                  {seedDictTarget === 'titulo' ? (
                    <>
                      <Square className="h-3.5 w-3.5 fill-current" />
                      <span>Detener</span>
                    </>
                  ) : (
                    <>
                      <Mic className="h-4 w-4 text-red-700" />
                      <span>Dictar</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={handleSuggestTitle}
                  className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg bg-teal-700 px-3 py-1.5 text-sm font-semibold text-white hover:bg-teal-800 cursor-pointer"
                >
                  <Lightbulb className="h-4 w-4" />
                  <span>Sugerir Título</span>
                </button>
              </div>
            </div>
            {seedDictTarget === 'titulo' && (
              <div className="mb-2 flex items-center justify-between gap-2 rounded-lg border border-red-300 bg-red-50 px-3 py-1.5 text-xs sm:text-sm text-red-950">
                <span>
                  {seedDictInterim ? `"${seedDictInterim}"` : 'Escuchando dictado en español...'}
                </span>
                <button
                  type="button"
                  onClick={stopDictation}
                  className="font-bold underline cursor-pointer"
                >
                  Detener
                </button>
              </div>
            )}
            <input
              id="p_titulo"
              type="text"
              value={project.seed.titulo}
              onChange={(e) =>
                onUpdateProject((p) => ({...p, seed: {...p.seed, titulo: e.target.value}}))
              }
              placeholder="Ej. Laboratorios Vivos Territoriales para desarrollar la indagación científica..."
              className={inputClass}
            />
          </div>

          <div>
            <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
              <label className="text-sm font-bold text-slate-900" htmlFor="p_sol">
                Propuesta de Solución Innovadora *
              </label>
              <button
                type="button"
                onClick={() => startDictation('solucion')}
                aria-pressed={seedDictTarget === 'solucion'}
                className={`inline-flex min-h-[36px] items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-bold transition-colors cursor-pointer ${
                  seedDictTarget === 'solucion'
                    ? 'bg-red-700 text-white hover:bg-red-800'
                    : 'border border-red-300 bg-white text-red-900 hover:bg-red-50'
                }`}
              >
                {seedDictTarget === 'solucion' ? (
                  <>
                    <Square className="h-3.5 w-3.5 fill-current" />
                    <span>Detener</span>
                  </>
                ) : (
                  <>
                    <Mic className="h-4 w-4 text-red-700" />
                    <span>Dictar solución</span>
                  </>
                )}
              </button>
            </div>
            {seedDictTarget === 'solucion' && (
              <div className="mb-2 flex items-center justify-between gap-2 rounded-lg border border-red-300 bg-red-50 px-3 py-1.5 text-xs sm:text-sm text-red-950">
                <span>
                  {seedDictInterim ? `"${seedDictInterim}"` : 'Escuchando dictado en español...'}
                </span>
                <button
                  type="button"
                  onClick={stopDictation}
                  className="font-bold underline cursor-pointer"
                >
                  Detener
                </button>
              </div>
            )}
            <textarea
              id="p_sol"
              rows={2}
              value={project.seed.solucion}
              onChange={(e) =>
                onUpdateProject((p) => ({...p, seed: {...p.seed, solucion: e.target.value}}))
              }
              placeholder="Ej. Implementación de laboratorios vivos territoriales y kits contextualizados..."
              className={inputClass}
            />
          </div>

          <button
            type="button"
            onClick={() => setShowPickers((v) => !v)}
            className="inline-flex min-h-[38px] items-center gap-1.5 text-sm font-bold text-slate-700 hover:text-red-800 cursor-pointer"
          >
            {showPickers ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            <span>
              {showPickers
                ? 'Ocultar Temáticas, Competencias CNEB y Extensión'
                : `Temáticas (${project.seed.tematicas.length}), Competencias CNEB (${project.seed.competencias.length}) y Extensión`}
            </span>
          </button>

          {showPickers && (
            <div className="space-y-4 pt-2 border-t border-slate-100">
              <div>
                <span className={labelClass}>Temáticas Prioritarias CNPIE 2027</span>
                <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-3">
                  {TEMATICAS_CNPIE.map((t) => {
                    const active = project.seed.tematicas.includes(t);
                    return (
                      <button
                        key={t}
                        type="button"
                        onClick={() => toggleTematica(t)}
                        className={`rounded-lg border px-2.5 py-1.5 text-sm font-medium text-left transition-colors cursor-pointer ${
                          active
                            ? 'border-teal-700 bg-teal-700 text-white'
                            : 'border-slate-200 bg-white text-slate-800 hover:border-slate-300'
                        }`}
                      >
                        {t}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <span className={labelClass}>Competencias CNEB Priorizadas</span>
                <div className="flex flex-wrap gap-1.5 max-h-44 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-3">
                  {COMPETENCIAS_CNEB.map((c) => {
                    const active = project.seed.competencias.includes(c);
                    return (
                      <button
                        key={c}
                        type="button"
                        onClick={() => toggleCompetencia(c)}
                        className={`rounded-lg border px-2.5 py-1.5 text-sm font-medium text-left transition-colors cursor-pointer ${
                          active
                            ? 'border-teal-700 bg-teal-700 text-white'
                            : 'border-slate-200 bg-white text-slate-800 hover:border-slate-300'
                        }`}
                      >
                        {c}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className={labelClass} htmlFor="p_densidad">
                  Calibración de Palabras (Regla -100 palabras del tope Bases)
                </label>
                <select
                  id="p_densidad"
                  value={project.densidad}
                  onChange={(e) =>
                    onUpdateProject((prev) => ({...prev, densidad: e.target.value as DensityId}))
                  }
                  className={inputClass}
                >
                  <option value="optimo">Estándar Oficial (-100 palabras del tope)</option>
                  <option value="sintetico">Sintético (-160 palabras del tope)</option>
                  <option value="extenso">Amplio (-45 palabras del tope)</option>
                </select>
              </div>
            </div>
          )}
        </div>

        <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onBackHome}
            className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50 cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Inicio</span>
          </button>
          <button
            type="button"
            onClick={onNextStep}
            className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 cursor-pointer"
          >
            <span>Ir a Misiones (Paso 2)</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </section>
    </div>
  );
};
