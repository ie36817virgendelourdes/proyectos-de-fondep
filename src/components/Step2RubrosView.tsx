import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Award,
  BarChart3,
  BookOpen,
  CheckCircle2,
  ClipboardCheck,
  ClipboardCopy,
  Eye,
  FileDown,
  GitBranch,
  Lightbulb,
  Map as MapIcon,
  Mic,
  Plus,
  Rocket,
  Search,
  SlidersHorizontal,
  Sparkles,
  Square,
  Trash2,
  Undo2,
  Video,
  X,
  Zap,
} from 'lucide-react';
import {RUBRO_ACCENT_COLORS} from '../data/cnpieCatalogs';
import {SCHEMA_FICHAS} from '../data/cnpieSchemas';
import {useSpeechDictation} from '../hooks/useSpeechDictation';
import type {
  ArbolObjetivos,
  ArbolProblemas,
  FichaPartItem,
  ProjectModel,
  SchemaField,
} from '../types/cnpie';
import {
  buildProjectContext,
  calibrateTextToWordTarget,
  computeProjectDashboardData,
  countWords,
  evaluateProjectRubricNivel4,
  generateArbolObjetivosData,
  generateArbolProblemasData,
  generateCuadroAData,
  generateCuadroBData,
  generateFieldContent,
  generateSingleInstrumentContent,
  getAnexo3Text,
  getAnexo4Text,
  getContextualRubroSuggestions,
  getFichaPartsCatalog,
  getMissionGuidance,
  getModalityAndProjectLabels,
  getProjectFinancialRules,
  getRequiredInstrumentsForProject,
  getRubroStatusInfo,
  getWordTargetMetrics,
  runQuickParagraphAudit,
  type QuickAuditResult,
  type RubricFieldComparison,
} from '../utils/cnpieEngine';
import {exportArbolWord} from '../utils/cnpieExporters';
import {ProblemaCentralPanel} from './ProblemaCentralPanel';
import {ProjectDashboardPanel} from './ProjectDashboardPanel';
import {RubricNivel4Panel} from './RubricNivel4Panel';

interface Step2RubrosViewProps {
  project: ProjectModel;
  activeSectionTab: string;
  onChangeSectionTab: (tabId: string) => void;
  onUpdateProject: (updater: (prev: ProjectModel) => ProjectModel) => void;
  onGenerateFullProject: () => void;
  onGenerateSelectedParts: (partIds: string[]) => void;
  onCopyText: (text: string, msg: string) => void;
  onNotify: (msg: string) => void;
  onBackStep1: () => void;
  onNextStep3: () => void;
  onEnterReadingMode: () => void;
}

export const Step2RubrosView: React.FC<Step2RubrosViewProps> = ({
  project,
  activeSectionTab,
  onChangeSectionTab,
  onUpdateProject,
  onGenerateFullProject,
  onGenerateSelectedParts,
  onCopyText,
  onNotify,
  onBackStep1,
  onNextStep3,
  onEnterReadingMode,
}) => {
  const schema = SCHEMA_FICHAS[project.category];
  const fin = getProjectFinancialRules(project);
  const modLabels = getModalityAndProjectLabels(project);
  const partsCatalog = useMemo(() => getFichaPartsCatalog(project), [project]);
  const [mapOpen, setMapOpen] = useState(false);
  const [dashboardOpen, setDashboardOpen] = useState(false);
  const [rubricOpen, setRubricOpen] = useState(false);
  const [highlightWeakFields, setHighlightWeakFields] = useState(true);
  const [viewAllParts, setViewAllParts] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [arbolMode, setArbolMode] = useState<'problemas' | 'objetivos'>('problemas');
  const [selectedMapPartIds, setSelectedMapPartIds] = useState<string[]>([]);
  const [openSuggestions, setOpenSuggestions] = useState<Record<string, boolean>>({});
  const [openGuide, setOpenGuide] = useState<Record<string, boolean>>({});
  const [undoBuffer, setUndoBuffer] = useState<Record<string, string>>({});
  const [microInputs, setMicroInputs] = useState<Record<string, string>>({});
  const [textSelections, setTextSelections] = useState<Record<string, {start: number; end: number}>>({});
  const [quickAudits, setQuickAudits] = useState<Record<string, QuickAuditResult | null>>({});

  const dashboardSummary = useMemo(() => computeProjectDashboardData(project), [project]);
  const rubricReport = useMemo(() => evaluateProjectRubricNivel4(project), [project]);

  const orderMap = useMemo(() => {
    const map: Record<string, {order: number; colorIdx: number}> = {};
    let counter = 1;
    schema.sections.forEach((sec) => {
      sec.fields.forEach((f) => {
        map[f.key] = {
          order: counter,
          colorIdx: (counter - 1) % RUBRO_ACCENT_COLORS.length,
        };
        counter++;
      });
    });
    return map;
  }, [schema]);

  const {totalRubros, completedRubros, overallPct, missingRubros} = useMemo(() => {
    const allFields = schema.sections.flatMap((sec) =>
      sec.fields.map((f) => ({secId: sec.id, field: f}))
    );
    const missing: Array<{secId: string; key: string; order: number; code: string}> = [];
    let completed = 0;

    allFields.forEach(({secId, field}) => {
      if (getRubroStatusInfo(project, field).state === 'complete') {
        completed++;
      } else {
        missing.push({
          secId,
          key: field.key,
          order: orderMap[field.key]?.order || 1,
          code: field.code,
        });
      }
    });

    const total = allFields.length;
    const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
    return {
      totalRubros: total,
      completedRubros: completed,
      overallPct: pct,
      missingRubros: missing,
    };
  }, [project, schema, orderMap]);

  const activeSection =
    schema.sections.find((s) => s.id === activeSectionTab) || schema.sections[0];
  const activeSecIndex = schema.sections.findIndex((s) => s.id === activeSection.id);

  const appendDictatedText = useCallback((existing: string, spoken: string): string => {
    const cleanSpoken = spoken.trim();
    if (!cleanSpoken) return existing;
    const trimmedExisting = existing.replace(/\s+$/, '');
    const needsCap = !trimmedExisting || /[.!?\n]$/.test(trimmedExisting);
    const formatted = needsCap
      ? cleanSpoken.charAt(0).toUpperCase() + cleanSpoken.slice(1)
      : cleanSpoken;
    if (!trimmedExisting) return formatted;
    return `${trimmedExisting} ${formatted}`;
  }, []);

  const handleSpeechFinal = useCallback(
    (targetId: string, spoken: string) => {
      if (targetId.startsWith('rubro:')) {
        const key = targetId.slice('rubro:'.length);
        onUpdateProject((prev) => ({
          ...prev,
          fields: {
            ...prev.fields,
            [key]: appendDictatedText(prev.fields[key] || '', spoken),
          },
        }));
      } else if (targetId.startsWith('inst:')) {
        const instId = targetId.slice('inst:'.length);
        onUpdateProject((prev) => ({
          ...prev,
          instruments: {
            ...(prev.instruments || {}),
            [instId]: appendDictatedText((prev.instruments || {})[instId] || '', spoken),
          },
        }));
      }
    },
    [appendDictatedText, onUpdateProject]
  );

  const {
    activeTargetId: dictationTargetId,
    interimText: dictationInterimText,
    startDictation,
    stopDictation,
  } = useSpeechDictation({
    onFinalTranscript: handleSpeechFinal,
    onNotify,
  });

  useEffect(() => {
    stopDictation();
  }, [activeSectionTab, stopDictation]);

  const handleToggleRubroDictation = (key: string) => {
    const targetId = `rubro:${key}`;
    if (dictationTargetId !== targetId) {
      setUndoBuffer((prev) => ({...prev, [key]: project.fields[key] || ''}));
    }
    startDictation(targetId);
  };

  const handleToggleInstDictation = (instId: string) => {
    startDictation(`inst:${instId}`);
  };

  const saveUndoAndSetField = (key: string, nextValue: string) => {
    setUndoBuffer((prev) => ({...prev, [key]: project.fields[key] || ''}));
    onUpdateProject((prev) => ({
      ...prev,
      fields: {...prev.fields, [key]: nextValue},
    }));
  };

  const handleUndo = (key: string) => {
    if (!(key in undoBuffer)) return;
    const oldVal = undoBuffer[key];
    setUndoBuffer((prev) => {
      const next = {...prev};
      delete next[key];
      return next;
    });
    onUpdateProject((prev) => ({
      ...prev,
      fields: {...prev.fields, [key]: oldVal},
    }));
    onNotify('Se restauró la versión anterior del rubro.');
  };

  const captureTextareaSelection = (key: string, el: HTMLTextAreaElement) => {
    const start = el.selectionStart ?? 0;
    const end = el.selectionEnd ?? start;
    setTextSelections((prev) => {
      const curr = prev[key];
      if (curr && curr.start === start && curr.end === end) return prev;
      return {...prev, [key]: {start, end}};
    });
  };

  const extractSelectedOrActiveParagraph = (
    fullText: string,
    sel?: {start: number; end: number}
  ): {
    fragment: string;
    mode: 'selection' | 'cursor_paragraph' | 'full_rubro';
    paragraphNumber: number | null;
  } => {
    if (!fullText.trim()) {
      return {fragment: '', mode: 'full_rubro', paragraphNumber: null};
    }
    if (sel && sel.end > sel.start) {
      const sliced = fullText.slice(sel.start, sel.end).trim();
      if (sliced.length > 0) {
        return {fragment: sliced, mode: 'selection', paragraphNumber: null};
      }
    }

    const useDoubleBreak = /\n\s*\n/.test(fullText);
    const separator = useDoubleBreak ? /\n\s*\n+/g : /\n+/g;
    const segments: Array<{text: string; start: number; end: number; num: number}> = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = separator.exec(fullText)) !== null) {
      const chunk = fullText.slice(lastIndex, match.index);
      if (chunk.trim()) {
        segments.push({
          text: chunk.trim(),
          start: lastIndex,
          end: match.index,
          num: segments.length + 1,
        });
      }
      lastIndex = match.index + match[0].length;
    }
    const tail = fullText.slice(lastIndex);
    if (tail.trim()) {
      segments.push({
        text: tail.trim(),
        start: lastIndex,
        end: fullText.length,
        num: segments.length + 1,
      });
    }

    if (segments.length === 0) {
      return {fragment: fullText.trim(), mode: 'full_rubro', paragraphNumber: null};
    }

    const cursorPos = sel?.start ?? 0;
    const activeSeg =
      segments.find((seg) => cursorPos >= seg.start && cursorPos <= seg.end) ||
      segments.find((seg) => cursorPos <= seg.end) ||
      segments[0];

    return {
      fragment: activeSeg.text,
      mode: 'cursor_paragraph',
      paragraphNumber: activeSeg.num,
    };
  };

  const handleQuickAuditRubro = (field: SchemaField, overrideText?: string) => {
    const fullText = overrideText !== undefined ? overrideText : project.fields[field.key] || '';
    if (!fullText.trim()) {
      const emptyAudit = runQuickParagraphAudit('', '', 'full_rubro', null, field, project);
      setQuickAudits((prev) => ({...prev, [field.key]: emptyAudit}));
      onNotify('Redacta, dicta o genera un texto primero para auditarlo según FONDEP.');
      return;
    }

    const el = document.getElementById(`textarea_${field.key}`) as HTMLTextAreaElement | null;
    const savedSel = textSelections[field.key];
    const effectiveSel =
      overrideText !== undefined
        ? undefined
        : el && el.selectionEnd > el.selectionStart
        ? {start: el.selectionStart, end: el.selectionEnd}
        : savedSel ||
          (el ? {start: el.selectionStart ?? 0, end: el.selectionEnd ?? 0} : undefined);

    const extracted = extractSelectedOrActiveParagraph(fullText, effectiveSel);
    const result = runQuickParagraphAudit(
      fullText,
      extracted.fragment,
      extracted.mode,
      extracted.paragraphNumber,
      field,
      project
    );

    setQuickAudits((prev) => ({...prev, [field.key]: result}));
    onNotify(`Auditoría rápida: ${result.score}/100 · ${result.scopeLabel}.`);
  };

  const handleGenerateSingleField = (key: string, maxChars: number) => {
    const ctx = buildProjectContext(project);
    const {metaPalabras} = getWordTargetMetrics(maxChars);
    const text = generateFieldContent(key, maxChars, ctx, metaPalabras);
    saveUndoAndSetField(key, text);
    setQuickAudits((prev) => ({...prev, [key]: null}));
    onNotify(`Rubro redactado y calibrado a ${metaPalabras} palabras.`);
  };

  const handleImproveRubro = (key: string, maxChars: number, fieldObj?: SchemaField) => {
    const ctx = buildProjectContext(project);
    const {metaPalabras} = getWordTargetMetrics(maxChars);
    const current = (project.fields[key] || '').trim();
    const logic = getContextualRubroSuggestions(key, project);
    const combinedSuggestions = [...logic.contextualSuggestions, ...logic.suggestions];

    let nextText = '';
    if (countWords(current) < 25) {
      nextText = generateFieldContent(key, maxChars, ctx, metaPalabras);
    } else {
      const unusedSug = combinedSuggestions.find(
        (s: string) => !current.includes(s.slice(0, 28))
      );
      const extraParagraphs = [current];
      if (unusedSug) {
        const cleanSug = unusedSug.charAt(0).toLowerCase() + unusedSug.slice(1);
        extraParagraphs.push(
          `En coherencia directa con el problema central (${ctx.profile.problemCore}), se precisa asimismo que ${cleanSug}`
        );
      }
      extraParagraphs.push(
        `Por consiguiente, desde el enfoque por competencias del CNEB y la evaluación formativa, esta acción en ${ctx.ieNombre} (${ctx.distrito}) fortalece "${ctx.comp1}" y "${ctx.comp2}" en ${ctx.profile.domainLabel}, asegurando evidencias verificables y atención inclusiva (DUA) para los ${ctx.estudiantes} estudiantes.`
      );
      nextText = calibrateTextToWordTarget(extraParagraphs, maxChars, metaPalabras, ctx, key);
    }
    saveUndoAndSetField(key, nextText);
    if (fieldObj && quickAudits[key]) {
      const updatedProject: ProjectModel = {
        ...project,
        fields: {...project.fields, [key]: nextText},
      };
      const extracted = extractSelectedOrActiveParagraph(nextText);
      const refreshed = runQuickParagraphAudit(
        nextText,
        extracted.fragment,
        extracted.mode,
        extracted.paragraphNumber,
        fieldObj,
        updatedProject
      );
      setQuickAudits((prev) => ({...prev, [key]: refreshed}));
    }
    onNotify('Rubro mejorado con redacción académica y coherencia FONDEP.');
  };

  const handleDeepenAllWeakRubros = () => {
    const weakItems = rubricReport.items.filter((it) => it.needsDepth);
    if (weakItems.length === 0) {
      onNotify('Todos los rubros ya cumplen el estándar de la Rúbrica Nivel IV.');
      return;
    }
    const ctx = buildProjectContext(project);
    const nextFields = {...project.fields};
    const undoSnap: Record<string, string> = {};

    schema.sections.forEach((sec) => {
      sec.fields.forEach((f) => {
        const comp = rubricReport.byFieldKey[f.key];
        if (!comp || !comp.needsDepth) return;
        undoSnap[f.key] = project.fields[f.key] || '';
        const {metaPalabras} = getWordTargetMetrics(f.maxChars);
        const current = (project.fields[f.key] || '').trim();
        if (countWords(current) < 25 || comp.isOverLimit) {
          nextFields[f.key] = generateFieldContent(f.key, f.maxChars, ctx, metaPalabras);
        } else {
          const logic = getContextualRubroSuggestions(f.key, project);
          const combined = [...logic.contextualSuggestions, ...logic.suggestions];
          const unused = combined.find((s) => !current.includes(s.slice(0, 28)));
          const extra = [current];
          if (unused) {
            const cleanSug = unused.charAt(0).toLowerCase() + unused.slice(1);
            extra.push(
              `En coherencia con el Problema Central (${ctx.profile.problemCore}) y la Rúbrica Nivel IV, ${cleanSug}`
            );
          }
          extra.push(
            `Asimismo, bajo el enfoque por competencias del CNEB y evaluación formativa, esta acción en ${ctx.ieNombre} (${ctx.distrito}) fortalece "${ctx.comp1}" y "${ctx.comp2}" con evidencias verificables (SIAGIE, rúbricas y actas) para los ${ctx.estudiantes} estudiantes.`
          );
          nextFields[f.key] = calibrateTextToWordTarget(extra, f.maxChars, metaPalabras, ctx, f.key);
        }
      });
    });

    setUndoBuffer((prev) => ({...prev, ...undoSnap}));
    onUpdateProject((prev) => ({...prev, fields: nextFields}));
    onNotify(
      `Se profundizaron ${weakItems.length} rubro(s) hacia los criterios de la Rúbrica Nivel IV FONDEP.`
    );
  };

  const handleInsertSuggestion = (key: string, sug: string) => {
    const current = (project.fields[key] || '').trim();
    const nextVal = current ? `${current}\n\n• ${sug}` : `• ${sug}`;
    saveUndoAndSetField(key, nextVal);
    onNotify('Sugerencia insertada en el rubro.');
  };

  const handleInsertAllSuggestions = (key: string, suggestions: string[]) => {
    const current = (project.fields[key] || '').trim();
    const bullets = suggestions.map((s) => `• ${s}`).join('\n\n');
    const nextVal = current ? `${current}\n\n${bullets}` : bullets;
    saveUndoAndSetField(key, nextVal);
    onNotify(`Se insertaron ${suggestions.length} sugerencias.`);
  };

  const handleIntegrateMicroIdea = (key: string) => {
    const idea = (microInputs[key] || '').trim();
    if (!idea) {
      onNotify('Escribe primero tu idea o dato en el recuadro.');
      return;
    }
    const ctx = buildProjectContext(project);
    const current = (project.fields[key] || '').trim();
    const cleaned = idea.charAt(0).toLowerCase() + idea.slice(1).replace(/\.$/, '');
    const enriched = `Asimismo, en coherencia con la realidad institucional de ${ctx.ieNombre} frente a ${ctx.profile.domainLabel}, se destaca que ${cleaned}, lo cual fortalece la pertinencia y sostenibilidad de la innovación.`;
    saveUndoAndSetField(key, current ? `${current}\n\n${enriched}` : enriched);
    setMicroInputs((prev) => ({...prev, [key]: ''}));
    onNotify('Idea integrada en el rubro.');
  };

  const handleCalibrateMinus100 = (key: string, maxChars: number, fieldObj?: SchemaField) => {
    const ctx = buildProjectContext(project);
    const {metaPalabras} = getWordTargetMetrics(maxChars);
    const current = (project.fields[key] || '').trim();
    const nextVal = current
      ? calibrateTextToWordTarget(current.split(/\n\n+/), maxChars, metaPalabras, ctx, key)
      : generateFieldContent(key, maxChars, ctx, metaPalabras);
    saveUndoAndSetField(key, nextVal);
    if (fieldObj && quickAudits[key]) {
      const updatedProject: ProjectModel = {
        ...project,
        fields: {...project.fields, [key]: nextVal},
      };
      const extracted = extractSelectedOrActiveParagraph(nextVal);
      const refreshed = runQuickParagraphAudit(
        nextVal,
        extracted.fragment,
        extracted.mode,
        extracted.paragraphNumber,
        fieldObj,
        updatedProject
      );
      setQuickAudits((prev) => ({...prev, [key]: refreshed}));
    }
    onNotify(`Extensión ajustada a ${metaPalabras} palabras.`);
  };

  const handleAdjustWordsPct = (key: string, maxChars: number, pctDelta: number) => {
    const ctx = buildProjectContext(project);
    const {maxWordsBases} = getWordTargetMetrics(maxChars);
    const current = (project.fields[key] || '').trim();
    const currWords = Math.max(50, countWords(current));
    const newTarget = Math.min(
      maxWordsBases - 25,
      Math.max(45, Math.round(currWords * (1 + pctDelta)))
    );
    const nextVal = current
      ? calibrateTextToWordTarget(current.split(/\n\n+/), maxChars, newTarget, ctx, key)
      : generateFieldContent(key, maxChars, ctx, newTarget);
    saveUndoAndSetField(key, nextVal);
  };

  const jumpToRubro = (secId: string, key: string) => {
    setPreviewOpen(false);
    if (!viewAllParts) onChangeSectionTab(secId);
    setTimeout(() => {
      const el = document.getElementById(`box_${key}`);
      if (el) el.scrollIntoView({behavior: 'smooth', block: 'center'});
    }, 60);
  };

  const jumpToPart = (part: FichaPartItem) => {
    setPreviewOpen(false);
    if (!viewAllParts) onChangeSectionTab(part.sectionId);
    let targetDomId = '';
    if (part.kind === 'rubro' && part.fieldKey) targetDomId = `box_${part.fieldKey}`;
    else if (part.kind === 'arbol') targetDomId = 'part_arbol';
    else if (part.kind === 'cuadroA') targetDomId = 'part_cuadroA';
    else if (part.kind === 'cuadroB') targetDomId = 'part_cuadroB';
    else if (part.kind === 'anexos') targetDomId = 'part_anexos';
    else if (part.kind === 'instrumento' && part.instrumentId) {
      targetDomId = `part_inst_${part.instrumentId}`;
    }
    setMapOpen(false);
    setTimeout(() => {
      const el = targetDomId ? document.getElementById(targetDomId) : null;
      if (el) el.scrollIntoView({behavior: 'smooth', block: 'center'});
    }, 70);
  };

  const handleGoToNextMissing = () => {
    if (missingRubros.length === 0) {
      onNotify('Todos los rubros están completos.');
      return;
    }
    const first = missingRubros[0];
    jumpToRubro(first.secId, first.key);
    onNotify(`Ubicado en Rubro ${first.order} (${first.code}).`);
  };

  const toggleMapPartId = (id: string) => {
    setSelectedMapPartIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const visibleSections = viewAllParts ? schema.sections : [activeSection];

  // Árbol de problemas y Árbol de Objetivos (Marco Lógico)
  const arbol: ArbolProblemas =
    project.arbolProblemas && project.arbolProblemas.problemaCentral
      ? project.arbolProblemas
      : generateArbolProblemasData(buildProjectContext(project));

  const updateArbol = (updater: (prev: ArbolProblemas) => ArbolProblemas) => {
    onUpdateProject((p) => {
      const base =
        p.arbolProblemas && p.arbolProblemas.problemaCentral
          ? p.arbolProblemas
          : generateArbolProblemasData(buildProjectContext(p));
      return {...p, arbolProblemas: updater(base)};
    });
  };

  const arbolObjetivos: ArbolObjetivos =
    project.arbolObjetivos && project.arbolObjetivos.objetivoGeneral
      ? project.arbolObjetivos
      : generateArbolObjetivosData(arbol, buildProjectContext(project));

  const updateArbolObjetivos = (updater: (prev: ArbolObjetivos) => ArbolObjetivos) => {
    onUpdateProject((p) => {
      const ctx = buildProjectContext(p);
      const baseProb =
        p.arbolProblemas && p.arbolProblemas.problemaCentral
          ? p.arbolProblemas
          : generateArbolProblemasData(ctx);
      const baseObj =
        p.arbolObjetivos && p.arbolObjetivos.objetivoGeneral
          ? p.arbolObjetivos
          : generateArbolObjetivosData(baseProb, ctx);
      return {...p, arbolObjetivos: updater(baseObj)};
    });
  };

  // Cuadro B cálculos
  const bienesSum = (project.cuadroB || []).reduce(
    (acc, r) => (r.rubro === 'Bienes' ? acc + (Number(r.cant) || 0) * (Number(r.unit) || 0) : acc),
    0
  );
  const serviciosSum = (project.cuadroB || []).reduce(
    (acc, r) =>
      r.rubro === 'Servicios' ? acc + (Number(r.cant) || 0) * (Number(r.unit) || 0) : acc,
    0
  );
  const totalBudget = bienesSum + serviciosSum;
  const bienesPct = totalBudget > 0 ? Math.round((bienesSum / totalBudget) * 100) : 0;
  const serviciosPct = totalBudget > 0 ? Math.round((serviciosSum / totalBudget) * 100) : 0;

  // Instrumentos
  const reqInstruments = getRequiredInstrumentsForProject(project);
  const readyInstrumentsCount = reqInstruments.filter(
    (i) =>
      ((project.instruments && project.instruments[i.id]) || '').trim().length >= 60 ||
      Boolean(project.instrumentsChecked && project.instrumentsChecked[i.id])
  ).length;

  const inputSmall =
    'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-base sm:text-sm text-slate-950 focus:border-red-700 focus:outline-none';

  return (
    <div className="space-y-5">
      {/* Núcleo compacto: Problema Central + Modalidad + Redactar Todo o Elegir Partes */}
      <ProblemaCentralPanel
        project={project}
        compact={true}
        onUpdateProject={onUpdateProject}
        onGenerateFullProject={onGenerateFullProject}
        onGenerateSelectedParts={onGenerateSelectedParts}
        onNotify={onNotify}
      />

      {/* Panel de Control Ordenado y Avance Global */}
      <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="space-y-1 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg sm:text-xl font-extrabold text-slate-900">
                {schema.code} · {schema.linea}
              </h2>
              <span className="text-sm font-extrabold font-mono-tabular text-red-800">
                Avance {completedRubros}/{totalRubros} ({overallPct}%)
              </span>
            </div>
            <div className="h-2.5 w-full max-w-md overflow-hidden rounded-full bg-slate-200">
              <div
                className={`h-full rounded-full transition-all duration-200 ${
                  overallPct === 100 ? 'bg-emerald-600' : 'bg-red-700'
                }`}
                style={{width: `${overallPct}%`}}
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2 shrink-0">
            {missingRubros.length > 0 && (
              <button
                type="button"
                onClick={handleGoToNextMissing}
                className="inline-flex min-h-[42px] items-center gap-1.5 rounded-xl border border-amber-300 bg-amber-50 px-3.5 py-2 text-sm font-semibold text-amber-950 hover:bg-amber-100 whitespace-nowrap cursor-pointer"
              >
                <Search className="h-4 w-4" />
                <span>Pendiente ({missingRubros.length})</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                setRubricOpen((v) => {
                  const next = !v;
                  if (next) setHighlightWeakFields(true);
                  return next;
                });
              }}
              className={`inline-flex min-h-[42px] items-center gap-1.5 rounded-xl border px-3.5 py-2 text-sm font-semibold whitespace-nowrap cursor-pointer ${
                rubricOpen
                  ? 'border-amber-700 bg-amber-700 text-white'
                  : 'border-amber-300 bg-amber-50 text-amber-950 hover:bg-amber-100'
              }`}
            >
              <Award className="h-4 w-4" />
              <span>
                {rubricOpen
                  ? 'Ocultar Rúbrica IV'
                  : rubricReport.needsDepthCount > 0
                  ? `Rúbrica Nivel IV (${rubricReport.needsDepthCount})`
                  : 'Rúbrica Nivel IV (100%)'}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setDashboardOpen((v) => !v)}
              className={`inline-flex min-h-[42px] items-center gap-1.5 rounded-xl border px-3.5 py-2 text-sm font-semibold whitespace-nowrap cursor-pointer ${
                dashboardOpen
                  ? 'border-indigo-700 bg-indigo-700 text-white'
                  : 'border-indigo-200 bg-indigo-50 text-indigo-950 hover:bg-indigo-100'
              }`}
            >
              <BarChart3 className="h-4 w-4" />
              <span>
                {dashboardOpen
                  ? 'Ocultar Panel'
                  : `Panel de Control (${dashboardSummary.alerts.length})`}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setMapOpen((v) => !v)}
              className="inline-flex min-h-[42px] items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50 whitespace-nowrap cursor-pointer"
            >
              <MapIcon className="h-4 w-4" />
              <span>
                {mapOpen ? 'Ocultar Partes' : `Partes de la Ficha (${partsCatalog.length})`}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setPreviewOpen((v) => !v)}
              className={`inline-flex min-h-[42px] items-center gap-1.5 rounded-xl border px-3.5 py-2 text-sm font-semibold whitespace-nowrap cursor-pointer ${
                previewOpen
                  ? 'border-blue-800 bg-blue-800 text-white'
                  : 'border-slate-300 bg-white text-slate-800 hover:bg-slate-50'
              }`}
            >
              <Eye className="h-4 w-4" />
              <span>{previewOpen ? 'Volver al Editor' : 'Vista Previa'}</span>
            </button>
            <button
              type="button"
              onClick={onEnterReadingMode}
              className="inline-flex min-h-[42px] items-center gap-1.5 rounded-xl border border-stone-300 bg-stone-50 px-3.5 py-2 text-sm font-semibold text-stone-900 hover:bg-stone-100 whitespace-nowrap cursor-pointer"
            >
              <BookOpen className="h-4 w-4 text-red-800" />
              <span>Lectura de Proyecto</span>
            </button>
            <button
              type="button"
              onClick={onGenerateFullProject}
              className="inline-flex min-h-[42px] items-center gap-1.5 rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 whitespace-nowrap cursor-pointer"
            >
              <Zap className="h-4 w-4" />
              <span>Generar Todo</span>
            </button>
          </div>
        </div>

        {/* Comparativa con la Rúbrica de Nivel IV FONDEP */}
        {rubricOpen && (
          <RubricNivel4Panel
            report={rubricReport}
            highlightWeakFields={highlightWeakFields}
            onToggleHighlight={() => setHighlightWeakFields((v) => !v)}
            onJumpToField={(secId, fieldKey) => {
              jumpToRubro(secId, fieldKey);
              setTimeout(() => {
                const ta = document.getElementById(`textarea_${fieldKey}`);
                if (ta) ta.focus();
              }, 120);
            }}
            onDeepenField={(item: RubricFieldComparison) => {
              const fieldSchema = schema.sections
                .flatMap((s) => s.fields)
                .find((f) => f.key === item.fieldKey);
              if (!fieldSchema) return;
              handleImproveRubro(item.fieldKey, fieldSchema.maxChars, fieldSchema);
            }}
            onDeepenAllWeak={handleDeepenAllWeakRubros}
            onClose={() => setRubricOpen(false)}
          />
        )}

        {/* Panel de Control Visual con Recharts (desplegable en Paso 2) */}
        {dashboardOpen && (
          <ProjectDashboardPanel
            project={project}
            onNavigateAlert={(targetView, sectionId, fieldKey) => {
              setDashboardOpen(false);
              if (targetView === 'step1') {
                onBackStep1();
                return;
              }
              setPreviewOpen(false);
              if (!viewAllParts) onChangeSectionTab(sectionId);
              setTimeout(() => {
                let domId = '';
                if (fieldKey === 'arbol') domId = 'part_arbol';
                else if (fieldKey === 'cuadroA') domId = 'part_cuadroA';
                else if (fieldKey === 'cuadroB') domId = 'part_cuadroB';
                else if (fieldKey === 'video') domId = 'part_anexos';
                else if (fieldKey && fieldKey.startsWith('inst:')) {
                  domId = `part_inst_${fieldKey.slice('inst:'.length)}`;
                } else if (fieldKey) {
                  domId = `box_${fieldKey}`;
                }
                const el = domId ? document.getElementById(domId) : null;
                if (el) el.scrollIntoView({behavior: 'smooth', block: 'center'});
              }, 80);
            }}
          />
        )}

        {/* Selector e Índice completo de TODAS las partes de la ficha según modalidad */}
        {mapOpen && (
          <div className="rounded-xl border border-slate-300 bg-slate-50 p-3.5 sm:p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="text-sm sm:text-base font-extrabold text-slate-900">
                  Todas las partes de {schema.code} ({modLabels.modLabel.split('(')[0].trim()})
                </div>
                <div className="text-xs text-slate-600">
                  Toca una parte para ir a editarla o márcalas para redactarlas en bloque.
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() =>
                    setSelectedMapPartIds(
                      partsCatalog.filter((p) => p.kind !== 'anexos').map((p) => p.id)
                    )
                  }
                  className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-800 hover:bg-slate-100 cursor-pointer"
                >
                  Todas
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setSelectedMapPartIds(
                      partsCatalog
                        .filter((p) => p.kind !== 'anexos' && !p.completed)
                        .map((p) => p.id)
                    )
                  }
                  className="rounded-lg border border-amber-300 bg-amber-50 px-2.5 py-1.5 text-xs font-bold text-amber-950 hover:bg-amber-100 cursor-pointer"
                >
                  Solo pendientes
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedMapPartIds([])}
                  className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100 cursor-pointer"
                >
                  Limpiar
                </button>
                {selectedMapPartIds.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      onGenerateSelectedParts(selectedMapPartIds);
                      setMapOpen(false);
                    }}
                    className="inline-flex items-center gap-1 rounded-lg bg-teal-700 px-3 py-1.5 text-xs font-bold text-white hover:bg-teal-800 cursor-pointer"
                  >
                    <Zap className="h-3.5 w-3.5" />
                    <span>Redactar ({selectedMapPartIds.length})</span>
                  </button>
                )}
              </div>
            </div>

            <div className="space-y-3">
              {schema.sections.map((sec) => {
                const secParts = partsCatalog.filter((p) => p.sectionId === sec.id);
                return (
                  <div
                    key={sec.id}
                    className="rounded-xl border border-slate-200 bg-white p-3 space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-1.5">
                      <span className="text-sm font-extrabold text-slate-900">{sec.tab}</span>
                      <button
                        type="button"
                        onClick={() => {
                          const secIds = secParts
                            .filter((it) => it.kind !== 'anexos')
                            .map((it) => it.id);
                          const allIn =
                            secIds.length > 0 &&
                            secIds.every((id) => selectedMapPartIds.includes(id));
                          setSelectedMapPartIds((prev) =>
                            allIn
                              ? prev.filter((id) => !secIds.includes(id))
                              : Array.from(new Set([...prev, ...secIds]))
                          );
                        }}
                        className="text-xs font-bold text-red-800 hover:underline cursor-pointer"
                      >
                        Marcar esta parte
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {secParts.map((item) => {
                        const pal = RUBRO_ACCENT_COLORS[item.colorIdx];
                        const isSelectable = item.kind !== 'anexos';
                        const checked = selectedMapPartIds.includes(item.id);
                        return (
                          <div
                            key={item.id}
                            className={`flex items-center gap-2 rounded-xl border-2 bg-white p-2.5 transition-colors ${pal.cardBorder}`}
                          >
                            {isSelectable && (
                              <input
                                type="checkbox"
                                aria-label={`Seleccionar ${item.code}`}
                                checked={checked}
                                onChange={() => toggleMapPartId(item.id)}
                                className="h-4 w-4 shrink-0 cursor-pointer"
                              />
                            )}
                            <button
                              type="button"
                              onClick={() => jumpToPart(item)}
                              className="flex min-w-0 flex-1 items-center justify-between gap-3 text-left cursor-pointer"
                            >
                              <div className="min-w-0 flex-1 space-y-1">
                                <div
                                  className={`text-xs font-extrabold font-mono-tabular ${pal.subText}`}
                                >
                                  {item.code}
                                </div>
                                <div className={`text-sm font-extrabold truncate ${pal.titleText}`}>
                                  {item.title}
                                </div>
                                <div
                                  className={`h-1.5 w-full overflow-hidden rounded-full ${pal.progressTrack}`}
                                >
                                  <div
                                    className={`h-full rounded-full ${
                                      item.completed ? 'bg-emerald-600' : pal.progressBar
                                    }`}
                                    style={{width: `${item.pct}%`}}
                                  />
                                </div>
                              </div>
                              <div className="text-right shrink-0">
                                <div
                                  className={`text-sm font-extrabold font-mono-tabular ${pal.titleText}`}
                                >
                                  {item.pct}%
                                </div>
                              </div>
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Pestañas de partes + selector Por parte / Toda la ficha */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {schema.sections.map((sec) => {
              const doneCount = sec.fields.filter(
                (f) => getRubroStatusInfo(project, f).state === 'complete'
              ).length;
              const totalCount = sec.fields.length;
              const active = !viewAllParts && sec.id === activeSection.id;

              return (
                <button
                  key={sec.id}
                  type="button"
                  onClick={() => {
                    setViewAllParts(false);
                    onChangeSectionTab(sec.id);
                  }}
                  className={`inline-flex min-h-[42px] items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-semibold whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                    active
                      ? 'bg-slate-900 text-white'
                      : 'border border-slate-300 bg-slate-50 text-slate-800 hover:bg-slate-100'
                  }`}
                >
                  <span>{sec.tab}</span>
                  {totalCount > 0 && (
                    <span
                      className={`font-mono-tabular text-xs font-bold ${
                        active
                          ? 'text-emerald-300'
                          : doneCount === totalCount
                          ? 'text-emerald-700'
                          : 'text-slate-600'
                      }`}
                    >
                      {doneCount}/{totalCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => setViewAllParts((v) => !v)}
            className={`inline-flex min-h-[40px] items-center justify-center rounded-xl border px-3 py-1.5 text-xs sm:text-sm font-bold whitespace-nowrap shrink-0 cursor-pointer ${
              viewAllParts
                ? 'border-red-800 bg-red-800 text-white'
                : 'border-slate-300 bg-white text-slate-800 hover:bg-slate-50'
            }`}
          >
            {viewAllParts ? 'Ver por pestaña' : `Ver toda la ficha (${schema.sections.length})`}
          </button>
        </div>
      </section>

      {/* Workspace de 2 columnas (Sidebar de Misiones en desktop + Editor / Vista Previa) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Sidebar lateral de Misiones (en desktop) */}
        <aside className="no-print hidden lg:block lg:col-span-4 xl:col-span-3 lg:sticky lg:top-20 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs space-y-3">
          <div>
            <div className="text-xs font-extrabold text-blue-800">RUTA POR MISIONES</div>
            <div className="text-base font-extrabold text-slate-900 mt-0.5">
              {schema.code} · Marco Lógico
            </div>
          </div>

          <div className="space-y-1.5">
            {schema.sections.map((sec, idx) => {
              const secParts = partsCatalog.filter((p) => p.sectionId === sec.id);
              const doneParts = secParts.filter((p) => p.completed).length;
              const pctSec =
                secParts.length > 0 ? Math.round((doneParts / secParts.length) * 100) : 0;
              const isCurrent = !previewOpen && !viewAllParts && sec.id === activeSection.id;
              return (
                <button
                  key={sec.id}
                  type="button"
                  onClick={() => {
                    setPreviewOpen(false);
                    setViewAllParts(false);
                    onChangeSectionTab(sec.id);
                    window.scrollTo({top: 0, behavior: 'smooth'});
                  }}
                  className={`w-full rounded-xl border p-2.5 text-left transition-colors cursor-pointer space-y-1.5 ${
                    isCurrent
                      ? 'border-blue-700 bg-blue-50'
                      : 'border-slate-200 bg-white hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`text-xs font-extrabold ${
                        isCurrent ? 'text-blue-900' : 'text-slate-700'
                      }`}
                    >
                      Misión {idx + 1}
                    </span>
                    <span className="font-mono-tabular text-xs font-bold text-slate-600">
                      {doneParts}/{secParts.length}
                    </span>
                  </div>
                  <div
                    className={`text-sm font-bold leading-snug ${
                      isCurrent ? 'text-blue-950' : 'text-slate-900'
                    }`}
                  >
                    {sec.tab.replace(/^\d+\.\s*/, '')}
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
                    <div
                      className={`h-full rounded-full ${
                        pctSec === 100 ? 'bg-emerald-600' : 'bg-blue-600'
                      }`}
                      style={{width: `${pctSec}%`}}
                    />
                  </div>
                </button>
              );
            })}
          </div>
        </aside>

        {/* Columna principal: Vista Previa en Tiempo Real O Misiones */}
        <div className="lg:col-span-8 xl:col-span-9 space-y-6">
          {previewOpen ? (
            <section className="rounded-2xl border border-blue-200 bg-white p-5 sm:p-7 shadow-xs space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
                <div>
                  <div className="text-xs font-extrabold text-blue-800">
                    VISTA PREVIA EN TIEMPO REAL · {schema.code}
                  </div>
                  <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-1">
                    {project.seed.titulo || 'Proyecto sin título definido'}
                  </h3>
                  <p className="text-sm text-slate-600 mt-1">
                    {project.ie.nombre || 'IE por definir'} · {modLabels.modLabel} ·{' '}
                    {modLabels.montoLabel}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setPreviewOpen(false)}
                  className="inline-flex min-h-[42px] items-center gap-1.5 rounded-xl bg-blue-700 px-4 py-2 text-sm font-bold text-white hover:bg-blue-800 cursor-pointer"
                >
                  <span>Seguir editando</span>
                </button>
              </div>

              <div className="rounded-xl border border-amber-300 bg-amber-50/60 p-4 space-y-1.5 text-sm sm:text-base">
                <div className="font-extrabold text-amber-950">Problema Central:</div>
                <p className="text-slate-900 leading-relaxed">
                  {project.seed.problema || 'Pendiente de registro.'}
                </p>
                {project.beneficiarios?.directos && (
                  <p className="text-slate-800 pt-1">
                    <strong>Beneficiarios directos:</strong> {project.beneficiarios.directos}
                  </p>
                )}
              </div>

              <div className="space-y-4">
                {schema.sections.map((sec) => (
                  <div key={sec.id} className="space-y-3">
                    <h4 className="text-base font-extrabold text-blue-900 border-b border-slate-200 pb-1">
                      {sec.tab}
                    </h4>
                    {sec.fields.map((f) => {
                      const info = orderMap[f.key] || {order: 1, colorIdx: 0};
                      const pal = RUBRO_ACCENT_COLORS[info.colorIdx];
                      const txt = (project.fields[f.key] || '').trim();
                      return (
                        <div key={f.key} className="space-y-1">
                          <div className={`text-sm font-extrabold ${pal.titleText}`}>
                            Rubro {info.order} ({f.code}): {f.label}
                          </div>
                          <p className="whitespace-pre-line text-sm sm:text-base text-slate-800 leading-relaxed">
                            {txt || 'Sin redacción todavía.'}
                          </p>
                        </div>
                      );
                    })}
                    {sec.hasTables && (
                      <div className="text-sm text-slate-800 rounded-xl bg-slate-50 border border-slate-200 p-3">
                        <strong>Cuadro A:</strong> {(project.cuadroA || []).length} actividad(es) ·{' '}
                        <strong>Cuadro B:</strong> S/ {totalBudget.toFixed(2)} / S/{' '}
                        {fin.maxMonto.toLocaleString('es-PE')}
                      </div>
                    )}
                    {sec.hasInstruments && (
                      <div className="text-sm text-slate-800 rounded-xl bg-slate-50 border border-slate-200 p-3">
                        <strong>Instrumentos completados:</strong> {readyInstrumentsCount} de{' '}
                        {reqInstruments.length}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          ) : (
            <div className="space-y-8">
              {visibleSections.map((sec) => {
                const missionGuide = getMissionGuidance(sec.id, project.category);
                return (
                  <div key={sec.id} className="space-y-6">
                    {/* Bloque 1: Guía Metodológica de la Misión */}
                    <div className="rounded-2xl border border-blue-200 bg-blue-50/70 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div className="space-y-1">
                        <div className="text-sm sm:text-base font-extrabold text-blue-950">
                          {viewAllParts ? `${sec.tab} · ` : ''}
                          {missionGuide.title}
                        </div>
                        <p className="text-sm text-slate-800 leading-relaxed">
                          {missionGuide.focus}{' '}
                          <span className="text-blue-900 font-medium">{missionGuide.tip}</span>
                        </p>
                      </div>
                      {sec.fields.length > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            const secPartIds = partsCatalog
                              .filter((p) => p.sectionId === sec.id && p.kind !== 'anexos')
                              .map((p) => p.id);
                            onGenerateSelectedParts(secPartIds);
                          }}
                          className="inline-flex min-h-[40px] shrink-0 items-center gap-1.5 rounded-xl bg-blue-700 px-3.5 py-2 text-sm font-bold text-white hover:bg-blue-800 cursor-pointer"
                        >
                          <Zap className="h-4 w-4" />
                          <span>Completar esta Misión</span>
                        </button>
                      )}
                    </div>

                    {/* Lista ordenada de Rubros de la sección */}
                    <div className="space-y-6">
                      {sec.fields.map((f) => {
          const info = orderMap[f.key] || {order: 1, colorIdx: 0};
          const pal = RUBRO_ACCENT_COLORS[info.colorIdx];
          const st = getRubroStatusInfo(project, f);
          const val = project.fields[f.key] || '';
          const chars = val.length;
          const words = countWords(val);
          const pct = Math.min(100, Math.round((words / st.metaPalabras) * 100));
          const logic = getContextualRubroSuggestions(f.key, project);
          const allSuggestions = [...logic.contextualSuggestions, ...logic.suggestions];

          const barColor =
            st.state === 'over'
              ? 'bg-red-600'
              : st.state === 'complete'
              ? 'bg-emerald-600'
              : pal.progressBar;

          const avanceLabel =
            st.state === 'over'
              ? `Excede límite (${words}/${st.maxWordsBases} pal.)`
              : st.state === 'complete'
              ? `100% · Completo`
              : words === 0
              ? `0% · Sin iniciar`
              : `${pct}% · En proceso`;

          const sugOpen = Boolean(openSuggestions[f.key]);
          const guideOpen = Boolean(openGuide[f.key]);
          const hasUndo = f.key in undoBuffer;
          const isDictatingHere = dictationTargetId === `rubro:${f.key}`;
          const rubricEval = rubricReport.byFieldKey[f.key];
          const isHighlightedWeak = Boolean(
            rubricEval &&
              rubricEval.needsDepth &&
              ((highlightWeakFields && rubricOpen) || (highlightWeakFields && words > 0))
          );

          return (
            <React.Fragment key={f.key}>
              <article
                id={`box_${f.key}`}
                className={`overflow-hidden rounded-2xl border-2 bg-white shadow-sm transition-shadow ${
                  isHighlightedWeak
                    ? rubricEval.level === 'Nivel I' || rubricEval.isOverLimit
                      ? 'border-red-400 ring-2 ring-red-200'
                      : 'border-amber-400 ring-2 ring-amber-200'
                    : pal.cardBorder
                }`}
              >
                {/* Franja superior distintiva del rubro */}
                <div className={`h-2 w-full ${pal.topStripe}`} aria-hidden="true" />

                <div className="p-4 sm:p-6 space-y-4">
                  {/* Cabecera limpia con letras de color propio + indicador de avance + Rúbrica Nivel IV */}
                  <div className="space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                          <span className={`text-sm font-extrabold font-mono-tabular ${pal.subText}`}>
                            Rubro {info.order} · Numeral {f.code}
                          </span>
                          {rubricEval && (
                            <>
                              <span className="text-slate-300" aria-hidden="true">
                                ·
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  setRubricOpen(true);
                                  setHighlightWeakFields(true);
                                }}
                                className={`text-xs font-extrabold font-mono-tabular hover:underline cursor-pointer ${
                                  rubricEval.level === 'Nivel IV'
                                    ? 'text-emerald-700'
                                    : rubricEval.level === 'Nivel III'
                                    ? 'text-amber-800'
                                    : 'text-red-700'
                                }`}
                              >
                                Rúbrica: {rubricEval.level} ({rubricEval.score}/100)
                              </button>
                            </>
                          )}
                        </div>
                        <h3
                          className={`text-lg sm:text-xl font-extrabold leading-snug ${pal.titleText}`}
                        >
                          {f.label}
                        </h3>
                      </div>

                      <div className="sm:text-right shrink-0">
                        <div
                          className={`text-base sm:text-lg font-extrabold font-mono-tabular ${
                            st.state === 'complete'
                              ? 'text-emerald-700'
                              : st.state === 'over'
                              ? 'text-red-700'
                              : pal.titleText
                          }`}
                        >
                          {avanceLabel}
                        </div>
                        <div className={`text-sm font-bold font-mono-tabular ${pal.subText}`}>
                          {words} / {st.metaPalabras} palabras
                        </div>
                      </div>
                    </div>

                    {/* Indicador visual de avance del rubro */}
                    <div
                      role="progressbar"
                      aria-label={`Avance de ${f.code}`}
                      aria-valuenow={pct}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      className={`h-2.5 w-full overflow-hidden rounded-full ${pal.progressTrack}`}
                    >
                      <div
                        className={`h-full rounded-full transition-all duration-200 ${barColor}`}
                        style={{width: `${pct}%`}}
                      />
                    </div>

                    {/* Alerta de profundidad argumentativa frente a Rúbrica Nivel IV */}
                    {isHighlightedWeak && rubricEval && (
                      <div
                        className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 rounded-xl border px-3.5 py-2.5 text-xs sm:text-sm ${
                          rubricEval.level === 'Nivel I' || rubricEval.isOverLimit
                            ? 'border-red-300 bg-red-50/90 text-red-950'
                            : 'border-amber-300 bg-amber-50/90 text-amber-950'
                        }`}
                      >
                        <div className="flex items-start gap-2 min-w-0">
                          <AlertTriangle
                            className={`h-4 w-4 shrink-0 mt-0.5 ${
                              rubricEval.level === 'Nivel I' || rubricEval.isOverLimit
                                ? 'text-red-700'
                                : 'text-amber-700'
                            }`}
                            aria-hidden="true"
                          />
                          <div className="min-w-0">
                            <span className="font-extrabold">
                              Requiere mayor profundidad argumentativa ({rubricEval.level} ·{' '}
                              {rubricEval.score}/100):{' '}
                            </span>
                            <span>{rubricEval.actionHint}</span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleImproveRubro(f.key, f.maxChars, f)}
                          className="inline-flex min-h-[34px] shrink-0 items-center gap-1 rounded-lg bg-amber-800 px-3 py-1 text-xs font-bold text-white hover:bg-amber-900 cursor-pointer"
                        >
                          <Rocket className="h-3.5 w-3.5" />
                          <span>Profundizar a Nivel IV</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Barra de herramientas ordenada (sin botones duplicados) */}
                  <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => handleToggleRubroDictation(f.key)}
                      aria-pressed={isDictatingHere}
                      className={`inline-flex min-h-[42px] items-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-bold transition-colors cursor-pointer ${
                        isDictatingHere
                          ? 'bg-red-700 text-white hover:bg-red-800'
                          : 'border border-slate-300 bg-white text-slate-900 hover:bg-slate-50'
                      }`}
                    >
                      {isDictatingHere ? (
                        <>
                          <Square className="h-4 w-4 fill-current" />
                          <span>Detener dictado</span>
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
                      onClick={() =>
                        setOpenSuggestions((p) => ({...p, [f.key]: !p[f.key]}))
                      }
                      aria-expanded={sugOpen}
                      className={`inline-flex min-h-[42px] items-center gap-1.5 rounded-lg border px-3.5 py-2 text-sm font-bold cursor-pointer ${
                        sugOpen
                          ? 'border-indigo-700 bg-indigo-700 text-white hover:bg-indigo-800'
                          : 'border-indigo-300 bg-indigo-50 text-indigo-950 hover:bg-indigo-100'
                      }`}
                    >
                      <Lightbulb className="h-4 w-4" />
                      <span>Sugerencias ({allSuggestions.length})</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleGenerateSingleField(f.key, f.maxChars)}
                      className="inline-flex min-h-[42px] items-center gap-1.5 rounded-lg bg-teal-700 px-3.5 py-2 text-sm font-semibold text-white hover:bg-teal-800 cursor-pointer"
                    >
                      <Sparkles className="h-4 w-4" />
                      <span>Generar</span>
                    </button>

                    {words >= 20 && (
                      <button
                        type="button"
                        onClick={() => handleImproveRubro(f.key, f.maxChars, f)}
                        className="inline-flex min-h-[42px] items-center gap-1.5 rounded-lg bg-red-800 px-3.5 py-2 text-sm font-semibold text-white hover:bg-red-900 cursor-pointer"
                      >
                        <Rocket className="h-4 w-4" />
                        <span>Mejorar</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => handleQuickAuditRubro(f)}
                      title="Analiza el fragmento seleccionado o el párrafo donde está el cursor según coherencia pedagógica y límites FONDEP"
                      aria-expanded={Boolean(quickAudits[f.key])}
                      className={`inline-flex min-h-[42px] items-center gap-1.5 rounded-lg border px-3.5 py-2 text-sm font-bold transition-colors cursor-pointer ${
                        quickAudits[f.key]
                          ? 'border-amber-700 bg-amber-700 text-white hover:bg-amber-800'
                          : 'border-amber-400 bg-amber-50 text-amber-950 hover:bg-amber-100'
                      }`}
                    >
                      <ClipboardCheck className="h-4 w-4" />
                      <span>Auditoría rápida</span>
                    </button>

                    {hasUndo && (
                      <button
                        type="button"
                        onClick={() => handleUndo(f.key)}
                        className="inline-flex min-h-[42px] items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50 cursor-pointer"
                      >
                        <Undo2 className="h-4 w-4" />
                        <span>Deshacer</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => setOpenGuide((p) => ({...p, [f.key]: !p[f.key]}))}
                      aria-expanded={guideOpen}
                      className={`inline-flex min-h-[42px] items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-semibold cursor-pointer ${
                        guideOpen
                          ? 'border-slate-700 bg-slate-800 text-white'
                          : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <SlidersHorizontal className="h-4 w-4" />
                      <span>{guideOpen ? 'Ocultar guía' : 'Guía y ajuste'}</span>
                    </button>
                  </div>

                  {/* Panel de Sugerencias (solo visible al activarlo) */}
                  {sugOpen && (
                    <div className="rounded-xl border-2 border-indigo-400 bg-indigo-50/80 p-4 space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-sm sm:text-base font-extrabold text-indigo-950">
                          Sugerencias para {f.code}
                        </span>
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleInsertAllSuggestions(f.key, allSuggestions)}
                            className="min-h-[38px] rounded-lg bg-indigo-700 px-3 py-1.5 text-sm font-bold text-white hover:bg-indigo-800 cursor-pointer"
                          >
                            + Insertar todas
                          </button>
                          <button
                            type="button"
                            onClick={() => setOpenSuggestions((p) => ({...p, [f.key]: false}))}
                            className="min-h-[38px] rounded-lg border border-indigo-300 bg-white px-3 py-1.5 text-sm font-bold text-indigo-950 hover:bg-indigo-100 cursor-pointer"
                          >
                            Cerrar
                          </button>
                        </div>
                      </div>

                      <div className="space-y-2">
                        {allSuggestions.map((sug, sIdx) => {
                          const isContextual = sIdx < logic.contextualSuggestions.length;
                          return (
                            <div
                              key={sIdx}
                              className="flex flex-col sm:flex-row sm:items-start justify-between gap-2.5 rounded-xl border border-indigo-200 bg-white p-3 text-sm sm:text-[15px] leading-relaxed text-slate-900"
                            >
                              <div className="space-y-1">
                                <span
                                  className={`text-xs font-extrabold ${
                                    isContextual ? 'text-amber-800' : 'text-indigo-800'
                                  }`}
                                >
                                  {isContextual
                                    ? 'Según tu Problema Central y Modalidad'
                                    : 'Recomendación Nivel IV'}
                                </span>
                                <div>{sug}</div>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleInsertSuggestion(f.key, sug)}
                                className="min-h-[38px] shrink-0 rounded-lg bg-indigo-700 px-3 py-1.5 text-sm font-bold text-white hover:bg-indigo-800 cursor-pointer"
                              >
                                + Insertar
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Panel opcional Guía y Ajuste (oculto por defecto para mantener el orden) */}
                  {guideOpen && (
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3 text-sm text-slate-800">
                      <div className="space-y-1 leading-relaxed">
                        <div>
                          <strong className="text-slate-900">Enfoque:</strong> {logic.focus}
                        </div>
                        <div>
                          <strong className="text-slate-900">Secuencia:</strong> {logic.sequence}
                        </div>
                        <div>
                          <strong className="text-slate-900">Rúbrica Nivel IV:</strong>{' '}
                          {logic.rubricCriteria}
                        </div>
                        {f.evidence && (
                          <div className="text-teal-900 font-medium">
                            <strong>Evidencia:</strong> {f.evidence}
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-slate-200">
                        <input
                          type="text"
                          value={microInputs[f.key] || ''}
                          onChange={(e) =>
                            setMicroInputs((prev) => ({...prev, [f.key]: e.target.value}))
                          }
                          placeholder="Agrega un dato propio de tu aula para integrarlo..."
                          className="flex-1 min-h-[42px] rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 focus:border-slate-700 focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => handleIntegrateMicroIdea(f.key)}
                          className="inline-flex min-h-[42px] items-center justify-center gap-1 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-100 whitespace-nowrap cursor-pointer"
                        >
                          <Plus className="h-4 w-4" />
                          <span>Integrar idea</span>
                        </button>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200">
                        <span className="text-xs font-mono-tabular text-slate-600">
                          Tope Bases: {st.maxWordsBases} pal. / {f.maxChars.toLocaleString('es-PE')}{' '}
                          car. · Actual: {chars.toLocaleString('es-PE')} car.
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleCalibrateMinus100(f.key, f.maxChars, f)}
                            className="min-h-[36px] rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-bold text-slate-800 hover:bg-slate-100 cursor-pointer"
                          >
                            Ajustar a {st.metaPalabras} pal.
                          </button>
                          <button
                            type="button"
                            onClick={() => handleAdjustWordsPct(f.key, f.maxChars, -0.15)}
                            className="min-h-[36px] rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-bold text-slate-800 hover:bg-slate-100 cursor-pointer"
                          >
                            -15%
                          </button>
                          <button
                            type="button"
                            onClick={() => handleAdjustWordsPct(f.key, f.maxChars, 0.15)}
                            className="min-h-[36px] rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-bold text-slate-800 hover:bg-slate-100 cursor-pointer"
                          >
                            +15%
                          </button>
                          <button
                            type="button"
                            onClick={() => onCopyText(val, 'Texto del rubro copiado.')}
                            className="inline-flex min-h-[36px] items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-bold text-slate-800 hover:bg-slate-100 cursor-pointer"
                          >
                            <ClipboardCopy className="h-3.5 w-3.5" />
                            <span>Copiar</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Banner de dictado activo (solo visible al dictar) */}
                  {isDictatingHere && (
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-xl border-2 border-red-400 bg-red-50 p-3.5 text-sm sm:text-base text-red-950">
                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-red-900">
                          Escuchando dictado en español...
                        </div>
                        {dictationInterimText && (
                          <div className="mt-1 italic text-red-900">
                            &ldquo;{dictationInterimText}&rdquo;
                          </div>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={stopDictation}
                        className="min-h-[38px] shrink-0 rounded-lg bg-red-700 px-3 py-1.5 text-sm font-bold text-white hover:bg-red-800 cursor-pointer"
                      >
                        Detener
                      </button>
                    </div>
                  )}

                  {/* Editor del rubro con letras diferenciadas por color */}
                  <textarea
                    id={`textarea_${f.key}`}
                    aria-label={`Contenido de ${f.label}`}
                    rows={7}
                    value={val}
                    onSelect={(e) => captureTextareaSelection(f.key, e.currentTarget)}
                    onKeyUp={(e) => captureTextareaSelection(f.key, e.currentTarget)}
                    onClick={(e) => captureTextareaSelection(f.key, e.currentTarget)}
                    onChange={(e) =>
                      onUpdateProject((prev) => ({
                        ...prev,
                        fields: {...prev.fields, [f.key]: e.target.value},
                      }))
                    }
                    placeholder={`Redacta aquí el numeral ${f.code}, selecciona un párrafo para "Auditoría rápida", o pulsa "Dictar", "Sugerencias" o "Generar"...`}
                    className={`w-full rounded-xl border-2 ${pal.cardBorder} bg-white px-4 py-3.5 text-base sm:text-[17px] font-medium leading-relaxed ${pal.editorText} ${pal.focusBorder} focus:outline-none`}
                  />

                  {/* Panel de Auditoría Rápida (Coherencia Pedagógica y Normativa FONDEP) */}
                  {quickAudits[f.key] && (() => {
                    const audit = quickAudits[f.key]!;
                    const verdictTheme =
                      audit.verdict === 'optimo'
                        ? {
                            border: 'border-emerald-400',
                            bg: 'bg-emerald-50/70',
                            badge: 'bg-emerald-700 text-white',
                            label: 'Óptimo FONDEP',
                          }
                        : audit.verdict === 'critico'
                        ? {
                            border: 'border-red-400',
                            bg: 'bg-red-50/70',
                            badge: 'bg-red-700 text-white',
                            label: 'Crítico / Excede o Incompleto',
                          }
                        : {
                            border: 'border-amber-400',
                            bg: 'bg-amber-50/80',
                            badge: 'bg-amber-700 text-white',
                            label: 'Requiere ajustes',
                          };

                    return (
                      <div
                        className={`rounded-xl border-2 ${verdictTheme.border} ${verdictTheme.bg} p-4 space-y-3`}
                      >
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="inline-flex items-center gap-1.5 text-sm sm:text-base font-extrabold text-slate-900">
                                <ClipboardCheck className="h-4 w-4 text-amber-700" />
                                Auditoría rápida · {f.code}
                              </span>
                              <span
                                className={`rounded-md px-2.5 py-0.5 text-xs font-extrabold ${verdictTheme.badge}`}
                              >
                                {audit.score}/100 · {verdictTheme.label}
                              </span>
                              <span className="rounded-md border border-slate-300 bg-white px-2 py-0.5 text-xs font-bold text-slate-700">
                                {audit.scopeLabel}
                              </span>
                            </div>
                            <p className="text-xs sm:text-sm italic text-slate-700">
                              &ldquo;{audit.analyzedExcerpt}&rdquo;
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={() => setQuickAudits((p) => ({...p, [f.key]: null}))}
                            aria-label="Cerrar auditoría rápida"
                            className="inline-flex min-h-[34px] items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-bold text-slate-700 hover:bg-slate-100 cursor-pointer"
                          >
                            <X className="h-3.5 w-3.5" />
                            <span>Cerrar</span>
                          </button>
                        </div>

                        {/* Cumplimiento normativo de palabras FONDEP */}
                        <div className="rounded-lg border border-slate-200 bg-white p-3 text-xs sm:text-sm space-y-1">
                          <div className="flex flex-wrap items-center justify-between gap-2 font-bold text-slate-900">
                            <span>Normativa de extensión FONDEP (CNPIE 2027)</span>
                            <span className="font-mono-tabular">
                              {audit.normativa.totalWords} / {audit.normativa.maxWordsBases} pal. máx.
                              · Meta {audit.normativa.metaPalabras} pal. ·{' '}
                              {audit.normativa.totalChars.toLocaleString('es-PE')}/
                              {audit.normativa.maxChars.toLocaleString('es-PE')} car.
                            </span>
                          </div>
                          <p
                            className={`text-xs sm:text-sm font-medium ${
                              audit.normativa.status === 'over'
                                ? 'text-red-700'
                                : audit.normativa.status === 'short'
                                ? 'text-amber-800'
                                : 'text-emerald-800'
                            }`}
                          >
                            {audit.normativa.summary}
                          </p>
                        </div>

                        {/* Matriz de 4 criterios pedagógicos */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                          {audit.checks.map((chk) => (
                            <div
                              key={chk.id}
                              className={`rounded-lg border p-3 text-xs sm:text-sm bg-white ${
                                chk.passed ? 'border-emerald-200' : 'border-amber-300'
                              }`}
                            >
                              <div className="flex items-center gap-1.5 font-extrabold text-slate-900">
                                {chk.passed ? (
                                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-700" />
                                ) : (
                                  <AlertTriangle className="h-4 w-4 shrink-0 text-amber-700" />
                                )}
                                <span>{chk.label}</span>
                              </div>
                              <p className="mt-1 text-slate-700 leading-relaxed">{chk.detail}</p>
                            </div>
                          ))}
                        </div>

                        {/* Recomendaciones directas y acciones rápidas */}
                        <div className="rounded-lg border border-slate-200 bg-white p-3 space-y-2">
                          <div className="text-xs font-extrabold uppercase tracking-wide text-slate-600">
                            Recomendaciones accionables
                          </div>
                          <ul className="list-disc pl-5 space-y-1 text-xs sm:text-sm text-slate-800">
                            {audit.recommendations.map((rec, rIdx) => (
                              <li key={rIdx}>{rec}</li>
                            ))}
                          </ul>

                          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
                            <button
                              type="button"
                              onClick={() => handleQuickAuditRubro(f)}
                              className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-amber-400 bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-950 hover:bg-amber-100 cursor-pointer"
                            >
                              <ClipboardCheck className="h-3.5 w-3.5" />
                              <span>Re-auditar selección / párrafo</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleCalibrateMinus100(f.key, f.maxChars, f)}
                              className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-800 hover:bg-slate-100 cursor-pointer"
                            >
                              <SlidersHorizontal className="h-3.5 w-3.5" />
                              <span>Ajustar a {audit.normativa.metaPalabras} pal.</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleImproveRubro(f.key, f.maxChars, f)}
                              className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg bg-red-800 px-3 py-1.5 text-xs font-bold text-white hover:bg-red-900 cursor-pointer"
                            >
                              <Rocket className="h-3.5 w-3.5" />
                              <span>Mejorar coherencia</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </article>

              {/* Árbol de Problemas y Árbol de Objetivos (Marco Lógico) en 1.1.1 */}
              {f.key === 'p1_1_1' && (
                <section
                  id="part_arbol"
                  className="overflow-hidden rounded-2xl border-2 border-emerald-300 bg-white shadow-sm"
                >
                  <div
                    className={`h-2 w-full ${
                      arbolMode === 'objetivos' ? 'bg-blue-700' : 'bg-emerald-700'
                    }`}
                    aria-hidden="true"
                  />
                  <div className="p-4 sm:p-6 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div>
                        <div className="text-sm font-extrabold font-mono-tabular text-emerald-700">
                          Marco Lógico · Numeral 1.1.1
                        </div>
                        <h3 className="text-lg sm:text-xl font-extrabold text-slate-900">
                          {arbolMode === 'problemas'
                            ? 'Árbol de Problemas (Diagnóstico Causal)'
                            : 'Árbol de Objetivos (Transformación en Positivo)'}
                        </h3>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <div className="inline-flex rounded-xl bg-slate-100 p-1">
                          <button
                            type="button"
                            onClick={() => setArbolMode('problemas')}
                            className={`rounded-lg px-3 py-1.5 text-xs sm:text-sm font-bold transition-colors cursor-pointer ${
                              arbolMode === 'problemas'
                                ? 'bg-emerald-700 text-white'
                                : 'text-slate-700 hover:text-slate-900'
                            }`}
                          >
                            Árbol de Problemas
                          </button>
                          <button
                            type="button"
                            onClick={() => setArbolMode('objetivos')}
                            className={`inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs sm:text-sm font-bold transition-colors cursor-pointer ${
                              arbolMode === 'objetivos'
                                ? 'bg-blue-700 text-white'
                                : 'text-slate-700 hover:text-slate-900'
                            }`}
                          >
                            <GitBranch className="h-3.5 w-3.5" />
                            <span>Árbol de Objetivos</span>
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            const ctx = buildProjectContext(project);
                            const nextProb = generateArbolProblemasData(ctx);
                            onUpdateProject((p) => ({
                              ...p,
                              arbolProblemas: nextProb,
                              arbolObjetivos: generateArbolObjetivosData(nextProb, ctx),
                            }));
                            onNotify('Árbol de Problemas y Árbol de Objetivos actualizados.');
                          }}
                          className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg bg-teal-700 px-3.5 py-2 text-sm font-semibold text-white hover:bg-teal-800 cursor-pointer"
                        >
                          <Sparkles className="h-4 w-4" />
                          <span>
                            {arbolMode === 'objetivos'
                              ? 'Transformar a Objetivos'
                              : 'Generar Árboles'}
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            exportArbolWord(project);
                            onNotify('Árbol de Problemas descargado en Word (.doc).');
                          }}
                          className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50 cursor-pointer"
                        >
                          <FileDown className="h-4 w-4" />
                          <span>Word (.doc)</span>
                        </button>
                      </div>
                    </div>

                    {arbolMode === 'problemas' ? (
                      <>
                        {/* Copa: Efectos */}
                        <div className="rounded-xl border border-emerald-300 bg-emerald-50/70 p-4 space-y-3">
                          <div className="text-sm sm:text-base font-bold text-emerald-900">
                            Efectos (Consecuencias)
                          </div>
                          <div>
                            <label className="block text-sm font-bold text-emerald-900 mb-1">
                              Efecto Final
                            </label>
                            <textarea
                              rows={2}
                              value={arbol.efectoFinal}
                              onChange={(e) =>
                                updateArbol((a) => ({...a, efectoFinal: e.target.value}))
                              }
                              className={inputSmall}
                            />
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            {arbol.efectosDirectos.map((ef, idx) => (
                              <div key={idx}>
                                <label className="block text-sm font-bold text-emerald-900 mb-1">
                                  Efecto Directo {idx + 1}
                                </label>
                                <textarea
                                  rows={2}
                                  value={ef}
                                  onChange={(e) =>
                                    updateArbol((a) => {
                                      const next = [
                                        ...a.efectosDirectos,
                                      ] as [string, string, string];
                                      next[idx] = e.target.value;
                                      return {...a, efectosDirectos: next};
                                    })
                                  }
                                  className={inputSmall}
                                />
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Tronco: Problema Central */}
                        <div className="rounded-xl border border-amber-300 bg-amber-50/70 p-4">
                          <label className="block text-sm sm:text-base font-bold text-amber-900 mb-1">
                            Tronco: Problema Central
                          </label>
                          <textarea
                            rows={2}
                            value={arbol.problemaCentral}
                            onChange={(e) =>
                              updateArbol((a) => ({...a, problemaCentral: e.target.value}))
                            }
                            className={`${inputSmall} font-semibold`}
                          />
                        </div>

                        {/* Raíces: Causas */}
                        <div className="rounded-xl border border-red-200 bg-red-50/60 p-4 space-y-3">
                          <div className="text-sm sm:text-base font-bold text-red-900">
                            Raíces: Causas Directas e Indirectas
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            {arbol.causasDirectas.map((cd, idx) => (
                              <div
                                key={idx}
                                className="rounded-lg border border-red-200 bg-white p-3 space-y-2.5"
                              >
                                <div>
                                  <label className="block text-sm font-bold text-red-900 mb-1">
                                    Causa Directa {idx + 1}
                                  </label>
                                  <textarea
                                    rows={2}
                                    value={cd}
                                    onChange={(e) =>
                                      updateArbol((a) => {
                                        const next = [
                                          ...a.causasDirectas,
                                        ] as [string, string, string];
                                        next[idx] = e.target.value;
                                        return {...a, causasDirectas: next};
                                      })
                                    }
                                    className={inputSmall}
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-bold text-red-800 mb-1">
                                    Causa Indirecta {idx + 1}.1
                                  </label>
                                  <textarea
                                    rows={2}
                                    value={arbol.causasIndirectas[idx] || ''}
                                    onChange={(e) =>
                                      updateArbol((a) => {
                                        const next = [
                                          ...a.causasIndirectas,
                                        ] as [string, string, string];
                                        next[idx] = e.target.value;
                                        return {...a, causasIndirectas: next};
                                      })
                                    }
                                    className={inputSmall}
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        {/* Copa Positiva: Fines y Resultados Esperados */}
                        <div className="rounded-xl border border-blue-300 bg-blue-50/70 p-4 space-y-3">
                          <div className="text-sm sm:text-base font-bold text-blue-900">
                            Fines y Resultados Esperados (Efectos transformados)
                          </div>
                          <div>
                            <label className="block text-sm font-bold text-blue-900 mb-1">
                              Fin Principal
                            </label>
                            <textarea
                              rows={2}
                              value={arbolObjetivos.finPrincipal}
                              onChange={(e) =>
                                updateArbolObjetivos((a) => ({...a, finPrincipal: e.target.value}))
                              }
                              className={inputSmall}
                            />
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            {arbolObjetivos.finesDirectos.map((fn, idx) => (
                              <div key={idx}>
                                <label className="block text-sm font-bold text-blue-900 mb-1">
                                  Resultado Esperado {idx + 1}
                                </label>
                                <textarea
                                  rows={2}
                                  value={fn}
                                  onChange={(e) =>
                                    updateArbolObjetivos((a) => {
                                      const next = [
                                        ...a.finesDirectos,
                                      ] as [string, string, string];
                                      next[idx] = e.target.value;
                                      return {...a, finesDirectos: next};
                                    })
                                  }
                                  className={inputSmall}
                                />
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Tronco Positivo: Objetivo General */}
                        <div className="rounded-xl border border-teal-300 bg-teal-50/70 p-4">
                          <label className="block text-sm sm:text-base font-bold text-teal-900 mb-1">
                            Tronco: Objetivo General (Propósito en positivo)
                          </label>
                          <textarea
                            rows={2}
                            value={arbolObjetivos.objetivoGeneral}
                            onChange={(e) =>
                              updateArbolObjetivos((a) => ({
                                ...a,
                                objetivoGeneral: e.target.value,
                              }))
                            }
                            className={`${inputSmall} font-semibold`}
                          />
                        </div>

                        {/* Raíces Positivas: Objetivos Específicos y Medios */}
                        <div className="rounded-xl border border-indigo-200 bg-indigo-50/60 p-4 space-y-3">
                          <div className="text-sm sm:text-base font-bold text-indigo-900">
                            Medios: Objetivos Específicos y Acciones (Causas transformadas)
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            {arbolObjetivos.objetivosEspecificos.map((oe, idx) => (
                              <div
                                key={idx}
                                className="rounded-lg border border-indigo-200 bg-white p-3 space-y-2.5"
                              >
                                <div>
                                  <label className="block text-sm font-bold text-indigo-900 mb-1">
                                    Objetivo Específico {idx + 1}
                                  </label>
                                  <textarea
                                    rows={2}
                                    value={oe}
                                    onChange={(e) =>
                                      updateArbolObjetivos((a) => {
                                        const next = [
                                          ...a.objetivosEspecificos,
                                        ] as [string, string, string];
                                        next[idx] = e.target.value;
                                        return {...a, objetivosEspecificos: next};
                                      })
                                    }
                                    className={inputSmall}
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-bold text-indigo-800 mb-1">
                                    Medio de Acción {idx + 1}.1
                                  </label>
                                  <textarea
                                    rows={2}
                                    value={arbolObjetivos.mediosAccion[idx] || ''}
                                    onChange={(e) =>
                                      updateArbolObjetivos((a) => {
                                        const next = [
                                          ...a.mediosAccion,
                                        ] as [string, string, string];
                                        next[idx] = e.target.value;
                                        return {...a, mediosAccion: next};
                                      })
                                    }
                                    className={inputSmall}
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </section>
              )}
            </React.Fragment>
          );
              })}
            </div>

            {/* Tablas Cuadro A y Cuadro B */}
            {sec.hasTables && (
              <div className="space-y-6">
                {/* Cuadro A */}
                <section
                  id="part_cuadroA"
                  className="overflow-hidden rounded-2xl border-2 border-blue-300 bg-white shadow-sm"
                >
            <div className="h-2 w-full bg-blue-700" aria-hidden="true" />
            <div className="p-4 sm:p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
                <div>
                  <h3 className="text-lg font-extrabold text-blue-800">
                    Cuadro A: Plan de Actividades 2027
                  </h3>
                  <p className="text-sm font-mono-tabular text-blue-700 mt-0.5">
                    {(project.cuadroA || []).length} actividad(es) registrada(s)
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      onUpdateProject((p) => ({
                        ...p,
                        cuadroA: generateCuadroAData(buildProjectContext(p)),
                      }));
                      onNotify('Cuadro A regenerado.');
                    }}
                    className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg bg-teal-700 px-3.5 py-2 text-sm font-semibold text-white hover:bg-teal-800 cursor-pointer"
                  >
                    <Sparkles className="h-4 w-4" />
                    <span>Generar Cuadro A</span>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      onUpdateProject((p) => ({
                        ...p,
                        cuadroA: [
                          ...p.cuadroA,
                          {
                            fase: 'OE · Fase',
                            actividad: '',
                            evidencia: '',
                            responsable: 'Equipo responsable',
                            plazo: '2027',
                          },
                        ],
                      }))
                    }
                    className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50 cursor-pointer"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Fila</span>
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full min-w-[740px] text-sm">
                  <thead className="bg-slate-900 text-white">
                    <tr>
                      <th className="p-2.5 text-left w-[18%]">Objetivo / Fase</th>
                      <th className="p-2.5 text-left w-[28%]">Actividad Principal 2027</th>
                      <th className="p-2.5 text-left w-[22%]">Metas / Evidencias</th>
                      <th className="p-2.5 text-left w-[16%]">Responsable</th>
                      <th className="p-2.5 text-left w-[11%]">Plazo</th>
                      <th className="p-2.5 w-[5%]"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {(project.cuadroA || []).map((row, idx) => (
                      <tr key={idx}>
                        <td className="p-2">
                          <input
                            type="text"
                            value={row.fase}
                            onChange={(e) =>
                              onUpdateProject((p) => {
                                const next = [...p.cuadroA];
                                next[idx] = {...next[idx], fase: e.target.value};
                                return {...p, cuadroA: next};
                              })
                            }
                            className={inputSmall}
                          />
                        </td>
                        <td className="p-2">
                          <textarea
                            rows={2}
                            value={row.actividad}
                            onChange={(e) =>
                              onUpdateProject((p) => {
                                const next = [...p.cuadroA];
                                next[idx] = {...next[idx], actividad: e.target.value};
                                return {...p, cuadroA: next};
                              })
                            }
                            className={inputSmall}
                          />
                        </td>
                        <td className="p-2">
                          <textarea
                            rows={2}
                            value={row.evidencia}
                            onChange={(e) =>
                              onUpdateProject((p) => {
                                const next = [...p.cuadroA];
                                next[idx] = {...next[idx], evidencia: e.target.value};
                                return {...p, cuadroA: next};
                              })
                            }
                            className={inputSmall}
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="text"
                            value={row.responsable}
                            onChange={(e) =>
                              onUpdateProject((p) => {
                                const next = [...p.cuadroA];
                                next[idx] = {...next[idx], responsable: e.target.value};
                                return {...p, cuadroA: next};
                              })
                            }
                            className={inputSmall}
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="text"
                            value={row.plazo}
                            onChange={(e) =>
                              onUpdateProject((p) => {
                                const next = [...p.cuadroA];
                                next[idx] = {...next[idx], plazo: e.target.value};
                                return {...p, cuadroA: next};
                              })
                            }
                            className={inputSmall}
                          />
                        </td>
                        <td className="p-2 text-center">
                          <button
                            type="button"
                            onClick={() =>
                              onUpdateProject((p) => ({
                                ...p,
                                cuadroA: p.cuadroA.filter((_, i) => i !== idx),
                              }))
                            }
                            aria-label="Quitar fila"
                            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-red-200 text-red-700 hover:bg-red-50 cursor-pointer"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          {/* Cuadro B */}
          <section
            id="part_cuadroB"
            className="overflow-hidden rounded-2xl border-2 border-amber-300 bg-white shadow-sm"
          >
            <div className="h-2 w-full bg-amber-700" aria-hidden="true" />
            <div className="p-4 sm:p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
                <div>
                  <h3 className="text-lg font-extrabold text-amber-800">
                    Cuadro B: Presupuesto Anexo N° 5
                  </h3>
                  <p className="text-sm text-amber-800 font-mono-tabular mt-0.5">
                    Tope: S/ {fin.maxMonto.toLocaleString('es-PE')} · {fin.bienesPct}% Bienes /{' '}
                    {fin.serviciosPct}% Servicios
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      onUpdateProject((p) => ({
                        ...p,
                        cuadroB: generateCuadroBData(buildProjectContext(p)),
                      }));
                      onNotify('Presupuesto recalibrado al tope oficial.');
                    }}
                    className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg bg-teal-700 px-3.5 py-2 text-sm font-semibold text-white hover:bg-teal-800 cursor-pointer"
                  >
                    <Sparkles className="h-4 w-4" />
                    <span>Recalibrar Cuadro B</span>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      onUpdateProject((p) => ({
                        ...p,
                        cuadroB: [
                          ...p.cuadroB,
                          {rubro: 'Bienes', desc: '', unidad: 'Unidad', cant: 1, unit: 0, just: 'OE2'},
                        ],
                      }))
                    }
                    className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50 cursor-pointer"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Ítem</span>
                  </button>
                </div>
              </div>

              <div
                className={`rounded-xl border p-3 text-sm font-semibold ${
                  totalBudget > fin.maxMonto
                    ? 'border-red-300 bg-red-50 text-red-950'
                    : bienesSum > fin.maxBienes + 1 || serviciosSum > fin.maxServicios + 1
                    ? 'border-amber-300 bg-amber-50 text-amber-950'
                    : 'border-emerald-300 bg-emerald-50 text-emerald-950'
                }`}
              >
                {totalBudget > fin.maxMonto
                  ? `Excede el tope: S/ ${totalBudget.toFixed(2)} / S/ ${fin.maxMonto.toLocaleString('es-PE')}.`
                  : bienesSum > fin.maxBienes + 1 || serviciosSum > fin.maxServicios + 1
                  ? `Ajustar proporción ${fin.bienesPct}/${fin.serviciosPct} (Bienes: ${bienesPct}% · Servicios: ${serviciosPct}%).`
                  : `Presupuesto conforme: S/ ${totalBudget.toFixed(2)} (${bienesPct}% Bienes / ${serviciosPct}% Servicios).`}
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full min-w-[780px] text-sm">
                  <thead className="bg-slate-900 text-white">
                    <tr>
                      <th className="p-2.5 text-left w-[14%]">Rubro</th>
                      <th className="p-2.5 text-left w-[25%]">Descripción del Bien o Servicio</th>
                      <th className="p-2.5 text-left w-[11%]">Unidad</th>
                      <th className="p-2.5 text-left w-[10%]">Cant.</th>
                      <th className="p-2.5 text-left w-[12%]">P. Unit (S/)</th>
                      <th className="p-2.5 text-left w-[12%]">Total (S/)</th>
                      <th className="p-2.5 text-left w-[12%]">Justificación</th>
                      <th className="p-2.5 w-[4%]"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {(project.cuadroB || []).map((row, idx) => {
                      const sub = (Number(row.cant) || 0) * (Number(row.unit) || 0);
                      return (
                        <tr key={idx}>
                          <td className="p-2">
                            <select
                              value={row.rubro}
                              onChange={(e) =>
                                onUpdateProject((p) => {
                                  const next = [...p.cuadroB];
                                  next[idx] = {
                                    ...next[idx],
                                    rubro: e.target.value as 'Bienes' | 'Servicios',
                                  };
                                  return {...p, cuadroB: next};
                                })
                              }
                              className={inputSmall}
                            >
                              <option value="Bienes">Bienes</option>
                              <option value="Servicios">Servicios</option>
                            </select>
                          </td>
                          <td className="p-2">
                            <textarea
                              rows={2}
                              value={row.desc}
                              onChange={(e) =>
                                onUpdateProject((p) => {
                                  const next = [...p.cuadroB];
                                  next[idx] = {...next[idx], desc: e.target.value};
                                  return {...p, cuadroB: next};
                                })
                              }
                              className={inputSmall}
                            />
                          </td>
                          <td className="p-2">
                            <input
                              type="text"
                              value={row.unidad}
                              onChange={(e) =>
                                onUpdateProject((p) => {
                                  const next = [...p.cuadroB];
                                  next[idx] = {...next[idx], unidad: e.target.value};
                                  return {...p, cuadroB: next};
                                })
                              }
                              className={inputSmall}
                            />
                          </td>
                          <td className="p-2">
                            <input
                              type="number"
                              min={1}
                              value={row.cant}
                              onChange={(e) =>
                                onUpdateProject((p) => {
                                  const next = [...p.cuadroB];
                                  next[idx] = {...next[idx], cant: Number(e.target.value)};
                                  return {...p, cuadroB: next};
                                })
                              }
                              className={`${inputSmall} font-mono-tabular`}
                            />
                          </td>
                          <td className="p-2">
                            <input
                              type="number"
                              min={0}
                              value={row.unit}
                              onChange={(e) =>
                                onUpdateProject((p) => {
                                  const next = [...p.cuadroB];
                                  next[idx] = {...next[idx], unit: Number(e.target.value)};
                                  return {...p, cuadroB: next};
                                })
                              }
                              className={`${inputSmall} font-mono-tabular`}
                            />
                          </td>
                          <td className="p-2 font-bold font-mono-tabular text-slate-900">
                            S/ {sub.toFixed(2)}
                          </td>
                          <td className="p-2">
                            <input
                              type="text"
                              value={row.just}
                              onChange={(e) =>
                                onUpdateProject((p) => {
                                  const next = [...p.cuadroB];
                                  next[idx] = {...next[idx], just: e.target.value};
                                  return {...p, cuadroB: next};
                                })
                              }
                              className={inputSmall}
                            />
                          </td>
                          <td className="p-2 text-center">
                            <button
                              type="button"
                              onClick={() =>
                                onUpdateProject((p) => ({
                                  ...p,
                                  cuadroB: p.cuadroB.filter((_, i) => i !== idx),
                                }))
                              }
                              aria-label="Quitar ítem"
                              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-red-200 text-red-700 hover:bg-red-50 cursor-pointer"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot className="bg-slate-50 font-bold font-mono-tabular">
                    <tr>
                      <td colSpan={5} className="p-2.5 text-right">
                        Subtotal Bienes:
                      </td>
                      <td colSpan={3} className="p-2.5">
                        S/ {bienesSum.toFixed(2)} ({bienesPct}%)
                      </td>
                    </tr>
                    <tr>
                      <td colSpan={5} className="p-2.5 text-right">
                        Subtotal Servicios:
                      </td>
                      <td colSpan={3} className="p-2.5">
                        S/ {serviciosSum.toFixed(2)} ({serviciosPct}%)
                      </td>
                    </tr>
                    <tr className="bg-red-50 text-red-900">
                      <td colSpan={5} className="p-2.5 text-right">
                        TOTAL SUBVENCIÓN:
                      </td>
                      <td colSpan={3} className="p-2.5">
                        S/ {totalBudget.toFixed(2)} / S/ {fin.maxMonto.toLocaleString('es-PE')}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </section>
        </div>
      )}

      {/* Anexos Legales 3 y 4 */}
      {sec.hasLegal && (
        <div id="part_anexos" className="space-y-6">
          <section className="overflow-hidden rounded-2xl border-2 border-violet-300 bg-white shadow-sm">
            <div className="h-2 w-full bg-violet-700" aria-hidden="true" />
            <div className="p-4 sm:p-6 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2.5">
                <h3 className="text-lg font-extrabold text-violet-800">
                  Anexo N° 3: Declaración Jurada de Cumplimiento de Requisitos
                </h3>
                <button
                  type="button"
                  onClick={() => onCopyText(getAnexo3Text(project), 'Anexo N° 3 copiado.')}
                  className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50 cursor-pointer"
                >
                  <ClipboardCopy className="h-4 w-4" />
                  <span>Copiar Anexo 3</span>
                </button>
              </div>
              <pre className="whitespace-pre-wrap rounded-xl border border-slate-200 bg-slate-50 p-4 font-sans text-sm sm:text-[15px] text-violet-900 leading-relaxed">
                {getAnexo3Text(project)}
              </pre>
            </div>
          </section>

          <section className="overflow-hidden rounded-2xl border-2 border-rose-300 bg-white shadow-sm">
            <div className="h-2 w-full bg-rose-700" aria-hidden="true" />
            <div className="p-4 sm:p-6 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2.5">
                <h3 className="text-lg font-extrabold text-rose-800">
                  Anexo N° 4: Declaración Jurada de Autenticidad y Originalidad
                </h3>
                <button
                  type="button"
                  onClick={() => onCopyText(getAnexo4Text(project), 'Anexo N° 4 copiado.')}
                  className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50 cursor-pointer"
                >
                  <ClipboardCopy className="h-4 w-4" />
                  <span>Copiar Anexo 4</span>
                </button>
              </div>
              <pre className="whitespace-pre-wrap rounded-xl border border-slate-200 bg-slate-50 p-4 font-sans text-sm sm:text-[15px] text-rose-900 leading-relaxed">
                {getAnexo4Text(project)}
              </pre>
            </div>
          </section>
        </div>
      )}

      {/* Instrumentos y Evidencias por Modalidad */}
      {sec.hasInstruments && (
        <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 shadow-xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h3 className="text-lg sm:text-xl font-extrabold text-slate-900">
                Instrumentos de la Modalidad
              </h3>
              <p className="text-sm font-bold font-mono-tabular text-teal-800 mt-0.5">
                Avance: {readyInstrumentsCount}/{reqInstruments.length} completos (
                {reqInstruments.length > 0
                  ? Math.round((readyInstrumentsCount / reqInstruments.length) * 100)
                  : 0}
                %)
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                onUpdateProject((p) => {
                  const nextInst = {...(p.instruments || {})};
                  const nextChk = {...(p.instrumentsChecked || {})};
                  reqInstruments.forEach((inst) => {
                    nextInst[inst.id] = generateSingleInstrumentContent(inst.id, p);
                    nextChk[inst.id] = true;
                  });
                  return {...p, instruments: nextInst, instrumentsChecked: nextChk};
                });
                onNotify(`Se generaron los ${reqInstruments.length} instrumentos.`);
              }}
              className="inline-flex min-h-[42px] items-center gap-1.5 rounded-xl bg-red-800 px-4 py-2 text-sm font-semibold text-white hover:bg-red-900 whitespace-nowrap cursor-pointer"
            >
              <Zap className="h-4 w-4" />
              <span>Generar Instrumentos</span>
            </button>
          </div>

          {/* Video YouTube */}
          <div className="rounded-xl border border-slate-300 bg-slate-50 p-4 space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="text-sm sm:text-base font-bold text-slate-900" htmlFor="yt_url">
                Enlace de Video YouTube (Máx. 3 min)
              </label>
              <button
                type="button"
                onClick={() => {
                  onUpdateProject((p) => ({
                    ...p,
                    instruments: {
                      ...(p.instruments || {}),
                      inst_guion_video: generateSingleInstrumentContent('inst_guion_video', p),
                    },
                    instrumentsChecked: {...(p.instrumentsChecked || {}), inst_guion_video: true},
                  }));
                  onNotify('Guion de video generado.');
                }}
                className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg bg-teal-700 px-3 py-1.5 text-sm font-semibold text-white hover:bg-teal-800 cursor-pointer"
              >
                <Video className="h-4 w-4" />
                <span>Generar Guion</span>
              </button>
            </div>
            <input
              id="yt_url"
              type="text"
              value={project.videoUrl || ''}
              onChange={(e) =>
                onUpdateProject((p) => ({...p, videoUrl: e.target.value}))
              }
              placeholder="https://www.youtube.com/watch?v=..."
              className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-base text-slate-950"
            />
          </div>

          {/* Tarjetas de instrumentos con letras de colores y avance individual */}
          <div className="space-y-5">
            {reqInstruments.map((inst, idx) => {
              const pal = RUBRO_ACCENT_COLORS[idx % RUBRO_ACCENT_COLORS.length];
              const textVal = (project.instruments && project.instruments[inst.id]) || '';
              const isReady =
                textVal.trim().length >= 60 ||
                Boolean(project.instrumentsChecked && project.instrumentsChecked[inst.id]);
              const instPct = isReady ? 100 : Math.min(85, Math.round((textVal.trim().length / 60) * 100));
              const isDictatingInst = dictationTargetId === `inst:${inst.id}`;

              return (
                <article
                  id={`part_inst_${inst.id}`}
                  key={inst.id}
                  className={`overflow-hidden rounded-2xl border-2 bg-white shadow-xs ${pal.cardBorder}`}
                >
                  <div className={`h-2 w-full ${pal.topStripe}`} aria-hidden="true" />
                  <div className="p-4 sm:p-5 space-y-3.5">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                      <div className="space-y-1">
                        <div className={`text-sm font-extrabold font-mono-tabular ${pal.subText}`}>
                          Instrumento {idx + 1} · {inst.format}
                        </div>
                        <h4 className={`text-base sm:text-lg font-extrabold ${pal.titleText}`}>
                          {inst.title}
                        </h4>
                      </div>

                      <div className="sm:text-right shrink-0">
                        <span
                          className={`text-sm sm:text-base font-extrabold font-mono-tabular ${
                            isReady ? 'text-emerald-700' : pal.titleText
                          }`}
                        >
                          {instPct}% · {isReady ? 'Listo' : 'Pendiente'}
                        </span>
                      </div>
                    </div>

                    <div className={`h-2 w-full overflow-hidden rounded-full ${pal.progressTrack}`}>
                      <div
                        className={`h-full rounded-full transition-all duration-200 ${
                          isReady ? 'bg-emerald-600' : pal.progressBar
                        }`}
                        style={{width: `${instPct}%`}}
                      />
                    </div>

                    <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100">
                      <label className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-800 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isReady}
                          onChange={(e) =>
                            onUpdateProject((p) => ({
                              ...p,
                              instrumentsChecked: {
                                ...(p.instrumentsChecked || {}),
                                [inst.id]: e.target.checked,
                              },
                            }))
                          }
                        />
                        <CheckCircle2 className="h-4 w-4 text-emerald-700" />
                        <span>Listo</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => handleToggleInstDictation(inst.id)}
                        aria-pressed={isDictatingInst}
                        className={`inline-flex min-h-[40px] items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-bold cursor-pointer ${
                          isDictatingInst
                            ? 'bg-red-700 text-white hover:bg-red-800'
                            : 'border border-slate-300 bg-white text-slate-900 hover:bg-slate-100'
                        }`}
                      >
                        {isDictatingInst ? (
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
                        onClick={() => {
                          onUpdateProject((p) => ({
                            ...p,
                            instruments: {
                              ...(p.instruments || {}),
                              [inst.id]: generateSingleInstrumentContent(inst.id, p),
                            },
                            instrumentsChecked: {
                              ...(p.instrumentsChecked || {}),
                              [inst.id]: true,
                            },
                          }));
                          onNotify('Instrumento generado.');
                        }}
                        className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg bg-teal-700 px-3 py-1.5 text-sm font-semibold text-white hover:bg-teal-800 cursor-pointer"
                      >
                        <Sparkles className="h-4 w-4" />
                        <span>Generar</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => onCopyText(textVal, 'Instrumento copiado.')}
                        className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-800 hover:bg-slate-50 cursor-pointer"
                      >
                        <ClipboardCopy className="h-4 w-4" />
                        <span>Copiar</span>
                      </button>
                    </div>

                    {isDictatingInst && (
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-xl border-2 border-red-400 bg-red-50 p-3 text-sm text-red-950">
                        <div className="min-w-0 flex-1">
                          <div className="font-bold text-red-900">
                            Escuchando dictado para este instrumento...
                          </div>
                          {dictationInterimText && (
                            <div className="mt-1 italic text-red-900">
                              &ldquo;{dictationInterimText}&rdquo;
                            </div>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={stopDictation}
                          className="min-h-[36px] shrink-0 rounded-lg bg-red-700 px-3 py-1.5 text-sm font-bold text-white hover:bg-red-800 cursor-pointer"
                        >
                          Detener
                        </button>
                      </div>
                    )}

                    <textarea
                      rows={6}
                      value={textVal}
                      onChange={(e) =>
                        onUpdateProject((p) => ({
                          ...p,
                          instruments: {...(p.instruments || {}), [inst.id]: e.target.value},
                        }))
                      }
                      placeholder="Redacta, pulsa 'Dictar' o 'Generar' para completar este instrumento..."
                      className={`w-full rounded-xl border-2 ${pal.cardBorder} bg-white px-3.5 py-3 text-base font-medium leading-relaxed ${pal.editorText} ${pal.focusBorder} focus:outline-none`}
                    />
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Navegación secuencial inferior */}
          <div className="no-print flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => {
                if (viewAllParts || activeSecIndex <= 0) onBackStep1();
                else {
                  onChangeSectionTab(schema.sections[activeSecIndex - 1].id);
                  window.scrollTo({top: 0, behavior: 'smooth'});
                }
              }}
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50 cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>
                {viewAllParts || activeSecIndex <= 0 ? 'Atrás (Paso 1)' : 'Misión Anterior'}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                if (viewAllParts || activeSecIndex >= schema.sections.length - 1) onNextStep3();
                else {
                  onChangeSectionTab(schema.sections[activeSecIndex + 1].id);
                  window.scrollTo({top: 0, behavior: 'smooth'});
                }
              }}
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 cursor-pointer"
            >
              <span>
                {viewAllParts || activeSecIndex >= schema.sections.length - 1
                  ? 'Ir a Auditoría (Paso 3)'
                  : 'Siguiente Misión'}
              </span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
