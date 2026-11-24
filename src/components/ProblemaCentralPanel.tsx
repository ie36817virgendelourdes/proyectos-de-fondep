import React, {useCallback, useMemo, useState} from 'react';
import {
  CheckSquare,
  ChevronDown,
  ChevronUp,
  Info,
  Lightbulb,
  Mic,
  Search,
  Sparkles,
  Square,
  X,
  Zap,
} from 'lucide-react';
import {CATEGORY_EXPLANATIONS, RUBRO_ACCENT_COLORS} from '../data/cnpieCatalogs';
import {SCHEMA_FICHAS} from '../data/cnpieSchemas';
import {useSpeechDictation} from '../hooks/useSpeechDictation';
import type {CategoryId, ModalityId, ProjectModel} from '../types/cnpie';
import {
  applyProblemAlignment,
  getAllBasesProblemSuggestions,
  getFichaPartsCatalog,
  getModalityAndProjectLabels,
  getProblemSuggestionsByModality,
  getProjectFinancialRules,
  inferProblemProfile,
  type ProblemSuggestionOption,
} from '../utils/cnpieEngine';

interface ProblemaCentralPanelProps {
  project: ProjectModel;
  compact?: boolean;
  onUpdateProject: (updater: (prev: ProjectModel) => ProjectModel) => void;
  onGenerateFullProject: () => void;
  onGenerateSelectedParts?: (partIds: string[]) => void;
  onNotify: (msg: string) => void;
}

export const ProblemaCentralPanel: React.FC<ProblemaCentralPanelProps> = ({
  project,
  compact = false,
  onUpdateProject,
  onGenerateFullProject,
  onGenerateSelectedParts,
  onNotify,
}) => {
  const schema = SCHEMA_FICHAS[project.category];
  const fin = getProjectFinancialRules(project);
  const labels = getModalityAndProjectLabels(project);
  const partsCatalog = useMemo(() => getFichaPartsCatalog(project), [project]);
  const suggestedProblems = useMemo(() => getProblemSuggestionsByModality(project), [project]);
  const allBasesProblems = useMemo(() => getAllBasesProblemSuggestions(project), [project]);
  const activeProfile = useMemo(
    () => inferProblemProfile(project.seed.problema, project),
    [project]
  );

  const [showModalitySelector, setShowModalitySelector] = useState(!compact);
  const [showPartPicker, setShowPartPicker] = useState(false);
  const [showProblemSuggestions, setShowProblemSuggestions] = useState(false);
  const [selectedPartIds, setSelectedPartIds] = useState<string[]>([]);
  const [hoveredCategory, setHoveredCategory] = useState<CategoryId | null>(null);
  const [problemScopeFilter, setProblemScopeFilter] = useState<
    'todas' | 'tematicas_eb' | 'eib' | 'sft' | 'iape' | 'modalidades_esp'
  >('todas');
  const [problemSearchQuery, setProblemSearchQuery] = useState('');

  const filteredBasesProblems = useMemo(() => {
    const q = problemSearchQuery.trim().toLowerCase();
    return allBasesProblems.filter((opt) => {
      const matchesScope =
        problemScopeFilter === 'todas' || opt.scopeGroup === problemScopeFilter;
      if (!matchesScope) return false;
      if (!q) return true;
      const hay = `${opt.areaLabel} ${opt.tematica} ${opt.scopeTag} ${opt.problema}`.toLowerCase();
      return hay.includes(q);
    });
  }, [allBasesProblems, problemScopeFilter, problemSearchQuery]);

  const showSftExtra = project.category === '2C' || project.modalidad === 'MSE_SFT';
  const showLenguaField =
    project.modalidad === 'EIB_AMAZ' ||
    (project.ie.eib_tipo && project.ie.eib_tipo !== 'No aplica');

  const selectCategory = (catKey: CategoryId) => {
    onUpdateProject((prev) => {
      let nextMod = prev.modalidad;
      let nextNivel = prev.ie.nivel;
      if (catKey === '2C') {
        nextMod = 'MSE_SFT';
        nextNivel = 'Secundaria';
      } else if (prev.modalidad === 'MSE_SFT') {
        nextMod = 'EB';
      }
      return {
        ...prev,
        category: catKey,
        modalidad: nextMod,
        ie: {...prev.ie, nivel: nextNivel},
      };
    });
    setSelectedPartIds([]);
  };

  const handleModalityChange = (mod: ModalityId) => {
    onUpdateProject((prev) => {
      const nextCat = mod === 'MSE_SFT' && prev.category !== '2C' ? '2C' : prev.category;
      const nextEib =
        mod === 'EIB_AMAZ' && prev.ie.eib_tipo === 'No aplica'
          ? 'EIB Fortalecimiento'
          : prev.ie.eib_tipo;
      const nextNivel = mod === 'MSE_SFT' ? 'Secundaria' : prev.ie.nivel;
      return {
        ...prev,
        modalidad: mod,
        category: nextCat,
        ie: {...prev.ie, eib_tipo: nextEib, nivel: nextNivel},
      };
    });
    setSelectedPartIds([]);
  };

  const updateProblemaCentral = useCallback(
    (nextVal: string) => {
      onUpdateProject((prev) => ({
        ...prev,
        seed: {...prev.seed, problema: nextVal},
        arbolProblemas: prev.arbolProblemas
          ? {...prev.arbolProblemas, problemaCentral: nextVal}
          : prev.arbolProblemas,
      }));
    },
    [onUpdateProject]
  );

  const handleSpeechFinal = useCallback(
    (_targetId: string, spoken: string) => {
      const cleanSpoken = spoken.trim();
      if (!cleanSpoken) return;
      onUpdateProject((prev) => {
        const current = (prev.seed.problema || '').replace(/\s+$/, '');
        const needsCap = !current || /[.!?\n]$/.test(current);
        const formatted = needsCap
          ? cleanSpoken.charAt(0).toUpperCase() + cleanSpoken.slice(1)
          : cleanSpoken;
        const nextVal = current ? `${current} ${formatted}` : formatted;
        return {
          ...prev,
          seed: {...prev.seed, problema: nextVal},
          arbolProblemas: prev.arbolProblemas
            ? {...prev.arbolProblemas, problemaCentral: nextVal}
            : prev.arbolProblemas,
        };
      });
    },
    [onUpdateProject]
  );

  const {activeTargetId, interimText, startDictation, stopDictation} = useSpeechDictation({
    onFinalTranscript: handleSpeechFinal,
    onNotify,
  });

  const isDictating = activeTargetId === 'problema_central';

  const handleSelectSuggestedProblema = (opt: ProblemSuggestionOption) => {
    const adjustedParts: string[] = [];
    onUpdateProject((prev) => {
      let nextCat = prev.category;
      let nextMod = prev.modalidad;
      let nextNivel = prev.ie.nivel;
      let nextArea = prev.ie.area;
      let nextZona = prev.ie.zona_especial;
      let nextEib = prev.ie.eib_tipo;

      if (opt.recommendedCategory && opt.recommendedCategory !== prev.category) {
        nextCat = opt.recommendedCategory;
        adjustedParts.push(`Anexo ${opt.recommendedCategory}`);
      }
      if (opt.recommendedModality && opt.recommendedModality !== prev.modalidad) {
        nextMod = opt.recommendedModality;
        adjustedParts.push(
          opt.recommendedModality === 'MSE_SFT'
            ? 'MSE-SFT'
            : opt.recommendedModality === 'EIB_AMAZ'
            ? 'EIB Amazónico'
            : 'EB'
        );
      }
      if (nextCat === '2C') {
        nextMod = 'MSE_SFT';
        nextNivel = 'Secundaria';
      } else if (prev.category === '2C' && opt.scopeGroup !== 'sft' && opt.recommendedCategory) {
        nextMod = opt.recommendedModality || 'EB';
      }

      if (opt.recommendedNivel && opt.recommendedNivel !== nextNivel) {
        nextNivel = opt.recommendedNivel;
        adjustedParts.push(opt.recommendedNivel);
      }
      if (opt.recommendedArea) nextArea = opt.recommendedArea;
      if (opt.recommendedZona) nextZona = opt.recommendedZona;
      if (opt.recommendedEibTipo && nextEib === 'No aplica') {
        nextEib = opt.recommendedEibTipo;
      }

      const preAligned: ProjectModel = {
        ...prev,
        category: nextCat,
        modalidad: nextMod,
        ie: {
          ...prev.ie,
          nivel: nextNivel,
          area: nextArea,
          zona_especial: nextZona,
          eib_tipo: nextEib,
        },
      };

      const aligned = applyProblemAlignment(preAligned, opt.problema, {
        syncTitleAndSolution: true,
        syncBeneficiarios: true,
        syncTrees: Boolean(prev.arbolProblemas),
      });

      return {
        ...aligned,
        seed: {
          ...aligned.seed,
          tematicas: Array.from(new Set([opt.tematica, ...aligned.seed.tematicas])).slice(0, 3),
        },
      };
    });
    setShowProblemSuggestions(false);
    setSelectedPartIds([]);
    const extraInfo = adjustedParts.length > 0 ? ` · Ajustado a ${adjustedParts.join(', ')}` : '';
    onNotify(
      `Problema aplicado (${opt.areaLabel}${extraInfo}): título, solución y competencias alineados.`
    );
  };

  const handleSyncToCurrentProblema = () => {
    onUpdateProject((prev) =>
      applyProblemAlignment(prev, prev.seed.problema || suggestedProblems[0]?.problema || '', {
        syncTitleAndSolution: true,
        syncBeneficiarios: true,
        syncTrees: Boolean(prev.arbolProblemas),
      })
    );
    onNotify(`Proyecto alineado al enfoque: ${activeProfile.domainLabel}.`);
  };

  const togglePartId = (id: string) => {
    setSelectedPartIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const selectAllParts = () => {
    setSelectedPartIds(partsCatalog.filter((p) => p.kind !== 'anexos').map((p) => p.id));
  };

  const selectPendingParts = () => {
    setSelectedPartIds(
      partsCatalog.filter((p) => p.kind !== 'anexos' && !p.completed).map((p) => p.id)
    );
  };

  const clearSelectedParts = () => {
    setSelectedPartIds([]);
  };

  const sectionsGrouped = useMemo(() => {
    return schema.sections.map((sec) => ({
      section: sec,
      items: partsCatalog.filter((p) => p.sectionId === sec.id),
    }));
  }, [schema, partsCatalog]);

  const selectClass =
    'w-full min-h-[42px] rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm sm:text-base font-medium text-slate-950 focus:border-red-800 focus:outline-none';

  const placeholderByModality =
    project.category === '2C' || project.modalidad === 'MSE_SFT'
      ? 'Ej. Limitado desarrollo de competencias técnicas y emprendedoras en la especialidad SFT...'
      : project.category === '2D'
      ? 'Ej. El 60% de los estudiantes presenta bajo logro en indagación o lectura crítica por sesiones expositivas...'
      : project.modalidad === 'EIB_AMAZ'
      ? 'Ej. El 64% de los estudiantes evidencia dificultades en comprensión y expresión oral bilingüe...'
      : 'Ej. El 62% de los estudiantes se ubica en nivel Inicio en la competencia priorizada...';

  return (
    <section
      aria-label="Problema Central y Modalidad"
      className="rounded-2xl border-2 border-blue-800 bg-white shadow-sm"
    >
      {/* Cabecera */}
      <div className="rounded-t-[14px] bg-blue-800 px-4 sm:px-5 py-3 text-white flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-base sm:text-lg font-extrabold tracking-tight">
            Problema Central y Modalidad
          </h2>
          <span className="text-xs sm:text-sm text-blue-100 font-mono-tabular">
            {schema.code} · {labels.modLabel.split('(')[0].trim()} · {project.ie.nivel} · S/{' '}
            {fin.maxMonto.toLocaleString('es-PE')}
          </span>
        </div>

        {compact && (
          <button
            type="button"
            onClick={() => setShowModalitySelector((v) => !v)}
            className="inline-flex min-h-[36px] items-center gap-1 rounded-lg bg-blue-950/50 px-3 py-1.5 text-xs sm:text-sm font-semibold text-white hover:bg-blue-950 cursor-pointer"
          >
            <span>
              {showModalitySelector ? 'Ocultar ficha y modalidad' : 'Ficha y modalidad'}
            </span>
            {showModalitySelector ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </button>
        )}
      </div>

      <div className="p-4 sm:p-5 space-y-4">
        {/* Selector completo de Ficha, Modalidad y Opciones según la Modalidad */}
        {showModalitySelector && (
          <div className="space-y-3.5">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-end">
              <div className="lg:col-span-7">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                  <span className="block text-sm font-bold text-slate-900">
                    Ficha / Categoría CNPIE 2027
                  </span>
                  <span className="text-xs font-medium text-slate-600">
                    Pasa el cursor sobre cada categoría para ver su explicación completa
                  </span>
                </div>
                <div className="relative grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(Object.keys(SCHEMA_FICHAS) as CategoryId[]).map((catKey) => {
                    const sc = SCHEMA_FICHAS[catKey];
                    const detail = CATEGORY_EXPLANATIONS[catKey];
                    const selected = project.category === catKey;
                    const isHovered = hoveredCategory === catKey;
                    const alignRight = catKey === '2C' || catKey === '2D';

                    return (
                      <div
                        key={catKey}
                        className="sm:relative"
                        onMouseEnter={() => setHoveredCategory(catKey)}
                        onMouseLeave={() =>
                          setHoveredCategory((curr) => (curr === catKey ? null : curr))
                        }
                        onBlur={(e) => {
                          if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
                            setHoveredCategory((curr) => (curr === catKey ? null : curr));
                          }
                        }}
                      >
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() => selectCategory(catKey)}
                            onFocus={() => setHoveredCategory(catKey)}
                            aria-describedby={`cat_tooltip_${catKey}`}
                            className={`w-full rounded-xl border-2 px-3 py-2 pr-8 text-left transition-colors cursor-pointer ${
                              selected
                                ? 'border-blue-700 bg-blue-50 text-blue-950'
                                : 'border-slate-300 bg-white text-slate-800 hover:border-blue-500'
                            }`}
                          >
                            <div className="text-sm font-extrabold font-mono-tabular">
                              {sc.code.replace('Anexo N° ', 'Anexo ')}
                            </div>
                            <div className="text-xs font-semibold truncate">
                              {detail.shortName}
                            </div>
                          </button>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setHoveredCategory((curr) => (curr === catKey ? null : catKey));
                            }}
                            aria-label={`Ver explicación completa de ${sc.code}`}
                            aria-expanded={isHovered}
                            className={`absolute top-1.5 right-1.5 inline-flex h-6 w-6 items-center justify-center rounded-md transition-colors cursor-pointer ${
                              isHovered
                                ? 'bg-blue-700 text-white'
                                : 'text-slate-500 hover:bg-blue-100 hover:text-blue-800'
                            }`}
                          >
                            <Info className="h-3.5 w-3.5" aria-hidden="true" />
                          </button>
                        </div>

                        {isHovered && (
                          <div
                            id={`cat_tooltip_${catKey}`}
                            role="tooltip"
                            className={`absolute left-0 right-0 top-full mt-2 z-40 sm:w-[390px] md:w-[440px] rounded-2xl border-2 border-blue-700 bg-white p-4 shadow-xl text-left space-y-2.5 ${
                              alignRight ? 'sm:left-auto sm:right-0' : 'sm:left-0 sm:right-auto'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-2">
                              <div className="space-y-0.5">
                                <div className="flex flex-wrap items-center gap-1.5 text-xs font-extrabold">
                                  <span className="rounded-md bg-blue-800 px-2 py-0.5 text-white font-mono-tabular">
                                    {sc.code}
                                  </span>
                                  <span className="text-blue-800">{detail.linea}</span>
                                </div>
                                <h3 className="text-sm sm:text-base font-extrabold text-slate-900 leading-snug pt-0.5">
                                  {detail.fullTitle}
                                </h3>
                              </div>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setHoveredCategory(null);
                                }}
                                aria-label="Cerrar explicación"
                                className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 cursor-pointer"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </div>

                            <p className="text-xs sm:text-sm text-slate-800 leading-relaxed">
                              {detail.explicacion}
                            </p>

                            <div className="grid grid-cols-1 gap-1.5 rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-800">
                              <div>
                                <strong className="text-slate-900">Trayectoria:</strong>{' '}
                                {detail.trayectoria}
                              </div>
                              <div>
                                <strong className="text-slate-900">Dirigido a:</strong>{' '}
                                {detail.dirigidoA}
                              </div>
                              <div>
                                <strong className="text-slate-900">Financiamiento:</strong>{' '}
                                {detail.financiamiento}
                              </div>
                            </div>

                            <div className="space-y-1">
                              <div className="text-xs font-extrabold text-slate-700">
                                Requisitos y evidencias clave:
                              </div>
                              <ul className="list-disc pl-4 space-y-1 text-xs text-slate-700 leading-snug">
                                {detail.requisitosClave.map((req, rIdx) => (
                                  <li key={rIdx}>{req}</li>
                                ))}
                              </ul>
                            </div>

                            <div className="pt-1.5 border-t border-slate-100 flex items-center justify-between gap-2 text-xs font-bold">
                              <span className={selected ? 'text-emerald-700' : 'text-blue-800'}>
                                {selected
                                  ? 'Categoría activa actualmente'
                                  : `Haz clic para seleccionar ${sc.code}`}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="lg:col-span-5">
                <label
                  htmlFor="core_modalidad"
                  className="block text-sm font-bold text-slate-900 mb-1.5"
                >
                  Modalidad / Ámbito de la IIEE
                </label>
                <select
                  id="core_modalidad"
                  value={project.modalidad}
                  onChange={(e) => handleModalityChange(e.target.value as ModalityId)}
                  className="w-full min-h-[44px] rounded-xl border-2 border-slate-300 bg-white px-3.5 py-2 text-base font-semibold text-slate-950 focus:border-red-800 focus:outline-none"
                >
                  <option value="EB">
                    {project.category === '2D'
                      ? 'Educación Básica · S/ 14,000 (IAPE)'
                      : 'Educación Básica · S/ 18,000'}
                  </option>
                  <option value="EIB_AMAZ">EIB Ámbito Amazónico · S/ 21,600</option>
                  <option value="MSE_SFT">MSE-SFT Formación Técnica · S/ 70,000</option>
                </select>
              </div>
            </div>

            {/* Todas las opciones seleccionables propias de la modalidad / ficha */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3.5 space-y-3">
              <div className="text-xs sm:text-sm font-bold text-slate-800">
                Opciones de la Modalidad ({schema.code} · {labels.modLabel.split('(')[0].trim()})
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                <div>
                  <label htmlFor="core_nivel" className="block text-xs font-bold text-slate-700 mb-1">
                    Nivel / Submodalidad
                  </label>
                  <select
                    id="core_nivel"
                    value={project.ie.nivel}
                    onChange={(e) =>
                      onUpdateProject((p) => ({...p, ie: {...p.ie, nivel: e.target.value}}))
                    }
                    className={selectClass}
                  >
                    <option value="Inicial">EBR · Inicial</option>
                    <option value="Primaria">EBR · Primaria</option>
                    <option value="Secundaria">EBR · Secundaria</option>
                    <option value="EBA">EBA · Básica Alternativa</option>
                    <option value="EBE">EBE · Básica Especial</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="core_area" className="block text-xs font-bold text-slate-700 mb-1">
                    Ámbito / Ruralidad
                  </label>
                  <select
                    id="core_area"
                    value={project.ie.area}
                    onChange={(e) =>
                      onUpdateProject((p) => ({...p, ie: {...p.ie, area: e.target.value}}))
                    }
                    className={selectClass}
                  >
                    <option value="Urbana">Urbana</option>
                    <option value="Rural 1">Rural 1 (+10%)</option>
                    <option value="Rural 2">Rural 2 (+5%)</option>
                    <option value="Rural 3">Rural 3</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="core_zona" className="block text-xs font-bold text-slate-700 mb-1">
                    Condición / Convenio
                  </label>
                  <select
                    id="core_zona"
                    value={project.ie.zona_especial}
                    onChange={(e) =>
                      onUpdateProject((p) => ({
                        ...p,
                        ie: {...p.ie, zona_especial: e.target.value},
                      }))
                    }
                    className={selectClass}
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
                  <label htmlFor="core_eib" className="block text-xs font-bold text-slate-700 mb-1">
                    Atención EIB
                  </label>
                  <select
                    id="core_eib"
                    value={project.ie.eib_tipo}
                    onChange={(e) =>
                      onUpdateProject((p) => ({...p, ie: {...p.ie, eib_tipo: e.target.value}}))
                    }
                    className={selectClass}
                  >
                    <option value="No aplica">No aplica</option>
                    <option value="EIB Fortalecimiento">EIB Fortalecimiento (+5%)</option>
                    <option value="EIB Revitalización">EIB Revitalización (+5%)</option>
                    <option value="EIB Ámbito Urbano">EIB Ámbito Urbano (+5%)</option>
                  </select>
                </div>
              </div>

              {(showLenguaField || showSftExtra) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-1">
                  {showLenguaField && (
                    <div>
                      <label
                        htmlFor="core_lengua"
                        className="block text-xs font-bold text-slate-700 mb-1"
                      >
                        Lengua Originaria (EIB)
                      </label>
                      <input
                        id="core_lengua"
                        type="text"
                        value={project.ie.lengua}
                        onChange={(e) =>
                          onUpdateProject((p) => ({...p, ie: {...p.ie, lengua: e.target.value}}))
                        }
                        placeholder="Ej. Quechua Chanka / Asháninka"
                        className={selectClass}
                      />
                    </div>
                  )}

                  {showSftExtra && (
                    <>
                      <div>
                        <label
                          htmlFor="core_esp"
                          className="block text-xs font-bold text-slate-700 mb-1"
                        >
                          Especialidad Técnica (MSE-SFT)
                        </label>
                        <input
                          id="core_esp"
                          type="text"
                          value={project.ie.especialidad}
                          onChange={(e) =>
                            onUpdateProject((p) => ({
                              ...p,
                              ie: {...p.ie, especialidad: e.target.value},
                            }))
                          }
                          placeholder="Ej. Industrias Alimentarias"
                          className={selectClass}
                        />
                      </div>
                      <div>
                        <label
                          htmlFor="core_mod"
                          className="block text-xs font-bold text-slate-700 mb-1"
                        >
                          Módulo Formativo CNOF
                        </label>
                        <input
                          id="core_mod"
                          type="text"
                          value={project.ie.modulo}
                          onChange={(e) =>
                            onUpdateProject((p) => ({...p, ie: {...p.ie, modulo: e.target.value}}))
                          }
                          placeholder="Ej. Control de Calidad"
                          className={selectClass}
                        />
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Recuadro visible y enmarcado para el PROBLEMA CENTRAL */}
        <div className="rounded-xl border-2 border-amber-500 bg-amber-50/60 p-3.5 sm:p-4 space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <label
              htmlFor="core_problema_central"
              className="text-base font-extrabold text-amber-950"
            >
              Problema Central del Proyecto *
            </label>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => startDictation('problema_central')}
                aria-pressed={isDictating}
                className={`inline-flex min-h-[38px] items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-bold transition-colors cursor-pointer ${
                  isDictating
                    ? 'bg-red-700 text-white hover:bg-red-800'
                    : 'border border-red-300 bg-white text-red-900 hover:bg-red-50'
                }`}
              >
                {isDictating ? (
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
                onClick={() => setShowProblemSuggestions((v) => !v)}
                aria-expanded={showProblemSuggestions}
                className={`inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-bold transition-colors cursor-pointer ${
                  showProblemSuggestions
                    ? 'border-amber-700 bg-amber-700 text-white'
                    : 'border-amber-400 bg-white text-amber-950 hover:bg-amber-100'
                }`}
              >
                <Lightbulb className="h-4 w-4" />
                <span>Sugerir problema</span>
              </button>
            </div>
          </div>

          {showProblemSuggestions && (
            <div className="rounded-xl border border-amber-300 bg-white p-3.5 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="text-xs sm:text-sm font-extrabold text-amber-950 block">
                    Todas las posibilidades de las Bases CNPIE 2027 ({filteredBasesProblems.length}{' '}
                    de {allBasesProblems.length})
                  </span>
                  <span className="text-xs text-slate-600">
                    Incluye las 13 temáticas prioritarias, EIB Amazónico, MSE-SFT (2C), IAPE (2D),
                    EBR, EBA, EBE y ámbito Rural/Multigrado.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowProblemSuggestions(false)}
                  className="text-xs font-bold text-slate-600 hover:text-slate-900 cursor-pointer"
                >
                  Cerrar
                </button>
              </div>

              {/* Filtros por alcance de las Bases + búsqueda */}
              <div className="space-y-2">
                <div className="flex flex-wrap gap-1.5">
                  {(
                    [
                      {id: 'todas', label: `Todas (${allBasesProblems.length})`},
                      {id: 'tematicas_eb', label: '13 Temáticas EB'},
                      {id: 'eib', label: 'EIB / Amazónico'},
                      {id: 'sft', label: 'Productivos 2C (SFT)'},
                      {id: 'iape', label: 'IAPE (2D)'},
                      {id: 'modalidades_esp', label: 'Inicial / EBA / EBE / Rural'},
                    ] as const
                  ).map((tab) => {
                    const active = problemScopeFilter === tab.id;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setProblemScopeFilter(tab.id)}
                        className={`rounded-lg border px-2.5 py-1 text-xs font-bold transition-colors cursor-pointer ${
                          active
                            ? 'border-blue-700 bg-blue-700 text-white'
                            : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        {tab.label}
                      </button>
                    );
                  })}
                </div>

                <div className="relative">
                  <Search
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400"
                    aria-hidden="true"
                  />
                  <input
                    type="text"
                    value={problemSearchQuery}
                    onChange={(e) => setProblemSearchQuery(e.target.value)}
                    placeholder="Buscar por temática, área, nivel (Inicial, EBA, EBE) o modalidad..."
                    className="w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 py-1.5 text-xs sm:text-sm text-slate-900 focus:border-blue-700 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-2 max-h-72 overflow-y-auto pr-1">
                {filteredBasesProblems.length === 0 ? (
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-center text-xs sm:text-sm text-slate-600">
                    No hay problemas sugeridos que coincidan con &ldquo;{problemSearchQuery}&rdquo;.
                  </div>
                ) : (
                  filteredBasesProblems.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => handleSelectSuggestedProblema(opt)}
                      className="rounded-lg border border-amber-200 bg-amber-50/40 px-3 py-2.5 text-left transition-colors hover:border-blue-600 hover:bg-blue-50/60 cursor-pointer space-y-1"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-1.5">
                        <span className="text-xs sm:text-sm font-extrabold text-blue-900">
                          {opt.areaLabel}
                        </span>
                        <span className="rounded-md border border-blue-200 bg-white px-2 py-0.5 text-[11px] font-bold text-blue-800">
                          {opt.scopeTag}
                        </span>
                      </div>
                      <div className="text-[11px] font-semibold text-amber-900">
                        {opt.tematica}
                      </div>
                      <div className="text-xs sm:text-sm text-slate-800 leading-snug">
                        {opt.problema}
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}

          {isDictating && (
            <div className="flex items-center justify-between gap-2 rounded-lg border border-red-400 bg-red-50 px-3 py-2 text-sm text-red-950">
              <span className="font-semibold">
                {interimText ? `"${interimText}"` : 'Escuchando dictado en español...'}
              </span>
              <button
                type="button"
                onClick={stopDictation}
                className="rounded-md bg-red-700 px-2.5 py-1 text-xs font-bold text-white cursor-pointer"
              >
                Detener
              </button>
            </div>
          )}

          <textarea
            id="core_problema_central"
            rows={compact ? 2 : 3}
            value={project.seed.problema}
            onChange={(e) => updateProblemaCentral(e.target.value)}
            placeholder={placeholderByModality}
            className="w-full rounded-xl border-2 border-amber-400 bg-white px-3.5 py-2.5 text-base font-medium leading-relaxed text-slate-950 focus:border-red-800 focus:outline-none"
          />

          <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5 text-xs sm:text-sm">
            <span className="font-semibold text-amber-950">
              Enfoque detectado:{' '}
              <strong className="text-blue-900">{activeProfile.domainLabel}</strong>
            </span>
            {project.seed.problema.trim().length >= 10 && (
              <button
                type="button"
                onClick={handleSyncToCurrentProblema}
                className="inline-flex min-h-[32px] items-center gap-1 rounded-lg border border-blue-300 bg-white px-2.5 py-1 text-xs font-bold text-blue-900 hover:bg-blue-50 cursor-pointer"
              >
                <Sparkles className="h-3.5 w-3.5 text-blue-700" />
                <span>Alinear título y solución a este problema</span>
              </button>
            )}
          </div>
        </div>

        {/* Selector de Partes según la Ficha de la Modalidad */}
        {onGenerateSelectedParts && (
          <div className="space-y-2.5">
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                type="button"
                onClick={onGenerateFullProject}
                className="flex-1 flex min-h-[48px] items-center justify-center gap-2 rounded-xl bg-blue-700 px-4 py-3 text-base font-extrabold text-white transition-colors hover:bg-blue-800 cursor-pointer"
              >
                <Zap className="h-5 w-5 shrink-0" aria-hidden="true" />
                <span>
                  Redactar Toda la Ficha {schema.code} ({labels.modLabel.split('(')[0].trim()})
                </span>
              </button>

              <button
                type="button"
                onClick={() => setShowPartPicker((v) => !v)}
                aria-expanded={showPartPicker}
                className={`inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl border-2 px-4 py-3 text-sm sm:text-base font-bold transition-colors cursor-pointer ${
                  showPartPicker
                    ? 'border-slate-900 bg-slate-900 text-white'
                    : 'border-slate-300 bg-white text-slate-900 hover:bg-slate-50'
                }`}
              >
                <CheckSquare className="h-4 w-4 shrink-0" />
                <span>Elegir partes ({partsCatalog.length})</span>
              </button>
            </div>

            {showPartPicker && (
              <div className="rounded-xl border border-slate-300 bg-slate-50 p-3.5 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm font-extrabold text-slate-900">
                    Selecciona las partes de {schema.code} ({labels.modLabel.split('(')[0].trim()})
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={selectAllParts}
                      className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-bold text-slate-800 hover:bg-slate-100 cursor-pointer"
                    >
                      Todas
                    </button>
                    <button
                      type="button"
                      onClick={selectPendingParts}
                      className="rounded-lg border border-amber-300 bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-950 hover:bg-amber-100 cursor-pointer"
                    >
                      Solo pendientes
                    </button>
                    <button
                      type="button"
                      onClick={clearSelectedParts}
                      className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-bold text-slate-700 hover:bg-slate-100 cursor-pointer"
                    >
                      Limpiar
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 max-h-80 overflow-y-auto pr-1">
                  {sectionsGrouped.map(({section, items}) => (
                    <div
                      key={section.id}
                      className="rounded-xl border border-slate-200 bg-white p-3 space-y-2"
                    >
                      <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-1.5">
                        <span className="text-sm font-extrabold text-slate-900">{section.tab}</span>
                        <button
                          type="button"
                          onClick={() => {
                            const secIds = items
                              .filter((it) => it.kind !== 'anexos')
                              .map((it) => it.id);
                            const allIn = secIds.every((id) => selectedPartIds.includes(id));
                            setSelectedPartIds((prev) =>
                              allIn
                                ? prev.filter((id) => !secIds.includes(id))
                                : Array.from(new Set([...prev, ...secIds]))
                            );
                          }}
                          className="text-xs font-bold text-red-800 hover:underline cursor-pointer"
                        >
                          Toda esta parte
                        </button>
                      </div>

                      <div className="space-y-1.5">
                        {items.map((item) => {
                          const pal = RUBRO_ACCENT_COLORS[item.colorIdx];
                          const disabled = item.kind === 'anexos';
                          const checked = selectedPartIds.includes(item.id);
                          return (
                            <label
                              key={item.id}
                              className={`flex items-start justify-between gap-2 rounded-lg border px-2.5 py-2 text-xs sm:text-sm ${
                                disabled
                                  ? 'border-slate-100 bg-slate-50 text-slate-600'
                                  : checked
                                  ? `${pal.cardBorder} bg-slate-50 cursor-pointer`
                                  : 'border-slate-200 bg-white hover:bg-slate-50 cursor-pointer'
                              }`}
                            >
                              <div className="flex items-start gap-2 min-w-0">
                                {!disabled && (
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={() => togglePartId(item.id)}
                                    className="mt-0.5 h-4 w-4 shrink-0"
                                  />
                                )}
                                <div className="min-w-0">
                                  <span className={`font-extrabold ${pal.subText}`}>
                                    {item.code}:{' '}
                                  </span>
                                  <span className={`font-bold ${pal.titleText}`}>{item.title}</span>
                                </div>
                              </div>
                              <span className="font-mono-tabular text-xs font-bold text-slate-600 shrink-0">
                                {item.pct}%
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  disabled={selectedPartIds.length === 0}
                  onClick={() => onGenerateSelectedParts(selectedPartIds)}
                  className="flex w-full min-h-[44px] items-center justify-center gap-2 rounded-xl bg-teal-700 px-4 py-2.5 text-sm sm:text-base font-bold text-white transition-colors hover:bg-teal-800 disabled:opacity-45 disabled:cursor-not-allowed cursor-pointer"
                >
                  <Zap className="h-4 w-4" />
                  <span>
                    Redactar {selectedPartIds.length} parte(s) seleccionada(s)
                  </span>
                </button>
              </div>
            )}
          </div>
        )}

        {!onGenerateSelectedParts && (
          <button
            type="button"
            onClick={onGenerateFullProject}
            className="flex w-full min-h-[48px] items-center justify-center gap-2 rounded-xl bg-red-800 px-4 py-3 text-base font-extrabold text-white transition-colors hover:bg-red-900 cursor-pointer"
          >
            <Zap className="h-5 w-5 shrink-0" aria-hidden="true" />
            <span>
              Redactar Todo el Proyecto según {schema.code} ({labels.modLabel.split('(')[0].trim()})
            </span>
          </button>
        )}
      </div>
    </section>
  );
};
