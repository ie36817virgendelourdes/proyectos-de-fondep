import {COMPETENCIAS_CNEB, PEDAGOGICAL_LOGIC_MAP, TEMATICAS_CNPIE} from '../data/cnpieCatalogs';
import {SCHEMA_FICHAS} from '../data/cnpieSchemas';
import type {
  ArbolObjetivos,
  ArbolProblemas,
  BonusInfo,
  CategoryId,
  CuadroARow,
  CuadroBRow,
  FichaPartItem,
  FinancialRules,
  ModalityId,
  PedagogicalLogic,
  ProjectModel,
  RequiredInstrument,
  RubroStatusInfo,
  SchemaField,
  StepProgressData,
} from '../types/cnpie';

export function generateProjectId(): string {
  return `proj_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 7)}`;
}

export function createEmptyProjectModel(): ProjectModel {
  return {
    id: generateProjectId(),
    updatedAt: new Date().toISOString(),
    category: '2B',
    modalidad: 'EB',
    densidad: 'optimo',
    ie: {
      nombre: '',
      codigo: '',
      nivel: 'Primaria',
      estudiantes: 120,
      dre: '',
      ugel: '',
      region: '',
      provincia: '',
      distrito: '',
      area: 'Rural 1',
      zona_especial: 'Ninguna',
      eib_tipo: 'No aplica',
      lengua: '',
      especialidad: '',
      modulo: '',
    },
    equipo: {
      director: {nombre: '', dni: '', celular: '', correo: '', exp: 'No'},
      coordinador: {nombre: '', dni: '', celular: '', correo: '', exp: 'No'},
      integrantes: [],
    },
    seed: {
      titulo: '',
      tematicas: [TEMATICAS_CNPIE[0]],
      competencias: [COMPETENCIAS_CNEB[7], COMPETENCIAS_CNEB[22]],
      problema: '',
      solucion: '',
    },
    beneficiarios: {
      directos: '',
      indirectos: '',
    },
    fields: {},
    arbolProblemas: null,
    arbolObjetivos: null,
    cuadroA: [],
    cuadroB: [],
    instruments: {},
    instrumentsChecked: {},
    videoUrl: '',
  };
}

export function getProjectFinancialRules(proj: ProjectModel): FinancialRules {
  const cat = proj.category || '2B';
  const mod = proj.modalidad || 'EB';
  const schema = SCHEMA_FICHAS[cat] || SCHEMA_FICHAS['2B'];

  let maxMonto = schema.montoBase;
  if ((cat === '2A' || cat === '2B') && mod === 'EIB_AMAZ') {
    maxMonto = 21600;
  } else if (cat === '2C' || mod === 'MSE_SFT') {
    maxMonto = 70000;
  } else if (cat === '2D') {
    maxMonto = 14000;
  }

  const bienesPct = cat === '2C' || mod === 'MSE_SFT' ? 80 : 70;
  const serviciosPct = 100 - bienesPct;
  const maxBienes = Math.round((maxMonto * bienesPct) / 100);
  const maxServicios = maxMonto - maxBienes;

  return {maxMonto, bienesPct, serviciosPct, maxBienes, maxServicios};
}

export function getProjectBonuses(proj: ProjectModel): BonusInfo {
  const area = proj.ie.area || '';
  const zona = proj.ie.zona_especial || '';
  const eib = proj.ie.eib_tipo || '';
  const mod = proj.modalidad || '';

  let pct = 0;
  const reasons: string[] = [];

  if (
    area === 'Rural 1' ||
    zona.includes('Rural 1') ||
    zona.includes('VRAEM') ||
    zona.includes('Frontera')
  ) {
    pct = 10;
    reasons.push('+10% por Rural 1 / VRAEM / Frontera');
  } else if (
    area === 'Rural 2' ||
    (eib && eib !== 'No aplica') ||
    zona.includes('Multigrado') ||
    mod === 'MSE_SFT'
  ) {
    pct = 5;
    reasons.push('+5% por Rural 2 / EIB / Multigrado / MSE-SFT');
  }

  let points = 0;
  let pointsReason = '';
  if (zona.includes('Convenio')) {
    points = 2;
    pointsReason = '+2 puntos adicionales por Convenio Vigente (CETPRO / IEST / Sector Productivo)';
  }

  return {
    pct,
    pctReason: reasons.length ? reasons.join(' · ') : 'Sin bonificación porcentual adicional (0%)',
    points,
    pointsReason,
  };
}

export function getWordTargetMetrics(maxChars: number): {maxWordsBases: number; metaPalabras: number} {
  const maxWordsBases = Math.floor(maxChars / 6.2);
  const metaPalabras = Math.max(40, maxWordsBases - 100);
  return {maxWordsBases, metaPalabras};
}

export function countWords(text?: string): number {
  if (!text || !text.trim()) return 0;
  return text.trim().split(/\s+/).length;
}

export function getModalityAndProjectLabels(proj: ProjectModel) {
  const fin = getProjectFinancialRules(proj);
  const modLabels: Record<string, string> = {
    EB: 'IIEE Educación Básica (EBR/EBA/EBE)',
    EIB_AMAZ: 'IIEE EIB Ámbito Lingüístico Amazónico',
    MSE_SFT: 'IIEE MSE-SFT (Secundaria Formación Técnica)',
  };
  const catLabels: Record<string, string> = {
    '2A': 'Anexo 2A · Innovación Consolidada',
    '2B': 'Anexo 2B · Innovación Promisoria',
    '2C': 'Anexo 2C · Productivo MSE-SFT',
    '2D': 'Anexo 2D · Investigación Aplicada IAPE',
  };
  return {
    modLabel: modLabels[proj.modalidad] || modLabels.EB,
    catLabel: catLabels[proj.category] || catLabels['2B'],
    montoLabel: `Tope: S/ ${fin.maxMonto.toLocaleString('es-PE')} (${fin.bienesPct}/${fin.serviciosPct})`,
  };
}

export function getRubroStatusInfo(
  proj: ProjectModel,
  field: Pick<SchemaField, 'key' | 'maxChars'>
): RubroStatusInfo {
  const txt = (proj.fields[field.key] || '').trim();
  const words = countWords(txt);
  const {maxWordsBases, metaPalabras} = getWordTargetMetrics(field.maxChars);

  if (!txt || words < 15) {
    return {
      state: 'missing',
      label: 'Falta completar',
      words,
      metaPalabras,
      maxWordsBases,
    };
  }
  if (txt.length > field.maxChars || words > maxWordsBases) {
    return {
      state: 'over',
      label: `Excede límite (${words} pal.)`,
      words,
      metaPalabras,
      maxWordsBases,
    };
  }
  if (words < Math.floor(metaPalabras * 0.65)) {
    return {
      state: 'partial',
      label: `En progreso (${words}/${metaPalabras} pal.)`,
      words,
      metaPalabras,
      maxWordsBases,
    };
  }
  return {
    state: 'complete',
    label: `Completo (${words}/${metaPalabras} pal.)`,
    words,
    metaPalabras,
    maxWordsBases,
  };
}

export function getRequiredInstrumentsForProject(proj: ProjectModel): RequiredInstrument[] {
  const cat = proj.category;
  const isEIB =
    proj.modalidad === 'EIB_AMAZ' ||
    Boolean(proj.ie && proj.ie.eib_tipo && proj.ie.eib_tipo !== 'No aplica');
  const hasConvenio = Boolean(proj.ie && proj.ie.zona_especial && proj.ie.zona_especial.includes('Convenio'));

  const commonBase: RequiredInstrument[] = [
    {
      id: 'inst_arbol',
      badge: 'Obligatorio PDF · Numeral 1.1',
      badgeType: 'obligatorio',
      title: 'Árbol de Problemas y Análisis Causal (Sincronizado con Numeral 1.1.1)',
      desc: 'Sustento causal de 3+ causas directas e indirectas y 3+ efectos en los aprendizajes.',
      format: 'PDF (máx. 5 MB)',
    },
    {
      id: 'inst_diagnostico',
      badge: 'Obligatorio PDF · Numeral 1.1',
      badgeType: 'obligatorio',
      title: 'Matriz Consolidada de Evaluación Diagnóstica y Línea de Base 2026',
      desc: 'Consolida resultados de actas SIAGIE, evaluación diagnóstica institucional y ENLA 2025.',
      format: 'PDF (2 a 4 archivos)',
    },
    {
      id: 'inst_guion_video',
      badge: 'Audiovisual Obligatorio',
      badgeType: 'audiovisual',
      title: 'Guion Técnico del Video de Postulación (YouTube Público - Máx. 3 min)',
      desc: 'Guion minuto a minuto (0:00 a 3:00) para grabar en formato horizontal y subir a YouTube.',
      format: 'Enlace YouTube (≤ 3:00 min)',
    },
  ];

  const byCategory: Record<CategoryId, RequiredInstrument[]> = {
    '2A': [
      ...commonBase,
      {
        id: 'inst_2a_voz',
        badge: 'Obligatorio 2A · Numeral 3.1',
        badgeType: 'obligatorio',
        title: 'Ficha de Grupo Focal y Encuesta de Voz Estudiantil (4+ necesidades)',
        desc: 'Evidencia necesidades e intereses de los estudiantes participantes.',
        format: 'PDF (hasta 2 archivos)',
      },
      {
        id: 'inst_2a_monitoreo',
        badge: 'Obligatorio 2A · Numeral 6.1',
        badgeType: 'modalidad',
        title: 'Ficha de Monitoreo y Acompañamiento Docente (2 Momentos)',
        desc: 'Verifica cambios en la práctica pedagógica entre inicio y consolidación.',
        format: 'PDF + Actas',
      },
      {
        id: 'inst_2a_resultados',
        badge: 'Obligatorio 2A · Numeral 6.1.1',
        badgeType: 'modalidad',
        title: 'Cuadro Comparativo de Resultados (Línea de Base vs. Actual) Refrendado',
        desc: 'Matriz de 4+ resultados con cifras refrendada por la Dirección.',
        format: 'PDF (2 a 4 archivos)',
      },
    ],
    '2B': [
      ...commonBase,
      {
        id: 'inst_2b_caract',
        badge: 'Obligatorio 2B · Numeral 3.1.1',
        badgeType: 'obligatorio',
        title: 'Ficha de Caracterización de Necesidades e Intereses Estudiantiles (4+)',
        desc: 'Sustenta con porcentajes y testimonios las demandas de los estudiantes.',
        format: 'PDF (hasta 2 archivos)',
      },
      {
        id: 'inst_2b_actores',
        badge: 'Obligatorio 2B · Numeral 4.1.1',
        badgeType: 'obligatorio',
        title: 'Matriz de Actores (Stakeholders) y Acta de Acuerdos 2027',
        desc: 'Define roles de 3+ actores internos y 3+ actores externos.',
        format: 'PDF (2 archivos)',
      },
      {
        id: 'inst_2b_rubrica',
        badge: 'Instrumento 2B · Numeral 5.1.3',
        badgeType: 'modalidad',
        title: 'Rúbrica Analítica de Evaluación Formativa y Seguimiento 2027',
        desc: 'Evalúa progresión de competencias en marzo, julio y noviembre 2027.',
        format: 'Instrumento Aula 2027',
      },
    ],
    '2C': [
      ...commonBase,
      {
        id: 'inst_2c_empatia',
        badge: 'Obligatorio MSE-SFT · Numeral 3.1/3.2',
        badgeType: 'modalidad',
        title: 'Mapas de Empatía (Estudiantes de Especialidad + Usuarios del Sector)',
        desc: 'Recoge expectativas y necesidades de estudiantes y usuarios reales.',
        format: 'PDF (1 a 3 archivos)',
      },
      {
        id: 'inst_2c_prototipo',
        badge: 'Obligatorio MSE-SFT · Numeral 2.1.2',
        badgeType: 'modalidad',
        title: 'Dossier de Prototipo (V1/V2) + Customer Journey Map + Storyboard',
        desc: 'Documenta el diseño y evolución del bien o servicio productivo.',
        format: 'PDF Evidencia 2.1.2',
      },
      {
        id: 'inst_2c_validacion',
        badge: 'Obligatorio MSE-SFT · Numeral 2.1.2',
        badgeType: 'modalidad',
        title: 'Ficha y Matriz de Validación con Usuarios Reales',
        desc: 'Resultados de pruebas de calidad, utilidad y seguridad con usuarios.',
        format: 'PDF Evidencia 2.1.2',
      },
    ],
    '2D': [
      ...commonBase,
      {
        id: 'inst_2d_barreras',
        badge: 'Obligatorio IAPE · Numeral 1.1.2',
        badgeType: 'modalidad',
        title: 'Matriz Participativa de Contraste de 4+ Fuentes y Mapeo de Barreras',
        desc: 'Triangula fuentes primarias, secundarias y voz estudiantil.',
        format: 'PDF Evidencia 1.1.2',
      },
      {
        id: 'inst_2d_diario',
        badge: 'Obligatorio IAPE · Numeral 2.2.1',
        badgeType: 'modalidad',
        title: 'Diario de Campo Docente-Investigador y Bitácora Co-Investigador',
        desc: 'Instrumento de registro reflexivo en los 4 momentos de la ruta IAPE.',
        format: 'Instrumento IAPE',
      },
      {
        id: 'inst_2d_etica',
        badge: 'Rigor Ético · Numeral 2.2.1',
        badgeType: 'obligatorio',
        title: 'Consentimiento Informado (Familias) y Asentimiento (Ley N° 29733)',
        desc: 'Resguardo ético obligatorio para participación de menores.',
        format: 'Archivo Ética IAPE',
      },
    ],
  };

  const list = [...(byCategory[cat] || byCategory['2B'])];
  if (isEIB) {
    list.push({
      id: 'inst_eib',
      badge: 'Modalidad EIB · Intercultural',
      badgeType: 'modalidad',
      title: 'Ficha Sociolingüística y Guía de Diálogo de Saberes con Yachaq',
      desc: `Articula saberes ancestrales y uso pedagógico bilingüe (${proj.ie.lengua || 'Lengua Originaria'} / Castellano).`,
      format: 'Instrumento EIB',
    });
  }
  if (hasConvenio) {
    list.push({
      id: 'inst_convenio',
      badge: 'Bonificación +2 Puntos',
      badgeType: 'obligatorio',
      title: 'Ficha de Verificación de Convenio Vigente (CETPRO / IEST / Sector)',
      desc: 'Respalda los +2 puntos adicionales en la calificación final.',
      format: 'PDF Convenio Vigente',
    });
  }
  return list;
}

export function computeStepProgressData(proj: ProjectModel): StepProgressData {
  const schema = SCHEMA_FICHAS[proj.category];
  const fin = getProjectFinancialRules(proj);

  const s1Checks = [
    Boolean(proj.category),
    Boolean(proj.ie.nombre && proj.ie.nombre.trim().length >= 3),
    Boolean(proj.ie.codigo && proj.ie.codigo.trim().length >= 4),
    Boolean(proj.ie.dre && proj.ie.ugel),
    Boolean(proj.equipo.director.nombre && proj.equipo.director.dni),
    Boolean(proj.equipo.coordinador.nombre && proj.equipo.coordinador.dni),
    Boolean(proj.seed.titulo && proj.seed.titulo.trim().length >= 8),
    Boolean(
      proj.seed.problema &&
        proj.seed.solucion &&
        proj.seed.tematicas.length > 0 &&
        proj.seed.competencias.length > 0
    ),
  ];
  const s1Done = s1Checks.filter(Boolean).length;
  const s1Pct = Math.round((s1Done / s1Checks.length) * 100);

  const reqInstruments = getRequiredInstrumentsForProject(proj);
  let totalRubros = 3 + reqInstruments.length;
  let completedRubros = 0;
  let missingNarrativeCount = 0;

  schema.sections.forEach((sec) => {
    sec.fields.forEach((f) => {
      totalRubros++;
      const st = getRubroStatusInfo(proj, f);
      if (st.state === 'complete') {
        completedRubros++;
      } else {
        missingNarrativeCount++;
      }
    });
  });

  const treeOk = Boolean(
    proj.arbolProblemas &&
      proj.arbolProblemas.problemaCentral &&
      proj.arbolProblemas.problemaCentral.trim().length > 10
  );
  if (treeOk) completedRubros++;

  const cuadAOk = Boolean(proj.cuadroA && proj.cuadroA.length >= 3);
  if (cuadAOk) completedRubros++;

  let totBudget = 0;
  (proj.cuadroB || []).forEach((r) => {
    totBudget += (Number(r.cant) || 0) * (Number(r.unit) || 0);
  });
  const cuadBOk = totBudget > 0 && totBudget <= fin.maxMonto;
  if (cuadBOk) completedRubros++;

  reqInstruments.forEach((inst) => {
    const instTxt = (proj.instruments && proj.instruments[inst.id]) || '';
    const isChk = Boolean(proj.instrumentsChecked && proj.instrumentsChecked[inst.id]);
    if (instTxt.trim().length >= 60 || isChk) completedRubros++;
  });

  const s2Pct = Math.round((completedRubros / totalRubros) * 100);

  let totalNarr = 0;
  let validNarr = 0;
  schema.sections.forEach((sec) => {
    sec.fields.forEach((f) => {
      totalNarr++;
      if (getRubroStatusInfo(proj, f).state === 'complete') validNarr++;
    });
  });

  let score = Math.round((validNarr / Math.max(1, totalNarr)) * 60);
  if (treeOk) score += 5;
  if (cuadAOk) score += 15;
  if (cuadBOk) score += 15;
  if (proj.ie.nombre && proj.equipo.director.nombre && proj.equipo.coordinador.nombre) score += 3;
  const readyInstCount = reqInstruments.filter(
    (i) =>
      ((proj.instruments && proj.instruments[i.id]) || '').trim().length >= 60 ||
      Boolean(proj.instrumentsChecked && proj.instrumentsChecked[i.id])
  ).length;
  if (readyInstCount === reqInstruments.length) score += 2;

  return {
    s1Done,
    s1Total: s1Checks.length,
    s1Pct,
    s2Done: completedRubros,
    s2Total: totalRubros,
    s2Pct,
    missingNarrativeCount,
    s3Score: Math.min(100, score),
  };
}

export interface SectionCompletionMetric {
  sectionId: string;
  name: string;
  fullLabel: string;
  pct: number;
  doneItems: number;
  totalItems: number;
  status: 'complete' | 'in_progress' | 'empty' | 'alert';
}

export interface AuditAlertItem {
  id: string;
  severity: 'critica' | 'advertencia';
  targetView: 'step1' | 'step2';
  sectionId: string;
  fieldKey?: string;
  title: string;
  detail: string;
}

export interface ProjectDashboardMetrics {
  overallPct: number;
  auditScore: number;
  totalCompletedItems: number;
  totalItems: number;
  sections: SectionCompletionMetric[];
  alerts: AuditAlertItem[];
  criticalCount: number;
  warningCount: number;
}

export function computeProjectDashboardData(proj: ProjectModel): ProjectDashboardMetrics {
  const schema = SCHEMA_FICHAS[proj.category];
  const fin = getProjectFinancialRules(proj);
  const prog = computeStepProgressData(proj);
  const alerts: AuditAlertItem[] = [];
  const sections: SectionCompletionMetric[] = [];

  // 0. Contexto IE, Equipo y Semilla (Paso 1)
  const hasIeName = Boolean(proj.ie.nombre && proj.ie.nombre.trim().length >= 3);
  const hasIeCode = Boolean(proj.ie.codigo && proj.ie.codigo.trim().length >= 4);
  const hasUgel = Boolean(proj.ie.dre && proj.ie.ugel);
  const hasDirector = Boolean(proj.equipo.director.nombre && proj.equipo.director.dni);
  const hasCoord = Boolean(proj.equipo.coordinador.nombre && proj.equipo.coordinador.dni);
  const hasTitle = Boolean(proj.seed.titulo && proj.seed.titulo.trim().length >= 8);
  const hasProb = Boolean(proj.seed.problema && proj.seed.problema.trim().length >= 12);
  const hasSol = Boolean(proj.seed.solucion && proj.seed.solucion.trim().length >= 12);

  if (!hasIeName || !hasIeCode || !hasUgel) {
    alerts.push({
      id: 'alert_ie_datos',
      severity: 'critica',
      targetView: 'step1',
      sectionId: 'step1',
      title: 'Datos incompletos de la Institución Educativa (Anexo N° 1)',
      detail: 'Falta completar nombre de la IE, código modular o DRE/UGEL en el Paso 1.',
    });
  }
  if (!hasDirector || !hasCoord) {
    alerts.push({
      id: 'alert_equipo_dni',
      severity: 'critica',
      targetView: 'step1',
      sectionId: 'step1',
      title: 'Equipo responsable sin DNI o nombre completo',
      detail: 'Registra nombre y DNI de Director(a) y Docente Coordinador(a) en el Paso 1.',
    });
  }
  if (!hasProb || !hasSol || !hasTitle) {
    alerts.push({
      id: 'alert_semilla_core',
      severity: 'critica',
      targetView: 'step1',
      sectionId: 'step1',
      title: 'Problema Central, Título o Solución pendientes',
      detail: 'Redacta o dicta el Problema Central, Título y Propuesta de Solución en el Paso 1.',
    });
  }

  sections.push({
    sectionId: 'step1',
    name: '0. Contexto IE',
    fullLabel: 'Paso 1 · Contexto IE, Equipo y Semilla',
    pct: prog.s1Pct,
    doneItems: prog.s1Done,
    totalItems: prog.s1Total,
    status: prog.s1Pct === 100 ? 'complete' : prog.s1Pct > 0 ? 'in_progress' : 'empty',
  });

  // Secciones de la ficha oficial CNPIE 2027 (Paso 2)
  const reqInstruments = getRequiredInstrumentsForProject(proj);
  let totBudget = 0;
  let totalBienes = 0;
  let totalServicios = 0;
  (proj.cuadroB || []).forEach((r) => {
    const sub = (Number(r.cant) || 0) * (Number(r.unit) || 0);
    totBudget += sub;
    if (r.rubro === 'Bienes') totalBienes += sub;
    else totalServicios += sub;
  });

  schema.sections.forEach((sec) => {
    if (sec.hasInstruments) {
      let done = 0;
      const total = reqInstruments.length + 1; // instrumentos + video URL
      reqInstruments.forEach((inst) => {
        const instTxt = (proj.instruments && proj.instruments[inst.id]) || '';
        const isChk = Boolean(proj.instrumentsChecked && proj.instrumentsChecked[inst.id]);
        if (instTxt.trim().length >= 60 || isChk) {
          done++;
        } else {
          alerts.push({
            id: `alert_inst_${inst.id}`,
            severity: 'advertencia',
            targetView: 'step2',
            sectionId: sec.id,
            title: `Instrumento pendiente: ${inst.title}`,
            detail: 'Redacta, dicta o marca como listo este instrumento obligatorio.',
          });
        }
      });

      const hasVideo = Boolean(proj.videoUrl && proj.videoUrl.trim().length >= 8);
      if (hasVideo) {
        done++;
      } else {
        alerts.push({
          id: 'alert_video_url',
          severity: 'advertencia',
          targetView: 'step2',
          sectionId: sec.id,
          title: 'Falta registrar el enlace de Video (YouTube)',
          detail: 'Ingresa la URL pública de tu video de hasta 3 minutos en la sección de Instrumentos.',
        });
      }

      const pct = total > 0 ? Math.round((done / total) * 100) : 100;
      sections.push({
        sectionId: sec.id,
        name: sec.tab.length > 20 ? `${sec.tab.slice(0, 18)}…` : sec.tab,
        fullLabel: sec.tab,
        pct,
        doneItems: done,
        totalItems: total,
        status: pct === 100 ? 'complete' : pct > 0 ? 'in_progress' : 'empty',
      });
      return;
    }

    let fracSum = 0;
    let doneItems = 0;
    let totalItems = sec.fields.length;
    let hasCriticalInSec = false;

    sec.fields.forEach((f) => {
      const st = getRubroStatusInfo(proj, f);
      if (st.state === 'complete') {
        fracSum += 1;
        doneItems++;
      } else if (st.state === 'over') {
        fracSum += 0.65;
        hasCriticalInSec = true;
        alerts.push({
          id: `alert_over_${f.key}`,
          severity: 'critica',
          targetView: 'step2',
          sectionId: sec.id,
          fieldKey: f.key,
          title: `Rubro ${f.code} excede límite FONDEP`,
          detail: `Tiene ${st.words} palabras (tope oficial ${st.maxWordsBases} pal.). Usa Auditoría rápida o Ajustar.`,
        });
      } else {
        const partial =
          st.words > 0 ? Math.min(0.95, st.words / Math.max(1, st.metaPalabras)) : 0;
        fracSum += partial;
        alerts.push({
          id: `alert_field_${f.key}`,
          severity: 'advertencia',
          targetView: 'step2',
          sectionId: sec.id,
          fieldKey: f.key,
          title:
            st.words === 0
              ? `Rubro ${f.code} sin iniciar`
              : `Rubro ${f.code} en proceso (${st.words}/${st.metaPalabras} pal.)`,
          detail: `${f.label}`,
        });
      }
    });

    if (sec.id === 'sec1') {
      totalItems += 1;
      const treeOk = Boolean(
        proj.arbolProblemas &&
          proj.arbolProblemas.problemaCentral &&
          proj.arbolProblemas.problemaCentral.trim().length > 10
      );
      if (treeOk) {
        fracSum += 1;
        doneItems++;
      } else {
        alerts.push({
          id: 'alert_arbol',
          severity: 'advertencia',
          targetView: 'step2',
          sectionId: sec.id,
          title: 'Árbol de Problemas y Objetivos pendiente (1.1.1)',
          detail: 'Genera o completa el Árbol de Problemas y su transformación en Árbol de Objetivos.',
        });
      }
    }

    if (sec.hasTables) {
      totalItems += 2;
      const cuadAOk = Boolean(proj.cuadroA && proj.cuadroA.length >= 3);
      if (cuadAOk) {
        fracSum += 1;
        doneItems++;
      } else {
        alerts.push({
          id: 'alert_cuadroA',
          severity: 'advertencia',
          targetView: 'step2',
          sectionId: sec.id,
          title: 'Cuadro A (Cronograma 2027) incompleto',
          detail: 'Registra al menos 3 actividades en el Cuadro A de la sección 4.',
        });
      }

      const budgetOver = totBudget > fin.maxMonto || totalBienes > fin.maxBienes || totalServicios > fin.maxServicios;
      const cuadBOk = totBudget > 0 && !budgetOver;
      if (cuadBOk) {
        fracSum += 1;
        doneItems++;
      } else if (budgetOver) {
        hasCriticalInSec = true;
        alerts.push({
          id: 'alert_cuadroB_over',
          severity: 'critica',
          targetView: 'step2',
          sectionId: sec.id,
          title: 'Presupuesto Cuadro B excede tope o proporción oficial',
          detail: `Total S/ ${totBudget.toFixed(0)} (Tope S/ ${fin.maxMonto.toLocaleString('es-PE')}, máx. ${fin.bienesPct}% Bienes / ${fin.serviciosPct}% Servicios).`,
        });
      } else {
        alerts.push({
          id: 'alert_cuadroB_empty',
          severity: 'advertencia',
          targetView: 'step2',
          sectionId: sec.id,
          title: 'Cuadro B (Presupuesto Anexo N° 5) vacío',
          detail: 'Agrega partidas de Bienes y Servicios respetando el tope de tu modalidad.',
        });
      }
    }

    const pct = totalItems > 0 ? Math.min(100, Math.round((fracSum / totalItems) * 100)) : 100;
    sections.push({
      sectionId: sec.id,
      name: sec.tab.length > 20 ? `${sec.tab.slice(0, 18)}…` : sec.tab,
      fullLabel: sec.tab,
      pct,
      doneItems,
      totalItems,
      status: hasCriticalInSec
        ? 'alert'
        : pct === 100
        ? 'complete'
        : pct > 0
        ? 'in_progress'
        : 'empty',
    });
  });

  const totalCompletedItems = sections.reduce((acc, s) => acc + s.doneItems, 0);
  const totalItems = sections.reduce((acc, s) => acc + s.totalItems, 0);
  const overallPct =
    sections.length > 0
      ? Math.round(sections.reduce((acc, s) => acc + s.pct, 0) / sections.length)
      : 0;

  // Ordenar alertas críticas primero
  const sortedAlerts = [...alerts].sort((a, b) =>
    a.severity === b.severity ? 0 : a.severity === 'critica' ? -1 : 1
  );

  return {
    overallPct,
    auditScore: prog.s3Score,
    totalCompletedItems,
    totalItems,
    sections,
    alerts: sortedAlerts,
    criticalCount: sortedAlerts.filter((a) => a.severity === 'critica').length,
    warningCount: sortedAlerts.filter((a) => a.severity === 'advertencia').length,
  };
}

export type ProblemDomainId =
  | 'lectura'
  | 'matematica'
  | 'ambiente'
  | 'ciencia'
  | 'convivencia'
  | 'tic_digital'
  | 'arte_cultura'
  | 'salud_fisica'
  | 'inclusion'
  | 'eib'
  | 'sft_productivo'
  | 'gestion_evaluacion'
  | 'general';

export interface ProblemSuggestionOption {
  id: string;
  areaLabel: string;
  tematica: string;
  scopeTag: string;
  scopeGroup: 'tematicas_eb' | 'eib' | 'sft' | 'iape' | 'modalidades_esp';
  domain: ProblemDomainId;
  recommendedCategory?: CategoryId;
  recommendedModality?: ModalityId;
  recommendedNivel?: string;
  recommendedArea?: string;
  recommendedZona?: string;
  recommendedEibTipo?: string;
  problema: string;
}

export interface ProblemProfile {
  domain: ProblemDomainId;
  domainLabel: string;
  problemCore: string;
  tematicas: string[];
  competencias: string[];
  suggestedTitle: string;
  suggestedSolution: string;
  causasDirectas: [string, string, string];
  causasIndirectas: [string, string, string];
  efectosDirectos: [string, string, string];
  efectoFinal: string;
  objetivosEspecificos: [string, string, string];
  mediosAccion: [string, string, string];
  metaObjetivoGeneral: string;
  metodologiaFundamento: string;
  fasesMetodologicas: [string, string, string, string];
  rupturasInnovadoras: [string, string, string, string];
  necesidadesEstudiantes: [string, string, string, string];
  demandasTerritorio: [string, string, string, string];
  cuadroAActividades: CuadroARow[];
  cuadroBDescs: {
    bien1: string;
    bien2: string;
    serv1: string;
    serv2: string;
  };
  instrumentHighlights: {
    diagnostico: string;
    voz: string;
    rubrica: string;
    guionExtra: string;
  };
}

export interface ProjectContext {
  cat: CategoryId;
  mod: string;
  densidad: string;
  ieNombre: string;
  ieCodigo: string;
  nivel: string;
  estudiantes: number;
  dre: string;
  ugel: string;
  region: string;
  provincia: string;
  distrito: string;
  area: string;
  isEIB: boolean;
  eibTipo: string;
  lengua: string;
  especialidad: string;
  modulo: string;
  director: string;
  coordinador: string;
  titulo: string;
  tematica1: string;
  comp1: string;
  comp2: string;
  semillaProb: string;
  semillaSol: string;
  hasCustomProb: boolean;
  hasCustomSol: boolean;
  fin: FinancialRules;
  profile: ProblemProfile;
}

function normalizeTextForMatch(text: string): string {
  return (text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function cleanProblemSummary(rawProb: string, fallback: string): string {
  const cleaned = (rawProb || '').trim().replace(/\s+/g, ' ').replace(/[.]+$/, '');
  return cleaned || fallback;
}

function isFactoryDefaultCompetencias(competencias: string[]): boolean {
  if (!competencias || competencias.length === 0) return true;
  if (competencias.length !== 2) return false;
  return (
    competencias[0] === COMPETENCIAS_CNEB[7] &&
    competencias[1] === COMPETENCIAS_CNEB[22]
  );
}

function isFactoryDefaultTematicas(tematicas: string[]): boolean {
  if (!tematicas || tematicas.length === 0) return true;
  return tematicas.length === 1 && tematicas[0] === TEMATICAS_CNPIE[0];
}

export function detectProblemDomain(problemaText: string, proj: ProjectModel): ProblemDomainId {
  const norm = normalizeTextForMatch(problemaText);
  const isSft = proj.category === '2C' || proj.modalidad === 'MSE_SFT';
  const isEib =
    proj.modalidad === 'EIB_AMAZ' ||
    Boolean(proj.ie.eib_tipo && proj.ie.eib_tipo !== 'No aplica');

  if (!norm) {
    if (isSft) return 'sft_productivo';
    if (isEib) return 'eib';
    return 'general';
  }

  const scoreKeywords = (patterns: Array<[RegExp, number]>): number =>
    patterns.reduce((sum, [re, weight]) => (re.test(norm) ? sum + weight : sum), 0);

  const scores: Record<Exclude<ProblemDomainId, 'general'>, number> = {
    lectura: scoreKeywords([
      [/comprension lectora|lectura|lector|lectoescritura/, 4],
      [/produccion de textos|escritura|redaccion|ortografia|oralidad|expresion oral/, 4],
      [/\bleer\b|\btextos\b|vocabulario|cuento|narrativ|fluidez verbal|comunicacion/, 2],
    ]),
    matematica: scoreKeywords([
      [/matemat|resolucion de problemas|razonamiento matematico|competencia matematica/, 5],
      [/calculo|fraccion|geometria|cantidad|regularidad|equivalencia|estadistica|numer/, 3],
      [/abaco|regleta|conteo|operaciones basicas|datos e incertidumbre/, 3],
    ]),
    ambiente: scoreKeywords([
      [/ambiental|ecolog|biohuerto|residuos|reciclaj|cambio climatico|gestion del riesgo/, 4],
      [/agua|contamin|biodiversidad|agroecolog|compost|forest|huerto escolar|suelo/, 3],
    ]),
    ciencia: scoreKeywords([
      [/indagacion cientifica|metodo cientifico|experimento|laboratorio|hipotesis/, 5],
      [/ciencias|tecnologia escolar|explica el mundo fisico|observacion cientifica|feria de ciencia/, 3],
    ]),
    convivencia: scoreKeywords([
      [/convivencia|socioemocional|bullying|violencia|acoso escolar|mediacion/, 5],
      [/autoestima|tutoria|bienestar|emocion|ciudadania|democrati|conflicto|desercion|asistencia/, 3],
    ]),
    tic_digital: scoreKeywords([
      [/pensamiento computacional|robotica|programacion|inteligencia artificial|\bia\b/, 5],
      [/\btic\b|competencia digital|entornos virtuales|brecha digital|multimedia|podcast|audiovisual/, 3],
    ]),
    arte_cultura: scoreKeywords([
      [/artist|musica|danza|teatro|pintura|patrimonio|cultura local|identidad cultural|mural/, 4],
    ]),
    salud_fisica: scoreKeywords([
      [/educacion fisica|vida activa|alimentacion saludable|nutricion|anemia|lonchera|sobrepeso|sedentarismo|motricidad|deporte escolar|habitos saludables/, 5],
    ]),
    inclusion: scoreKeywords([
      [/inclusion|inclusiv|\bdua\b|discapacidad|necesidades educativas|\bnee\b|\bebe\b|braille|lengua de senas|cebe|saanee/, 5],
    ]),
    eib: scoreKeywords([
      [/\beib\b|bilingue|lengua originaria|quechua|aimara|aymara|ashaninka|awajun|shipibo|yachaq/, 4],
      [/intercultural|dialogo de saberes|saberes ancestrales/, 3],
    ]),
    sft_productivo: scoreKeywords([
      [/\bsft\b|\bcnof\b|\bept\b|formacion tecnica|taller productivo|emprendimiento|educacion financiera/, 5],
      [/prototipo|agroindustria|carpinteria|confeccion|textil|gastronomia|soldadura|control de calidad|usuarios reales/, 3],
    ]),
    gestion_evaluacion: scoreKeywords([
      [/evaluacion formativa|retroalimentacion|autonomia|metacognicion|liderazgo pedagogico|comunidad profesional|\bcpa\b|multigrado|unidocente|eba|educacion basica alternativa/, 4],
      [/gestion escolar|trabajo colegiado|monitoreo pedagogico|retraso escolar|desercion/, 3],
    ]),
  };

  if (isSft) scores.sft_productivo += 3;
  if (isEib) scores.eib += 2;

  let bestDomain: ProblemDomainId = 'general';
  let bestScore = 0;

  (Object.keys(scores) as Array<Exclude<ProblemDomainId, 'general'>>).forEach((dom) => {
    if (scores[dom] > bestScore) {
      bestScore = scores[dom];
      bestDomain = dom;
    }
  });

  if (bestScore === 0) {
    if (isSft) return 'sft_productivo';
    if (isEib) return 'eib';
  }
  return bestDomain;
}

export function inferProblemProfile(problemaText: string, proj: ProjectModel): ProblemProfile {
  const ie = proj.ie.nombre?.trim() || 'la Institución Educativa';
  const dist = proj.ie.distrito?.trim() || 'la localidad';
  const region = proj.ie.region?.trim() || 'la región';
  const nivel = proj.ie.nivel || 'Educación Básica';
  const est = proj.ie.estudiantes || 120;
  const lengua = proj.ie.lengua?.trim() || 'lengua originaria local';
  const especialidad = proj.ie.especialidad?.trim() || 'Formación Técnica';
  const modulo = proj.ie.modulo?.trim() || 'Módulo Formativo CNOF';
  const director = proj.equipo.director.nombre?.trim() || 'el/la Director(a) de la IE';
  const coordinador = proj.equipo.coordinador.nombre?.trim() || 'el/la Docente Coordinador(a)';
  const isEib =
    proj.modalidad === 'EIB_AMAZ' ||
    Boolean(proj.ie.eib_tipo && proj.ie.eib_tipo !== 'No aplica');

  const domain = detectProblemDomain(problemaText, proj);
  const problemCore = cleanProblemSummary(
    problemaText,
    `Brecha de aprendizaje en las competencias priorizadas de los ${est} estudiantes de ${ie}`
  );
  const shortCore =
    problemCore.length > 135 ? `${problemCore.slice(0, 132).trim()}...` : problemCore;

  const parseComp = (c?: string) =>
    c && c.includes(':') ? c.split(':')[1].trim() : c || 'competencias priorizadas del CNEB';

  const makeTitleSuffix = (base: string) =>
    proj.category === '2D'
      ? `Investigación-Acción Participativa: ${base}`
      : base;

  const domainConfigs: Record<ProblemDomainId, Omit<ProblemProfile, 'domain' | 'problemCore'>> = {
    lectura: {
      domainLabel: 'Comprensión lectora, oralidad y producción textual',
      tematicas: [TEMATICAS_CNPIE[0], TEMATICAS_CNPIE[12]],
      competencias: [COMPETENCIAS_CNEB[8], COMPETENCIAS_CNEB[9], COMPETENCIAS_CNEB[7]],
      suggestedTitle: makeTitleSuffix(
        `Tertulias Vivas y Bibliotecas Territoriales para fortalecer la lectura y escritura en ${dist}`
      ),
      suggestedSolution: `Implementación de tertulias literarias dialógicas, bibliotecas itinerantes contextualizadas con relatos de ${dist} y talleres de producción textual con portafolios y retroalimentación formativa.`,
      causasDirectas: [
        `Causa Directa 1 (Didáctica de Lectura): Predominio de lectura mecánica literal con escasa mediación inferencial, crítica y dialógica.`,
        `Causa Directa 2 (Pertinencia Textual): Escasez de textos culturalmente cercanos a las vivencias, historia y saberes de ${dist}.`,
        `Causa Directa 3 (Expresión y Recursos): Limitado tiempo escolar dedicado a la oralidad argumentada, clubes de lectura y escritura con propósito comunicativo.`,
      ],
      causasIndirectas: [
        `Causa Indirecta 1.1: Escasa formación colegiada en estrategias de comprensión lectora profunda y evaluación formativa de textos.`,
        `Causa Indirecta 2.1: Bibliotecas de aula desactualizadas o desconectadas de la identidad cultural de ${region}.`,
        `Causa Indirecta 3.1: Débil acompañamiento familiar en hábitos cotidianos de lectura compartida en el hogar.`,
      ],
      efectosDirectos: [
        `Efecto Directo 1: Alto porcentaje de estudiantes en nivel Inicio al inferir, interpretar e integrar información de textos escritos.`,
        `Efecto Directo 2: Dificultad para planificar, redactar y revisar textos propios con cohesión, coherencia y vocabulario pertinente.`,
        `Efecto Directo 3: Inseguridad comunicativa al sustentar ideas oralmente frente a sus pares y comunidad.`,
      ],
      efectoFinal: `Rezago sostenido en las competencias comunicativas del CNEB que limita el aprendizaje en todas las áreas curriculares de ${est} estudiantes de ${ie}.`,
      objetivosEspecificos: [
        `OE1 (Mediación Lectora): Implementar tertulias dialógicas y estrategias de lectura inferencial-crítica en el 100% de aulas de ${nivel} durante 2027.`,
        `OE2 (Bibliotecas Vivas): Implementar rincones de lectura contextualizados y talleres de edición de textos locales en ${dist} durante 2027.`,
        `OE3 (Comunidad Lectora): Involucrar al equipo docente y familias de ${ie} en maratones y ferias de lectura con acompañamiento formativo.`,
      ],
      mediosAccion: [
        `Medio 1.1: Talleres colegiados en didáctica de comprensión lectora, escritura creativa y rúbricas comunicativas.`,
        `Medio 2.1: Dotación de acervo bibliográfico contextualizado, kamishibai y materiales de edición escolar.`,
        `Medio 3.1: Jornadas mensuales de lectura en familia y círculos comunicativos interaulas.`,
      ],
      metaObjetivoGeneral: `Revertir la brecha de comprensión lectora y producción textual en los ${est} estudiantes de ${ie}`,
      metodologiaFundamento: `Enfoque comunicativo textual del CNEB, lectura dialógica y proceso recursivo de escritura con propósito social`,
      fasesMetodologicas: [
        `Fase 1 - Exploración y Diagnóstico Lector: Identifican textos auténticos de ${dist} y reconocen propósitos comunicativos reales.`,
        `Fase 2 - Tertulias Dialógicas e Indagación Textual: Leen de forma compartida formulando inferencias, posturas críticas y glosarios situados.`,
        `Fase 3 - Taller de Producción y Retroalimentación: Planifican, textualizan y revisan sus escritos con rúbricas amigables entre pares y docente.`,
        `Fase 4 - Edición y Socialización Comunitaria: Publican antologías o narraciones locales en ferias lectoras ante familias y aliados.`,
      ],
      rupturasInnovadoras: [
        `De fichas literales aisladas a tertulias dialógicas con textos vivos del territorio de ${dist}.`,
        `De copia mecánica a talleres de escritura creativa con destinatarios reales de la comunidad.`,
        `De calificación numérica tardía a portafolios de lectura y rúbricas de autoevaluación progresiva.`,
        `Integración de oralidad, narración escénica y recopilación de memoria oral familiar.`,
      ],
      necesidadesEstudiantes: [
        `Necesidad de libros ilustrados, relatos cercanos y textos vinculados a su vida diaria en ${dist} (82%).`,
        `Interés por espacios seguros para expresarse oralmente, dramatizar y debatir sin temor (76%).`,
        `Demanda de acompañamiento cercano al redactar cuentos, crónicas y textos informativos (74%).`,
        `Motivación por producir periódicos escolares, fanzines o audiorrelatos propios (79%).`,
      ],
      demandasTerritorio: [
        `Recopilación y preservación escrita de la historia oral, mitos y costumbres de ${dist}.`,
        `Fortalecimiento de la comunicación familiar intergeneracional mediante lectura compartida en casa.`,
        `Participación de cronistas, sabios locales y bibliotecas comunales de ${region}.`,
        `Uso pertinente del castellano y/o lengua originaria en eventos cívicos y culturales del distrito.`,
      ],
      cuadroAActividades: [
        {
          fase: 'OE1 · Preparación',
          actividad: `Diagnóstico lector inicial y taller docente en estrategias de comprensión inferencial y escritura`,
          evidencia: 'Línea de base lectora 2027, actas colegiadas y PCI actualizado',
          responsable: `${director} y ${coordinador}`,
          plazo: 'Mar - Abr 2027',
        },
        {
          fase: 'OE2 · Implementación',
          actividad: `Implementación de bibliotecas vivas de aula, kamishibai y cuadernos de edición textual en ${dist}`,
          evidencia: 'Inventario bibliográfico, pecosas y guías de tertulias dialógicas',
          responsable: `${director} y Comité`,
          plazo: 'May - Jun 2027',
        },
        {
          fase: 'OE1 · Ejecución Aula',
          actividad: `Ejecución semanal de tertulias literarias, círculos de oralidad y talleres de producción de textos`,
          evidencia: 'Portafolios de textos producidos y rúbricas de fluidez y comprensión',
          responsable: 'Docentes de aula',
          plazo: 'Jun - Oct 2027',
        },
        {
          fase: 'OE3 · Comunidad',
          actividad: `Maratones de lectura con familias, recopilación con sabios locales y monitoreo docente (2 hitos)`,
          evidencia: 'Antologías familiares, fichas de monitoreo y actas de compromiso',
          responsable: `${coordinador} y APAFA`,
          plazo: 'Jul - Nov 2027',
        },
        {
          fase: 'OE3 · Cierre y Difusión',
          actividad: `Festival Distrital del Libro Escolar, evaluación lectora comparativa y sistematización`,
          evidencia: 'Informe comparativo Entrada vs. Salida, antología impresa y video',
          responsable: 'Equipo responsable',
          plazo: 'Nov - Dic 2027',
        },
      ],
      cuadroBDescs: {
        bien1: `Acervo bibliográfico contextualizado, teatrines kamishibai, láminas narrativas y kits de producción textual`,
        bien2: `Grabadoras digitales/equipos de audio para clubes de lectura, audiorrelatos y estanterías móviles de aula`,
        serv1: `Taller especializado para docentes en didáctica de comprensión lectora inferencial y evaluación formativa`,
        serv2: `Impresión de antologías estudiantiles, guías de tertulias dialógicas y festival lector de cierre 2027`,
      },
      instrumentHighlights: {
        diagnostico: `Evaluación diagnóstica de niveles literal, inferencial y crítico más velocidad y coherencia escrita`,
        voz: `82% solicita textos cercanos a ${dist} y 76% pide clubes de narración y debate dialogado`,
        rubrica: `Evalúa inferencia global, postura crítica y cohesión/coherencia al producir textos contextualizados`,
        guionExtra: `Escenas en biblioteca viva, estudiantes liderando tertulia dialógica y lectura con familias`,
      },
    },
    matematica: {
      domainLabel: 'Resolución de problemas matemáticos y razonamiento lógico',
      tematicas: [TEMATICAS_CNPIE[0], TEMATICAS_CNPIE[12]],
      competencias: [COMPETENCIAS_CNEB[18], COMPETENCIAS_CNEB[19], COMPETENCIAS_CNEB[21]],
      suggestedTitle: makeTitleSuffix(
        `Matemática Viva y Material Concreto Territorial para resolver problemas cotidianos en ${dist}`
      ),
      suggestedSolution: `Implementación de talleres de matemática contextualizada bajo el enfoque Concreto-Pictórico-Abstracto (CPA), regletas/kits manipulativos y retos matemáticos vinculados al comercio, medición y producción local de ${dist}.`,
      causasDirectas: [
        `Causa Directa 1 (Metodología Mecánica): Enseñanza centrada en algoritmos repetitivos y memorización de fórmulas sin comprensión del problema.`,
        `Causa Directa 2 (Falta de Material Concreto): Escaso tránsito por la etapa vivencial y manipulativa previa a la simbolización abstracta.`,
        `Causa Directa 3 (Descontextualización): Situaciones problemáticas ajenas a las prácticas reales de medición, comercio y cálculo de ${dist}.`,
      ],
      causasIndirectas: [
        `Causa Indirecta 1.1: Limitado dominio docente del enfoque centrado en la resolución de problemas (Polya / CPA) y error constructivo.`,
        `Causa Indirecta 2.1: Carencia de kits estructurados (Base 10, regletas, geoplanos, balanzas) suficientes en las aulas de ${ie}.`,
        `Causa Indirecta 3.1: Ansiedad matemática y baja autoconfianza estudiantil frente a problemas retadores.`,
      ],
      efectosDirectos: [
        `Efecto Directo 1: Más del 58% de estudiantes en nivel Inicio al traducir situaciones reales a expresiones numéricas o algebraicas.`,
        `Efecto Directo 2: Dificultad para seleccionar estrategias heurísticas y argumentar procedimientos matemáticos propios.`,
        `Efecto Directo 3: Desinterés hacia el área de Matemática percibida como abstracta y desconectada de la vida cotidiana.`,
      ],
      efectoFinal: `Brecha persistente en competencias matemáticas que dificulta el razonamiento lógico y la toma de decisiones cotidianas en ${est} estudiantes de ${ie}.`,
      objetivosEspecificos: [
        `OE1 (Enfoque CPA): Aplicar la secuencia vivencial-concreta-pictórica-simbólica en el 100% de sesiones de Matemática en ${nivel} durante 2027.`,
        `OE2 (Laboratorios Matemáticos): Equipar aulas con kits manipulativos y cuadernos de retos contextualizados a la economía y espacio de ${dist}.`,
        `OE3 (Comunidad Matemática): Consolidar círculos colegiados docentes y ferias de juegos y retos matemáticos con participación familiar.`,
      ],
      mediosAccion: [
        `Medio 1.1: Capacitación docente en metodología de resolución de problemas, enfoque CPA y tratamiento pedagógico del error.`,
        `Medio 2.1: Adquisición y creación de material concreto estructurado y regletas contextualizadas.`,
        `Medio 3.1: Olimpiadas lúdicas internas y retos matemáticos aplicados con familias de ${dist}.`,
      ],
      metaObjetivoGeneral: `Fortalecer la competencia matemática y el razonamiento lógico de los ${est} estudiantes de ${ie}`,
      metodologiaFundamento: `Enfoque centrado en la resolución de problemas del CNEB, método Polya y secuencia Concreto-Pictórico-Abstracto (CPA)`,
      fasesMetodologicas: [
        `Fase 1 - Comprensión Situada del Reto: Analizan una situación real de ${dist} (feria, siembra, presupuesto o medición) e identifican datos clave.`,
        `Fase 2 - Manipulación y Representación Concreta: Exploran con material Base 10, regletas, balanzas o geoplanos probando distintas rutas.`,
        `Fase 3 - Simbolización y Argumentación: Traducen sus hallazgos a gráficos y modelos matemáticos, debatiendo errores constructivamente.`,
        `Fase 4 - Transferencia y Metacognición: Aplican lo aprendido a nuevos retos comunitarios y explican sus estrategias en ferias matemáticas.`,
      ],
      rupturasInnovadoras: [
        `De mecanizar algoritmos sin sentido a comprender y modelar problemas reales de ${dist}.`,
        `De pizarra exclusivamente simbólica al tránsito riguroso Concreto → Pictórico → Abstracto.`,
        `Del castigo del error a la retroalimentación reflexiva que convierte el error en oportunidad de aprendizaje.`,
        `Integración de juegos lógicos, presupuestos reales y geometría del entorno local.`,
      ],
      necesidadesEstudiantes: [
        `Necesidad de manipular objetos concretos para comprender operaciones, fracciones y medidas (84%).`,
        `Interés por aprender mediante juegos de ingenio, retos en equipo y ferias lúdicas (79%).`,
        `Demanda de problemas vinculados al comercio, cocina, chacra o presupuesto real (74%).`,
        `Necesidad de acompañamiento paciente para explicar cómo resolvieron un problema sin miedo a equivocarse (72%).`,
      ],
      demandasTerritorio: [
        `Cálculo práctico, estimación de costos y registro contable básico en emprendimientos familiares de ${dist}.`,
        `Medición de áreas, volúmenes y patrones geométricos presentes en artesanía y agricultura local.`,
        `Interpretación de datos estadísticos reales sobre clima, producción o salud de ${region}.`,
        `Reducción de la brecha numérica que condiciona el rendimiento secundario y técnico.`,
      ],
      cuadroAActividades: [
        {
          fase: 'OE1 · Preparación',
          actividad: `Diagnóstico de competencias matemáticas y taller docente en enfoque CPA y heurística de Polya`,
          evidencia: 'Mapa de calor diagnóstico, unidades CPA y actas colegiadas',
          responsable: `${director} y ${coordinador}`,
          plazo: 'Mar - Abr 2027',
        },
        {
          fase: 'OE2 · Implementación',
          actividad: `Dotación de kits Base 10, regletas, geoplanos, balanzas y tableros lógicos en las aulas`,
          evidencia: 'Pecosas, inventario de laboratorio matemático y guías de uso',
          responsable: `${director} y Comité`,
          plazo: 'May - Jun 2027',
        },
        {
          fase: 'OE1 · Ejecución Aula',
          actividad: `Talleres semanales de resolución de problemas situados y modelamiento con material concreto`,
          evidencia: 'Cuadernos de estrategias, rúbricas de argumentación y evidencias',
          responsable: 'Docentes de aula',
          plazo: 'Jun - Oct 2027',
        },
        {
          fase: 'OE3 · Comunidad',
          actividad: `Tienditas escolares/retos familiares de cálculo y monitoreo docente en aula (2 momentos)`,
          evidencia: 'Fichas de monitoreo, registros de actividad y fotos',
          responsable: `${coordinador} y APAFA`,
          plazo: 'Jul - Nov 2027',
        },
        {
          fase: 'OE3 · Cierre y Difusión',
          actividad: `Feria Matemática Abierta, evaluación comparativa de salida y sistematización de retos`,
          evidencia: 'Cuadro comparativo de logros, banco de problemas locales y video',
          responsable: 'Equipo responsable',
          plazo: 'Nov - Dic 2027',
        },
      ],
      cuadroBDescs: {
        bien1: `Kits manipulativos matemáticos (Base 10, regletas Cuisenaire, fracciones circulares, geoplanos y balanzas)`,
        bien2: `Juegos lógicos de mesa, cintas métricas, sólidos geométricos y calculadoras/tablets de verificación`,
        serv1: `Taller especializado para docentes en didáctica de resolución de problemas y enfoque CPA`,
        serv2: `Impresión de cuadernos de retos matemáticos de ${dist} y organización de Feria Matemática 2027`,
      },
      instrumentHighlights: {
        diagnostico: `Diagnóstico diferenciado en cantidad, regularidad/equivalencia, geometría y gestión de datos`,
        voz: `84% pide material manipulativo concreto y 79% prefiere retos lúdicos y problemas cotidianos`,
        rubrica: `Evalúa traducción del enunciado, uso de estrategias heurísticas y argumentación de resultados`,
        guionExtra: `Estudiantes manipulando regletas/balanzas y explicando la solución de un reto comercial real`,
      },
    },
    ambiente: {
      domainLabel: 'Educación ambiental, biohuertos y gestión sostenible',
      tematicas: [TEMATICAS_CNPIE[3], TEMATICAS_CNPIE[1]],
      competencias: [COMPETENCIAS_CNEB[3], COMPETENCIAS_CNEB[22], COMPETENCIAS_CNEB[23]],
      suggestedTitle: makeTitleSuffix(
        `Eco-Laboratorios y Biohuerto Escolar Sostenible para la conciencia ambiental en ${dist}`
      ),
      suggestedSolution: `Implementación de biohuertos agroecológicos escolares, estaciones de segregación/compostaje y brigadas ambientales de indagación que integran el cuidado del ambiente con aprendizajes científicos del CNEB.`,
      causasDirectas: [
        `Causa Directa 1 (Práctica Teórica): Enseñanza ambiental desvinculada de acciones prácticas de conservación, manejo de residuos y cultivo sostenible.`,
        `Causa Directa 2 (Infraestructura Eco-Pedagógica): Ausencia de espacios vivos (biohuertos, composteras, puntos ecológicos) implementados como aulas abiertas.`,
        `Causa Directa 3 (Cultura Ambiental): Débil hábito de segregación responsable, ahorro de agua y gestión del riesgo climático en escuela y hogar.`,
      ],
      causasIndirectas: [
        `Causa Indirecta 1.1: Escasa articulación transversal del enfoque ambiental en las unidades y proyectos de aprendizaje del PCI.`,
        `Causa Indirecta 2.1: Falta de herramientas agrícolas escolares, kits de compostaje y contenedores diferenciados.`,
        `Causa Indirecta 3.1: Limitada organización de brigadas ecoambientales estudiantiles con apoyo familiar.`,
      ],
      efectosDirectos: [
        `Efecto Directo 1: Bajo logro en la gestión responsable del espacio y el ambiente y en indagación científica escolar.`,
        `Efecto Directo 2: Acumulación inadecuada de residuos orgánicos e inorgánicos en los patios y entorno escolar.`,
        `Efecto Directo 3: Escaso compromiso activo frente a problemas ambientales y cambio climático en ${dist}.`,
      ],
      efectoFinal: `Débil ciudadanía ambiental y bajo aprovechamiento formativo de los recursos naturales en ${est} estudiantes de ${ie}.`,
      objetivosEspecificos: [
        `OE1 (Pedagogía Eco-Activa): Incorporar proyectos de indagación ambiental y aprendizaje-servicio en el 100% de grados de ${ie} durante 2027.`,
        `OE2 (Espacios Vivos): Implementar un biohuerto pedagógico, estación de compostaje y puntos ecológicos de segregación en ${ie}.`,
        `OE3 (Brigadas y Familias): Formar brigadas ecoambientales estudiantiles y articular prácticas sostenibles con familias y aliados de ${dist}.`,
      ],
      mediosAccion: [
        `Medio 1.1: Unidades didácticas ecoambientales vinculadas al calendario agrícola y de gestión del riesgo.`,
        `Medio 2.1: Equipamiento con herramientas de biohuerto, riego eficiente, compostera y medidores ambientales.`,
        `Medio 3.1: Campañas de eco-canje, faenas familiares y pasantías ambientales distritales.`,
      ],
      metaObjetivoGeneral: `Fortalecer la conciencia ambiental y las competencias científicas y territoriales en los ${est} estudiantes de ${ie}`,
      metodologiaFundamento: `Enfoque ambiental del CNEB, aprendizaje basado en proyectos socioambientales e indagación científica en campo`,
      fasesMetodologicas: [
        `Fase 1 - Diagnóstico Eco-Escolar: Mapean puntos críticos de residuos, agua y áreas verdes dentro y fuera de ${ie}.`,
        `Fase 2 - Indagación y Diseño Sostenible: Investigan tipos de suelo, abonos orgánicos y ciclos de cultivo aplicando el método científico.`,
        `Fase 3 - Acción en Biohuerto y Reciclaje: Gestionan camas agroecológicas, composteras y estaciones de segregación registrando datos semanales.`,
        `Fase 4 - Feria Verde y Réplica Familiar: Socializan cosechas saludables, bioabono y propuestas de mitigación ambiental con ${dist}.`,
      ],
      rupturasInnovadoras: [
        `De láminas ambientales teóricas a aulas vivas al aire libre en biohuertos y composteras reales.`,
        `De limpieza pasiva a brigadas estudiantiles que miden residuos reciclados y calidad de suelo.`,
        `Diálogo de saberes agrícolas locales con conocimientos científicos del CNEB.`,
        `Economía circular escolar: los residuos orgánicos nutren el huerto saludable institucional.`,
      ],
      necesidadesEstudiantes: [
        `Deseo de aprender cultivando, cuidando plantas y experimentando fuera del aula cerrada (85%).`,
        `Preocupación por mantener la escuela limpia, libre de plásticos y con áreas verdes vivas (78%).`,
        `Interés por investigar sobre el agua, abonos orgánicos y especies nativas de ${region} (75%).`,
        `Motivación por liderar brigadas ecológicas y ferias verdes ante sus familias (73%).`,
      ],
      demandasTerritorio: [
        `Mitigación de residuos sólidos y recuperación de suelos en el ámbito de ${dist}.`,
        `Seguridad alimentaria escolar y revalorización de cultivos nativos resilientes al clima de ${region}.`,
        `Uso responsable del recurso hídrico mediante técnicas de riego tecnificado o artesanal.`,
        `Articulación con municipalidad distrital y agricultores/sabios locales en educación ambiental.`,
      ],
      cuadroAActividades: [
        {
          fase: 'OE1 · Preparación',
          actividad: `Diagnóstico ecoambiental participativo, zonificación del biohuerto y taller docente interdisciplinario`,
          evidencia: 'Diagnóstico ambiental escolar, plano de espacios y PCI actualizado',
          responsable: `${director} y ${coordinador}`,
          plazo: 'Mar - Abr 2027',
        },
        {
          fase: 'OE2 · Implementación',
          actividad: `Instalación de biohuerto escolar, sistema de riego, composteras y estaciones de segregación`,
          evidencia: 'Pecosas, inventario de herramientas ecológicas y espacio instalado',
          responsable: `${director} y APAFA`,
          plazo: 'May - Jun 2027',
        },
        {
          fase: 'OE1 · Ejecución Aula',
          actividad: `Proyectos de indagación sobre suelos, germinación, compostaje y consumo responsable`,
          evidencia: 'Bitácoras de campo ambientales, registros de medición y rúbricas',
          responsable: 'Docentes y brigadas',
          plazo: 'Jun - Oct 2027',
        },
        {
          fase: 'OE3 · Comunidad',
          actividad: `Faenas agroecológicas con familias/sabios locales y monitoreo pedagógico en campo (2 hitos)`,
          evidencia: 'Actas de faenas, fichas de monitoreo y alianzas comunales',
          responsable: `${coordinador} y Brigadas`,
          plazo: 'Jul - Nov 2027',
        },
        {
          fase: 'OE3 · Cierre y Difusión',
          actividad: `Feria Eco-Pedagógica, cosecha comunitaria y sistematización de guía ambiental escolar`,
          evidencia: 'Informe de impacto ambiental, guía práctica y video demostrativo',
          responsable: 'Equipo responsable',
          plazo: 'Nov - Dic 2027',
        },
      ],
      cuadroBDescs: {
        bien1: `Herramientas de biohuerto escolar, semillas nativas, mallas, mangueras de riego y kits de compostaje`,
        bien2: `Contenedores diferenciados de reciclaje, kits de análisis de agua/suelo y lupas/termómetros de campo`,
        serv1: `Asistencia técnica en agroecología escolar y capacitación docente en enfoque ambiental e indagación`,
        serv2: `Acondicionamiento de cerco/camas de cultivo, impresión de guías ecoambientales y Feria Verde 2027`,
      },
      instrumentHighlights: {
        diagnostico: `Línea de base de competencia ambiental (C4), indagación (C23) y volumen semanal de residuos segregados`,
        voz: `85% demanda aprendizaje vivencial al aire libre y 78% propone brigadas de reciclaje y áreas verdes`,
        rubrica: `Evalúa formulación de soluciones sostenibles, registro empírico en biohuerto y argumentación ecológica`,
        guionExtra: `Tomas en biohuerto escolar, brigadas midiendo pH/compostaje y faena con familias de ${dist}`,
      },
    },
    ciencia: {
      domainLabel: 'Indagación científica y experimentación escolar',
      tematicas: [TEMATICAS_CNPIE[1], TEMATICAS_CNPIE[3]],
      competencias: [COMPETENCIAS_CNEB[22], COMPETENCIAS_CNEB[23], COMPETENCIAS_CNEB[24]],
      suggestedTitle: makeTitleSuffix(
        `Clubes de Indagación Científica y Laboratorios Territoriales en ${dist}`
      ),
      suggestedSolution: `Implementación de laboratorios vivos de indagación escolar equipados con kits experimentales portátiles para que los estudiantes formulen hipótesis, controlen variables, recolecten datos reales de ${dist} y comuniquen conclusiones.`,
      causasDirectas: [
        `Causa Directa 1 (Enseñanza Descriptiva): Sesiones de Ciencia centradas en dictado de definiciones sin experimentación ni contraste de hipótesis.`,
        `Causa Directa 2 (Escasez de Laboratorio): Limitada disponibilidad de instrumentos de medición, lupas, microscopios y reactivos seguros.`,
        `Causa Directa 3 (Desconexión Territorial): Escasa problematización de fenómenos naturales, flora, agua y tecnología presentes en ${dist}.`,
      ],
      causasIndirectas: [
        `Causa Indirecta 1.1: Necesidad de fortalecer capacidades docentes en los cinco procesos de la indagación científica del CNEB.`,
        `Causa Indirecta 2.1: Espacios o módulos de ciencia inoperativos o sin protocolos de experimentación segura.`,
        `Causa Indirecta 3.1: Falta de ferias científicas formativas que valoren el proceso investigativo sobre la maqueta decorativa.`,
      ],
      efectosDirectos: [
        `Efecto Directo 1: Más del 60% de estudiantes en nivel Inicio al problematizar situaciones y diseñar estrategias de indagación.`,
        `Efecto Directo 2: Dificultad para registrar datos empíricos en tablas/gráficos y construir conclusiones basadas en evidencias.`,
        `Efecto Directo 3: Confusión entre repetición memorística y pensamiento científico crítico.`,
      ],
      efectoFinal: `Limitado desarrollo de la alfabetización científica y tecnológica en los ${est} estudiantes de ${ie}.`,
      objetivosEspecificos: [
        `OE1 (Ciclo Indagatorio): Implementar los 5 procesos de indagación científica y diseño tecnológico en las unidades de ${nivel} durante 2027.`,
        `OE2 (Laboratorio Vivo): Equipar rincones y maletas científicas portátiles con protocolos contextualizados a fenómenos de ${dist}.`,
        `OE3 (Cultura Científica): Institucionalizar clubes de jóvenes investigadores y ferias de ciencia basadas en evidencia empírica.`,
      ],
      mediosAccion: [
        `Medio 1.1: Talleres colegiados sobre indagación científica, control de variables y prototipado tecnológico.`,
        `Medio 2.1: Adquisición de kits de laboratorio escolar, microscopía básica, sensores y bitácoras científicas.`,
        `Medio 3.1: Encuentros científicos escolares e intercambio con institutos o aliados técnicos de ${region}.`,
      ],
      metaObjetivoGeneral: `Desarrollar las competencias de indagación y explicación científica en los ${est} estudiantes de ${ie}`,
      metodologiaFundamento: `Enfoque de Indagación y Alfabetización Científica y Tecnológica del CNEB`,
      fasesMetodologicas: [
        `Fase 1 - Problematización e Hipótesis: Observan fenómenos reales de ${dist}, identifican variables y plantean preguntas investigables.`,
        `Fase 2 - Diseño Experimental y Toma de Datos: Manipulan instrumentos del laboratorio portátil registrando mediciones con rigor.`,
        `Fase 3 - Análisis de Evidencias y Contrastación: Comparan resultados con sus hipótesis y literatura científica construyendo explicaciones.`,
        `Fase 4 - Comunicación Científica: Defienden sus cuadernos de campo e informes en ferias científicas y jornadas abiertas.`,
      ],
      rupturasInnovadoras: [
        `De copiar resúmenes del libro a experimentar fenómenos reales con control de variables.`,
        `De maquetas estáticas decorativas a investigaciones genuinas con datos y cuadernos de campo.`,
        `Articulación del conocimiento científico universal con fenómenos y biodiversidad de ${region}.`,
        `Uso de rúbricas de indagación científica y retroalimentación entre pares investigadores.`,
      ],
      necesidadesEstudiantes: [
        `Interés por realizar experimentos reales, usar microscopios, lupas y medir variables (86%).`,
        `Curiosidad por explicar fenómenos locales como agua, plantas medicinales, suelos y energía (80%).`,
        `Necesidad de guía práctica para registrar tablas, gráficos y redactar conclusiones (74%).`,
        `Deseo de exponer hallazgos propios en ferias científicas escolares (76%).`,
      ],
      demandasTerritorio: [
        `Estudio escolar de recursos hídricos, flora nativa y problemáticas tecnológicas de ${dist}.`,
        `Fomento de vocaciones científicas y tecnológicas tempranas en estudiantes de ${region}.`,
        `Integración respetuosa de saberes locales con validación experimental científica.`,
        `Vinculación con redes académicas, universidades o centros tecnológicos regionales.`,
      ],
      cuadroAActividades: [
        {
          fase: 'OE1 · Preparación',
          actividad: `Diagnóstico de competencias científicas y taller docente en indagación y diseño tecnológico`,
          evidencia: 'Línea de base C23-C25, protocolos de seguridad y unidades didácticas',
          responsable: `${director} y ${coordinador}`,
          plazo: 'Mar - Abr 2027',
        },
        {
          fase: 'OE2 · Implementación',
          actividad: `Adquisición e instalación de maletas de laboratorio portátil, microscopía y kits experimentales`,
          evidencia: 'Inventario de laboratorio, pecosas y manuales de práctica',
          responsable: `${director} y Comité`,
          plazo: 'May - Jun 2027',
        },
        {
          fase: 'OE1 · Ejecución Aula',
          actividad: `Sesiones experimentales semanales con registro en cuadernos de campo y prueba de prototipos`,
          evidencia: 'Cuadernos de campo científicos, gráficos y rúbricas de indagación',
          responsable: 'Docentes de aula',
          plazo: 'Jun - Oct 2027',
        },
        {
          fase: 'OE3 · Comunidad',
          actividad: `Jornadas de ciencia abierta con sabios/especialistas y monitoreo docente (2 hitos)`,
          evidencia: 'Fichas de monitoreo, actas de alianza y registros de laboratorio',
          responsable: `${coordinador} y Aliados`,
          plazo: 'Jul - Nov 2027',
        },
        {
          fase: 'OE3 · Cierre y Difusión',
          actividad: `Feria Escolar de Ciencia Viva, evaluación comparativa y publicación de compilado científico`,
          evidencia: 'Informes de investigación estudiantil, resultados y video',
          responsable: 'Equipo responsable',
          plazo: 'Nov - Dic 2027',
        },
      ],
      cuadroBDescs: {
        bien1: `Kits de laboratorio escolar (lupas binoculares/microscopios, balanzas digitales, termómetros y probetas)`,
        bien2: `Insumos experimentales seguros, kits de electrónica/energía básica y cuadernos de campo científicos`,
        serv1: `Taller especializado para docentes en metodología de indagación científica y diseño experimental`,
        serv2: `Impresión de guías de laboratorio contextualizadas y organización de Feria Científica 2027`,
      },
      instrumentHighlights: {
        diagnostico: `Diagnóstico por capacidades: problematiza, diseña estrategias, genera datos y evalúa conclusiones`,
        voz: `86% pide experimentos reales en laboratorio y 74% solicita guías claras para analizar datos`,
        rubrica: `Evalúa formulación de hipótesis contrastables, registro sistemático y sustento con evidencias`,
        guionExtra: `Estudiantes usando microscopios/sensores, registrando datos en cuaderno de campo y debatiendo`,
      },
    },
    convivencia: {
      domainLabel: 'Convivencia democrática, tutoría y bienestar socioemocional',
      tematicas: [TEMATICAS_CNPIE[6], TEMATICAS_CNPIE[2]],
      competencias: [COMPETENCIAS_CNEB[1], COMPETENCIAS_CNEB[0], COMPETENCIAS_CNEB[28]],
      suggestedTitle: makeTitleSuffix(
        `Círculos Restaurativos y Aulas de Bienestar Socioemocional para la convivencia en ${ie}`
      ),
      suggestedSolution: `Implementación de círculos de diálogo restaurativo, equipos de mediación escolar entre pares, rincones de autorregulación emocional y talleres vivenciales con familias para construir una convivencia democrática y segura.`,
      causasDirectas: [
        `Causa Directa 1 (Gestión Punitiva de Conflictos): Predominio de medidas sancionadoras o reactivas frente a conflictos escolares en lugar de prácticas restaurativas.`,
        `Causa Directa 2 (Regulación Emocional): Limitado desarrollo sistemático de habilidades socioemocionales (empatía, escucha activa y manejo de ira/estrés).`,
        `Causa Directa 3 (Vínculo Escuela-Familia): Escasos espacios de orientación socioafectiva compartida entre tutores y familias de ${dist}.`,
      ],
      causasIndirectas: [
        `Causa Indirecta 1.1: Poca capacitación docente en disciplina positiva, círculos restaurativos y protocolos del SíseVe.`,
        `Causa Indirecta 2.1: Carencia de espacios físicos acogedores y kits lúdicos de tutoría grupal e individual.`,
        `Causa Indirecta 3.1: Patrones de crianza autoritarios o sobrecarga laboral que dificultan el diálogo afectivo en casa.`,
      ],
      efectosDirectos: [
        `Efecto Directo 1: Frecuencia de conflictos interpersonales, agresiones verbales o exclusión entre pares en aulas y recreos.`,
        `Efecto Directo 2: Baja autoestima, inseguridad participativa y retraimiento que afecta la asistencia y el rendimiento académico.`,
        `Efecto Directo 3: Clima institucional tenso con escasa participación democrática estudiantil.`,
      ],
      efectoFinal: `Clima escolar desfavorable que vulnera el bienestar integral y frena el logro de aprendizajes en ${est} estudiantes de ${ie}.`,
      objetivosEspecificos: [
        `OE1 (Prácticas Restaurativas): Implementar círculos de diálogo y mediación escolar entre pares en el 100% de aulas de ${ie} durante 2027.`,
        `OE2 (Espacios de Bienestar): Acondicionar rincones socioemocionales y aplicar un programa lúdico de habilidades blandas y ciudadanía.`,
        `OE3 (Alianza Familiar): Realizar escuelas vivenciales para familias y articular la red de protección comunitaria en ${dist}.`,
      ],
      mediosAccion: [
        `Medio 1.1: Formación docente y de municipios escolares en justicia restaurativa y mediación pacífica.`,
        `Medio 2.1: Dotación de juegos cooperativos, tarjetas emocionales y espacios acogedores de tutoría.`,
        `Medio 3.1: Jornadas mensuales de vínculo afectivo familia-escuela con aliados locales de salud/DEMUNA.`,
      ],
      metaObjetivoGeneral: `Fortalecer la convivencia democrática y el bienestar socioemocional de los ${est} estudiantes de ${ie}`,
      metodologiaFundamento: `Enfoque de derechos, orientación educativa y convivencia escolar democrática del CNEB y prácticas restaurativas`,
      fasesMetodologicas: [
        `Fase 1 - Escucha y Termómetro de Clima: Aplican sociogramas y cartografías emocionales para identificar necesidades afectivas sin estigmatizar.`,
        `Fase 2 - Círculos de Palabra y Regulación: Realizan dinámicas cooperativas, reconocimiento emocional y acuerdos de aula consensuados.`,
        `Fase 3 - Mediación entre Pares y Tutoría Viva: Brigadas estudiantiles mediadoras acompañan la resolución dialogada de desacuerdos.`,
        `Fase 4 - Comunidad Protectora: Comparten logros de convivencia con familias en encuentros afectivos y ferias ciudadanas.`,
      ],
      rupturasInnovadoras: [
        `De sanciones verticales a acuerdos restaurativos construidos democráticamente por los estudiantes.`,
        `De charlas teóricas de valores a dinámicas vivenciales, juegos cooperativos y mediación estudiantil real.`,
        `Aulas emocionalmente seguras con rincones de calma y escucha empática cotidiana.`,
        `Corresponsabilidad activa de familias y aliados protectores de ${dist}.`,
      ],
      necesidadesEstudiantes: [
        `Necesidad de sentirse escuchados con respeto y sin burlas al expresar emociones o desacuerdos (85%).`,
        `Demanda de normas claras construidas juntos y recreos con juegos inclusivos cooperativos (80%).`,
        `Interés por asumir liderazgo positivo como mediadores escolares y delegados de bienestar (73%).`,
        `Necesidad de mayor cercanía, confianza y comunicación afectiva con docentes y padres (77%).`,
      ],
      demandasTerritorio: [
        `Prevención temprana de violencia escolar y fortalecimiento de vínculos comunitarios saludables en ${dist}.`,
        `Promoción de ciudadanía democrática, respeto a la diversidad e igualdad de oportunidades.`,
        `Articulación preventiva con DEMUNA, centro de salud y autoridades locales de ${region}.`,
        `Retención escolar y mejora del clima institucional como condición habilitante del aprendizaje.`,
      ],
      cuadroAActividades: [
        {
          fase: 'OE1 · Preparación',
          actividad: `Diagnóstico de clima escolar, normas consensuadas y taller docente en prácticas restaurativas`,
          evidencia: 'Mapa de clima escolar 2027, RI actualizado y actas de tutoría',
          responsable: `${director} y Comité Tutoría`,
          plazo: 'Mar - Abr 2027',
        },
        {
          fase: 'OE2 · Implementación',
          actividad: `Acondicionamiento de rincones socioemocionales, kits de mediación y juegos cooperativos`,
          evidencia: 'Espacios implementados, pecosas y guías de círculos de diálogo',
          responsable: `${director} y ${coordinador}`,
          plazo: 'May - Jun 2027',
        },
        {
          fase: 'OE1 · Ejecución Aula',
          actividad: `Círculos semanales de convivencia, sesiones lúdicas socioemocionales y mediación entre pares`,
          evidencia: 'Cuadernos de acuerdos restaurativos, registros de tutoría y rúbricas',
          responsable: 'Tutores y mediadores',
          plazo: 'Jun - Oct 2027',
        },
        {
          fase: 'OE3 · Comunidad',
          actividad: `Escuelas vivenciales de familias, red con DEMUNA/salud y monitoreo de clima (2 hitos)`,
          evidencia: 'Actas familiares, fichas de monitoreo y reportes de asistencia/clima',
          responsable: `${coordinador} y APAFA`,
          plazo: 'Jul - Nov 2027',
        },
        {
          fase: 'OE3 · Cierre y Difusión',
          actividad: `Encuentro Distrital por el Buen Trato, evaluación comparativa de clima y guía restaurativa`,
          evidencia: 'Informe comparativo de convivencia, guía sistematizada y video',
          responsable: 'Equipo responsable',
          plazo: 'Nov - Dic 2027',
        },
      ],
      cuadroBDescs: {
        bien1: `Kits socioemocionales, juegos cooperativos de gran formato, tarjetas de mediación y mobiliario blando de calma`,
        bien2: `Materiales lúdicos para recreos inclusivos, altavoces portátiles para círculos y bibliografía de tutoría`,
        serv1: `Taller especializado en justicia restaurativa, disciplina positiva y habilidades socioemocionales para docentes`,
        serv2: `Facilitación de escuelas vivenciales para familias, impresión de guías restaurativas y Encuentro del Buen Trato`,
      },
      instrumentHighlights: {
        diagnostico: `Diagnóstico de clima escolar, índice de conflictos resueltos pacíficamente y competencias C1/C2`,
        voz: `85% solicita espacios de escucha sin burlas y 80% pide juegos cooperativos y acuerdos justos`,
        rubrica: `Evalúa autorregulación emocional, escucha empática y participación democrática en acuerdos`,
        guionExtra: `Círculo restaurativo de estudiantes, mediadores dialogando en patio y taller afectivo con familias`,
      },
    },
    tic_digital: {
      domainLabel: 'Competencia digital, pensamiento computacional y creación tecnológica',
      tematicas: [TEMATICAS_CNPIE[8], TEMATICAS_CNPIE[1]],
      competencias: [COMPETENCIAS_CNEB[27], COMPETENCIAS_CNEB[24], COMPETENCIAS_CNEB[28]],
      suggestedTitle: makeTitleSuffix(
        `Aulas Maker y Pensamiento Computacional Contextualizado en ${ie} (${dist})`
      ),
      suggestedSolution: `Implementación de un espacio maker y talleres de pensamiento computacional (desconectado y con kits programables/multimedia offline) donde los estudiantes diseñan prototipos digitales y contenidos propios sobre problemáticas de ${dist}.`,
      causasDirectas: [
        `Causa Directa 1 (Uso Pasivo de la Tecnología): Uso limitado o meramente recreativo/consumidor de dispositivos sin desarrollo de pensamiento computacional ni creación digital.`,
        `Causa Directa 2 (Brecha de Equipamiento): Escasez de kits de robótica educativa, sensores, software offline o recursos multimedia operativos en ${ie}.`,
        `Causa Directa 3 (Mediación Docente TIC): Necesidad de fortalecer competencias docentes para integrar programación básica, ciudadanía digital e IA ética.`,
      ],
      causasIndirectas: [
        `Causa Indirecta 1.1: Falta de rutas didácticas graduadas que funcionen incluso sin conectividad permanente a internet.`,
        `Causa Indirecta 2.1: Equipamiento tecnológico desactualizado o sin mantenimiento preventivo institucional.`,
        `Causa Indirecta 3.1: Ausencia de proyectos interdisciplinarios que conecten tecnología con retos locales de ${region}.`,
      ],
      efectosDirectos: [
        `Efecto Directo 1: Bajo logro en la competencia C28 (entornos virtuales) y diseño de soluciones tecnológicas (C25).`,
        `Efecto Directo 2: Dificultad para descomponer problemas, diseñar algoritmos lógicos y crear productos digitales seguros.`,
        `Efecto Directo 3: Ampliación de la brecha digital entre estudiantes de ${dist} frente a entornos urbanos.`,
      ],
      efectoFinal: `Rezago en alfabetización digital crítica y pensamiento computacional de los ${est} estudiantes de ${ie}.`,
      objetivosEspecificos: [
        `OE1 (Pensamiento Computacional): Integrar actividades desenchufadas y programación por bloques/robótica en el 100% de grados de ${nivel} en 2027.`,
        `OE2 (Estación Maker): Implementar un aula/kit maker modular con recursos offline y herramientas multimedia contextualizadas.`,
        `OE3 (Ciudadanía Digital): Formar líderes estudiantiles digitales y capacitar a docentes y familias en uso ético y seguro de TIC.`,
      ],
      mediosAccion: [
        `Medio 1.1: Talleres de capacitación docente en pensamiento computacional, Scratch/robótica y uso ético de tecnologías.`,
        `Medio 2.1: Adquisición de kits de robótica educativa, microcontroladores y equipamiento de producción digital.`,
        `Medio 3.1: Clubes maker escolares y ferias tecnológicas con participación de la comunidad de ${dist}.`,
      ],
      metaObjetivoGeneral: `Cerrar la brecha digital y potenciar el pensamiento computacional de los ${est} estudiantes de ${ie}`,
      metodologiaFundamento: `Aprendizaje Basado en Retos, pensamiento computacional (descomposición, patrones, algoritmos) y cultura Maker`,
      fasesMetodologicas: [
        `Fase 1 - Reto Digital Desenchufado: Analizan un problema de ${dist} y diseñan algoritmos lógicos en papel y tarjetas antes de programar.`,
        `Fase 2 - Prototipado y Programación: Ensamblan kits, programan por bloques o graban recursos multimedia offline en equipos.`,
        `Fase 3 - Depuración y Ciudadanía Digital: Prueban fallos (debugging), aplican criterios de seguridad digital y mejoran su prototipo.`,
        `Fase 4 - Demo Day Escolar: Exponen soluciones tecnológicas funcionales ante docentes, familias y escuelas de la UGEL.`,
      ],
      rupturasInnovadoras: [
        `De espectadores pasivos de pantallas a creadores de algoritmos, prototipos y contenidos digitales locales.`,
        `Metodología dual desenchufada + digital que opera al 100% incluso en escuelas con baja conectividad.`,
        `Integración transversal de TIC con comunicación, matemática y problemáticas reales de ${dist}.`,
        `Cultura del error positivo mediante ciclos rápidos de prueba y depuración colaborativa.`,
      ],
      necesidadesEstudiantes: [
        `Alto interés por armar robots, programar animaciones y producir videos o podcasts educativos (88%).`,
        `Necesidad de acceso equitativo a herramientas tecnológicas actualizadas dentro de la escuela (82%).`,
        `Demanda de orientación práctica sobre seguridad digital, privacidad y verificación de información (73%).`,
        `Preferencia por trabajar en retos tecnológicos en equipo resolviendo problemas reales (79%).`,
      ],
      demandasTerritorio: [
        `Reducción de la brecha de conectividad y alfabetización digital en el ámbito de ${dist}.`,
        `Difusión digital de la cultura, emprendimientos y memoria local de ${region}.`,
        `Preparación de competencias tecnológicas clave para la continuidad educativa y laboral.`,
        `Uso seguro, ético y responsable de plataformas e inteligencia artificial por menores.`,
      ],
      cuadroAActividades: [
        {
          fase: 'OE1 · Preparación',
          actividad: `Diagnóstico de competencias digitales y taller docente en pensamiento computacional y cultura maker`,
          evidencia: 'Línea de base C28/C25, guías desenchufadas y plan maker',
          responsable: `${director} y ${coordinador}`,
          plazo: 'Mar - Abr 2027',
        },
        {
          fase: 'OE2 · Implementación',
          actividad: `Equipamiento de kits de robótica/microcontroladores, estaciones multimedia y software offline`,
          evidencia: 'Inventario tecnológico, pecosas y aula maker operativa',
          responsable: `${director} y Comité`,
          plazo: 'May - Jun 2027',
        },
        {
          fase: 'OE1 · Ejecución Aula',
          actividad: `Talleres semanales de programación por bloques, prototipado maker y producción multimedia`,
          evidencia: 'Proyectos digitales, códigos, prototipos y rúbricas maker',
          responsable: 'Docentes y club TIC',
          plazo: 'Jun - Oct 2027',
        },
        {
          fase: 'OE3 · Comunidad',
          actividad: `Talleres de ciudadanía digital para familias y monitoreo pedagógico TIC (2 hitos)`,
          evidencia: 'Actas de taller familiar, fichas de monitoreo y acuerdos éticos',
          responsable: `${coordinador} y APAFA`,
          plazo: 'Jul - Nov 2027',
        },
        {
          fase: 'OE3 · Cierre y Difusión',
          actividad: `Feria Tecnológica Demo Day, evaluación comparativa y repositorio digital transferible`,
          evidencia: 'Prototipos validados, informe comparativo y video showcase',
          responsable: 'Equipo responsable',
          plazo: 'Nov - Dic 2027',
        },
      ],
      cuadroBDescs: {
        bien1: `Kits de robótica educativa modular, tarjetas programables/sensores y componentes maker reutilizables`,
        bien2: `Tablets/laptops de taller o kit audiovisual (micrófono, trípode, iluminación) para producción digital offline`,
        serv1: `Capacitación técnica docente en pensamiento computacional, robótica educativa y ciudadanía digital`,
        serv2: `Soporte de instalación offline, impresión de guías de programación y Demo Day Tecnológico 2027`,
      },
      instrumentHighlights: {
        diagnostico: `Diagnóstico en personalización de entornos virtuales, gestión de información y diseño lógico`,
        voz: `88% quiere programar o crear prototipos y 82% solicita acceso guiado a kits tecnológicos`,
        rubrica: `Evalúa descomposición algorítmica, funcionalidad del prototipo y criterios de ética digital`,
        guionExtra: `Estudiantes ensamblando kits programables, depurando código en equipo y probando en Demo Day`,
      },
    },
    arte_cultura: {
      domainLabel: 'Arte, identidad cultural, patrimonio y vida activa',
      tematicas: [TEMATICAS_CNPIE[9], TEMATICAS_CNPIE[10]],
      competencias: [COMPETENCIAS_CNEB[16], COMPETENCIAS_CNEB[17], COMPETENCIAS_CNEB[6]],
      suggestedTitle: makeTitleSuffix(
        `Talleres Vivos de Arte, Patrimonio y Expresión Integral en ${ie} (${dist})`
      ),
      suggestedSolution: `Creación de talleres interdisciplinarios de artes escénicas, visuales, música tradicional y bienestar corporal junto a cultores locales de ${dist} para fortalecer identidad, expresión y hábitos saludables.`,
      causasDirectas: [
        `Causa Directa 1 (Subvaloración Artística): Enseñanza artística reducida a manualidades repetitivas sin desarrollo creativo ni apreciación crítica.`,
        `Causa Directa 2 (Desarraigo Cultural): Escaso diálogo entre las áreas curriculares y las manifestaciones artísticas y prácticas saludables de ${dist}.`,
        `Causa Directa 3 (Falta de Implementos): Carencia de instrumentos, vestuarios básicos o materiales expresivos en la IE.`,
      ],
      causasIndirectas: [
        `Causa Indirecta 1.1: Escasos espacios colegiados para integrar lenguajes artísticos y vida saludable en proyectos interdisciplinarios.`,
        `Causa Indirecta 2.1: Pérdida progresiva de transmisión intergeneracional de música, danza o arte local entre jóvenes.`,
        `Causa Indirecta 3.1: Limitada infraestructura sonora o visual para presentaciones escolares abiertas.`,
      ],
      efectosDirectos: [
        `Efecto Directo 1: Bajo logro al crear proyectos desde los lenguajes artísticos y apreciar manifestaciones locales.`,
        `Efecto Directo 2: Timidez expresiva, sedentarismo y débil sentido de pertenencia cultural territorial.`,
        `Efecto Directo 3: Escasa proyección cultural de la escuela hacia las familias y comunidad.`,
      ],
      efectoFinal: `Pérdida de oportunidades expresivas, identidad territorial y bienestar integral en los ${est} estudiantes de ${ie}.`,
      objetivosEspecificos: [
        `OE1 (Expresión Creativa): Implementar talleres semanales de creación artística y corporal interdisciplinaria en ${ie} durante 2027.`,
        `OE2 (Dotación Expresiva): Equipar el taller cultural escolar con materiales artísticos, sonoros y de expresión tradicional de ${region}.`,
        `OE3 (Cultores y Comunidad): Incorporar a artistas y sabios de ${dist} en festivales abiertos y transmisión viva del patrimonio.`,
      ],
      mediosAccion: [
        `Medio 1.1: Capacitación docente en proyectos artísticos integrados y apreciación crítica cultural.`,
        `Medio 2.1: Adquisición de instrumentos, materiales plásticos/textiles y equipo de sonido portátil.`,
        `Medio 3.1: Residencias cortas con cultores locales y festivales escolares comunitarios.`,
      ],
      metaObjetivoGeneral: `Potenciar la creación artística, identidad cultural y bienestar integral de los ${est} estudiantes de ${ie}`,
      metodologiaFundamento: `Enfoque multicultural e interdisciplinario de lenguajes artísticos del CNEB`,
      fasesMetodologicas: [
        `Fase 1 - Exploración Sensible del Patrimonio: Investigan cantos, danzas, colores, relatos o juegos tradicionales de ${dist}.`,
        `Fase 2 - Experimentación Creativa: Exploran técnicas plásticas, musicales o escénicas junto a docentes y cultores invitados.`,
        `Fase 3 - Ensayo y Curaduría Estudiantil: Perfeccionan sus creaciones con retroalimentación entre pares y guion artístico.`,
        `Fase 4 - Festival y Galería Comunitaria: Presentan obras y montajes ante familias fortaleciendo orgullo e identidad.`,
      ],
      rupturasInnovadoras: [
        `De copiar moldes navideños/decorativos a crear obras auténticas con voz estudiantil propia.`,
        `Articulación directa con artistas, músicos y sabios portadores de cultura viva en ${dist}.`,
        `Conexión transversal de arte, corporalidad saludable, oralidad y memoria histórica.`,
        `La escuela se transforma en centro cultural vivo para toda la comunidad.`,
      ],
      necesidadesEstudiantes: [
        `Entusiasmo por expresarse mediante música, teatro, danza, pintura o muralismo (84%).`,
        `Deseo de conocer historias, música y tradiciones propias de sus abuelos y localidad (76%).`,
        `Necesidad de espacios lúdicos y activos que reduzcan estrés y mejoren su confianza (79%).`,
        `Motivación por mostrar su talento en festivales escolares y comunitarios (75%).`,
      ],
      demandasTerritorio: [
        `Preservación viva del patrimonio cultural inmaterial y lengua de ${dist}.`,
        `Promoción de espacios saludables y libres de riesgos para niñez y juventud en ${region}.`,
        `Participación activa de agrupaciones culturales y familias en la vida escolar.`,
        `Valoración del talento artístico como motor de identidad y emprendimiento cultural.`,
      ],
      cuadroAActividades: [
        {
          fase: 'OE1 · Preparación',
          actividad: `Mapeo cultural local, diagnóstico expresivo y planificación curricular artística integrada`,
          evidencia: 'Mapeo de saberes culturales, línea de base y unidades integradas',
          responsable: `${director} y ${coordinador}`,
          plazo: 'Mar - Abr 2027',
        },
        {
          fase: 'OE2 · Implementación',
          actividad: `Equipamiento de taller de artes (instrumentos, insumos plásticos, audio portátil)`,
          evidencia: 'Pecosas, inventario cultural y espacio de ensayo habilitado',
          responsable: `${director} y Comité`,
          plazo: 'May - Jun 2027',
        },
        {
          fase: 'OE1 · Ejecución Aula',
          actividad: `Talleres semanales de creación artística, expresión corporal y apreciación crítica`,
          evidencia: 'Bitácoras creativas, bocetos, grabaciones y rúbricas artísticas',
          responsable: 'Docentes y cultores',
          plazo: 'Jun - Oct 2027',
        },
        {
          fase: 'OE3 · Comunidad',
          actividad: `Encuentros intergeneracionales con artistas locales y monitoreo docente (2 hitos)`,
          evidencia: 'Actas de colaboración, fichas de monitoreo y galería en proceso',
          responsable: `${coordinador} y APAFA`,
          plazo: 'Jul - Nov 2027',
        },
        {
          fase: 'OE3 · Cierre y Difusión',
          actividad: `Festival Cultural Comunitario, evaluación de logros y catálogo artístico escolar`,
          evidencia: 'Catálogo digital/impreso, evaluación comparativa y video del festival',
          responsable: 'Equipo responsable',
          plazo: 'Nov - Dic 2027',
        },
      ],
      cuadroBDescs: {
        bien1: `Instrumentos musicales, insumos de artes plásticas/muralismo y materiales de expresión escénica y motriz`,
        bien2: `Equipo portátil de sonido/proyección y vestuario o mobiliario modular para taller cultural`,
        serv1: `Facilitación de talleres con cultores locales y capacitación docente en pedagogía artística integrada`,
        serv2: `Montaje de galería/festival cultural comunitario e impresión de catálogos de memoria cultural`,
      },
      instrumentHighlights: {
        diagnostico: `Diagnóstico de creatividad expresiva (C17), apreciación crítica cultural (C18) y participación`,
        voz: `84% demanda talleres prácticos de música/arte/teatro y 76% quiere rescatar tradiciones de ${dist}`,
        rubrica: `Evalúa originalidad creativa, dominio técnico del lenguaje artístico e interpretación cultural`,
        guionExtra: `Ensayos creativos con cultores locales, murales colectivos y fragmentos del festival abierto`,
      },
    },
    inclusion: {
      domainLabel: 'Educación inclusiva, DUA y atención a la diversidad',
      tematicas: [TEMATICAS_CNPIE[5], TEMATICAS_CNPIE[6]],
      competencias: [COMPETENCIAS_CNEB[0], COMPETENCIAS_CNEB[1], COMPETENCIAS_CNEB[28]],
      suggestedTitle: makeTitleSuffix(
        `Aulas Accesibles y Kits Multisensoriales bajo el Diseño Universal (DUA) en ${ie}`
      ),
      suggestedSolution: `Implementación de adaptaciones curriculares bajo los 3 principios del Diseño Universal para el Aprendizaje (DUA), kits multisensoriales accesibles y trabajo colaborativo con familias y SAANEE para que ningún estudiante quede excluido.`,
      causasDirectas: [
        `Causa Directa 1 (Homogeneización Didáctica): Planificación única rígida que no ofrece múltiples formas de representación, acción y motivación (DUA).`,
        `Causa Directa 2 (Barreras de Materiales): Carencia de recursos multisensoriales, pictográficos, táctiles o adaptados para ritmos diversos.`,
        `Causa Directa 3 (Articulación Limitada): Escasa coordinación sistemática entre docentes de aula, familias y servicios de apoyo (SAANEE/CEBE).`,
      ],
      causasIndirectas: [
        `Causa Indirecta 1.1: Necesidad de capacitación práctica docente en evaluación psicopedagógica y Planes Educativos Personalizados (PEP).`,
        `Causa Indirecta 2.1: Falta de materiales manipulativos accesibles y señalética inclusiva en ${ie}.`,
        `Causa Indirecta 3.1: Prejuicios o desconocimiento sobre adaptaciones razonables en el entorno escolar.`,
      ],
      efectosDirectos: [
        `Efecto Directo 1: Rezago y frustración de estudiantes con distintos ritmos o necesidades educativas en las áreas básicas.`,
        `Efecto Directo 2: Baja autonomía (C29) y participación desigual durante las actividades grupales de aula.`,
        `Efecto Directo 3: Riesgo de exclusión o desvinculación escolar temprana.`,
      ],
      efectoFinal: `Brechas de equidad educativa que impiden el derecho a aprender con calidad y calidez en los ${est} estudiantes de ${ie}.`,
      objetivosEspecificos: [
        `OE1 (Pedagogía DUA): Implementar estrategias y evaluaciones flexibles bajo el DUA en el 100% de aulas de ${ie} durante 2027.`,
        `OE2 (Recursos Accesibles): Dotar las aulas con kits multisensoriales, pictogramas, audios y materiales táctiles adaptados.`,
        `OE3 (Comunidad Inclusiva): Fortalecer el acompañamiento con familias y redes SAANEE/UGEL para garantizar participación plena.`,
      ],
      mediosAccion: [
        `Medio 1.1: Talleres colegiados en Diseño Universal para el Aprendizaje (DUA) y Planes Educativos Personalizados.`,
        `Medio 2.1: Adquisición de materiales multisensoriales, tarjetas aumentativas y apoyos visuales/táctiles.`,
        `Medio 3.1: Redes de apoyo entre familias y sensibilización comunitaria inclusiva en ${dist}.`,
      ],
      metaObjetivoGeneral: `Garantizar aprendizajes accesibles, equitativos y autónomos para los ${est} estudiantes de ${ie}`,
      metodologiaFundamento: `Diseño Universal para el Aprendizaje (DUA), enfoque inclusivo de atención a la diversidad del CNEB`,
      fasesMetodologicas: [
        `Fase 1 - Mapeo de Barreras y Fortalezas: Identifican estilos de aprendizaje, barreras físicas/didácticas y apoyos requeridos sin etiquetar.`,
        `Fase 2 - Diseño Multimodal: Presentan contenidos en formatos visuales, sonoros, táctiles y manipulativos simultáneos.`,
        `Fase 3 - Rutas Flexibles de Expresión: Permiten demostrar lo aprendido mediante maquetas, audios, pictogramas, textos o exposiciones.`,
        `Fase 4 - Celebración de Logros Diversos: Evalúan progreso individual frente a metas personalizadas con familias y compañeros.`,
      ],
      rupturasInnovadoras: [
        `De una sola talla para todos a múltiples rutas de acceso y expresión bajo el DUA.`,
        `Materiales multisensoriales que benefician tanto a estudiantes con NEE como a toda el aula.`,
        `Evaluación centrada en el progreso individual (PEP) y no en comparaciones excluyentes.`,
        `Acompañamiento empático entre pares tutores que construyen una cultura solidaria.`,
      ],
      necesidadesEstudiantes: [
        `Necesidad de explicaciones visuales, manipulativas y pasos claros adaptados a su ritmo (84%).`,
        `Demanda de poder demostrar aprendizajes por distintos medios y sin presión de tiempo rígida (78%).`,
        `Necesidad de aceptación, compañerismo solidario y ambientes sensorialmente amigables (82%).`,
        `Interés por materiales táctiles, auditivos e interactivos motivadores (76%).`,
      ],
      demandasTerritorio: [
        `Cumplimiento efectivo del derecho a la educación inclusiva en el ámbito de ${dist}.`,
        `Orientación cercana a familias sobre estimulación, apoyos razonables y derechos en ${region}.`,
        `Articulación interinstitucional con SAANEE, CEBE y servicios de salud locales.`,
        `Construcción de escuelas referentes en inclusión dentro de la UGEL.`,
      ],
      cuadroAActividades: [
        {
          fase: 'OE1 · Preparación',
          actividad: `Mapeo de barreras de aprendizaje, actualización de PEP y taller docente en enfoque DUA`,
          evidencia: 'Informes psicopedagógicos/PEP, PCI DUA y actas colegiadas',
          responsable: `${director} y ${coordinador}`,
          plazo: 'Mar - Abr 2027',
        },
        {
          fase: 'OE2 · Implementación',
          actividad: `Adquisición de kits multisensoriales, material táctil/pictográfico y apoyos accesibles de aula`,
          evidencia: 'Pecosas, inventario inclusivo y banco de recursos multimodales',
          responsable: `${director} y Comité`,
          plazo: 'May - Jun 2027',
        },
        {
          fase: 'OE1 · Ejecución Aula',
          actividad: `Desarrollo de sesiones accesibles multimodales con tutoría solidaria entre pares`,
          evidencia: 'Portafolios diversificados, listas de cotejo adaptadas y evidencias',
          responsable: 'Docentes y apoyo',
          plazo: 'Jun - Oct 2027',
        },
        {
          fase: 'OE3 · Comunidad',
          actividad: `Asesoría a familias con especialistas SAANEE y monitoreo DUA en aula (2 hitos)`,
          evidencia: 'Actas familiares, fichas de monitoreo DUA y registros de avance',
          responsable: `${coordinador} y Familias`,
          plazo: 'Jul - Nov 2027',
        },
        {
          fase: 'OE3 · Cierre y Difusión',
          actividad: `Feria Inclusiva de Talentos, balance personalizado de metas y guía DUA transferible`,
          evidencia: 'Informe de progreso individual, guía DUA y video testimonial',
          responsable: 'Equipo responsable',
          plazo: 'Nov - Dic 2027',
        },
      ],
      cuadroBDescs: {
        bien1: `Kits multisensoriales manipulativos, regletas táctiles, tableros pictográficos y material Montessori adaptado`,
        bien2: `Audífonos reductores de ruido, grabadoras/tablets accesibles y señalética inclusiva institucional`,
        serv1: `Asistencia técnica especializada en Diseño Universal para el Aprendizaje (DUA) y adaptaciones curriculares`,
        serv2: `Impresión de guías visuales/familiares inclusivas y Feria de Talentos Inclusivos 2027`,
      },
      instrumentHighlights: {
        diagnostico: `Identificación de barreras de acceso, estilos sensoriales y nivel de logro según metas PEP`,
        voz: `84% agradece apoyos visuales/táctiles y 82% valora trabajo solidario sin exclusión`,
        rubrica: `Evalúa logro progresivo mediante formatos flexibles de representación y expresión`,
        guionExtra: `Estudiantes utilizando materiales multisensoriales, pictogramas y trabajo colaborativo solidario`,
      },
    },
    eib: {
      domainLabel: 'Educación Intercultural Bilingüe (EIB) y diálogo de saberes',
      tematicas: [TEMATICAS_CNPIE[4], TEMATICAS_CNPIE[0]],
      competencias: [COMPETENCIAS_CNEB[7], COMPETENCIAS_CNEB[10], COMPETENCIAS_CNEB[11]],
      suggestedTitle: makeTitleSuffix(
        `Laboratorios Vivos Interculturales Bilingües (${lengua} - Castellano) con Sabios de ${dist}`
      ),
      suggestedSolution: `Implementación de laboratorios vivos interculturales bilingües (${lengua} - Castellano), diálogo de saberes con sabios/yachaq locales al ritmo del calendario comunal y producción de textos y materiales pedagógicos bilingües.`,
      causasDirectas: [
        `Causa Directa 1 (Desconexión Sociolingüística): Predominio de sesiones monolingües desarticuladas del dominio oral y escrito en ${lengua} y Castellano como L2.`,
        `Causa Directa 2 (Desvinculación de Saberes): Poca incorporación estructurada del calendario comunal y conocimientos ancestrales de los sabios/yachaq de ${dist}.`,
        `Causa Directa 3 (Escasez de Material Bilingüe): Insuficiente acervo de textos, tarjetas léxicas y kits bilingües pertinentes a la cosmovisión local.`,
      ],
      causasIndirectas: [
        `Causa Indirecta 1.1: Necesidad de fortalecer la planificación curricular EIB (caracterización sociolingüística y horario bilingüe).`,
        `Causa Indirecta 2.1: Distanciamiento progresivo entre las prácticas escolares y los espacios productivos/rituales de la comunidad.`,
        `Causa Indirecta 3.1: Escasos espacios para que estudiantes graben, ilustren y difundan relatos en ${lengua}.`,
      ],
      efectosDirectos: [
        `Efecto Directo 1: Bajo logro comunicativo tanto en ${lengua} como en comprensión y producción en Castellano como segunda lengua.`,
        `Efecto Directo 2: Inseguridad identitaria o vergüenza lingüística al expresarse en su lengua originaria en espacios formales.`,
        `Efecto Directo 3: Pérdida gradual del vocabulario especializado y saberes territoriales de ${region}.`,
      ],
      efectoFinal: `Debilitamiento de competencias comunicativas bilingües e identidad cultural en los ${est} estudiantes de ${ie}.`,
      objetivosEspecificos: [
        `OE1 (Pedagogía Bilingüe): Aplicar estrategias diferenciadas de enseñanza en ${lengua} (L1) y Castellano (L2) articuladas al calendario comunal 2027.`,
        `OE2 (Recursos Bilingües): Producir y equipar aulas con bibliotecas bilingües ilustradas, loterías léxicas y audios en ${lengua}.`,
        `OE3 (Diálogo de Saberes): Institucionalizar jornadas vivenciales con yachaq/sabios y familias de ${dist} integradas al PCI.`,
      ],
      mediosAccion: [
        `Medio 1.1: Talleres docentes en metodología EIB, tratamiento de lenguas y diálogo de saberes.`,
        `Medio 2.1: Dotación e impresión de materiales bilingües (${lengua}/Castellano) y grabadoras de memoria oral.`,
        `Medio 3.1: Encuentros comunales de sabios y ferias bilingües en la red educativa local.`,
      ],
      metaObjetivoGeneral: `Fortalecer las competencias comunicativas bilingües (${lengua}/Castellano) e identidad intercultural de ${est} estudiantes de ${ie}`,
      metodologiaFundamento: `Modelo de Servicio Educativo Intercultural Bilingüe (MSEIB), diálogo de saberes y tratamiento pedagógico de L1 y L2`,
      fasesMetodologicas: [
        `Fase 1 - Vivencia con Yachaq en Territorio: Participan junto a sabios locales en actividades del calendario comunal escuchando y dialogando en ${lengua}.`,
        `Fase 2 - Profundización Bilingüe en Aula: Comparan saberes locales y conocimientos del CNEB elaborando glosarios bilingües.`,
        `Fase 3 - Producción Oral y Escrita L1/L2: Redactan relatos, infografías y audios en ${lengua} y Castellano con retroalimentación formativa.`,
        `Fase 4 - Socialización Intercultural: Comparten producciones bilingües en asambleas comunales y Día del Logro Intercultural.`,
      ],
      rupturasInnovadoras: [
        `Del castellano exclusivo a un tratamiento equilibrado y orgulloso de ${lengua} y Castellano.`,
        `Los sabios/yachaq de ${dist} participan como co-educadores dentro y fuera del aula.`,
        `Textos escolares creados desde los relatos, cantos y conocimientos propios de la comunidad.`,
        `Revalorización de la identidad originaria como fuente de autoestima y éxito escolar.`,
      ],
      necesidadesEstudiantes: [
        `Deseo de aprender leyendo y hablando sin vergüenza en su propia lengua ${lengua} y Castellano (84%).`,
        `Interés por salir al campo con los abuelos y sabios para aprender oficios y relatos locales (81%).`,
        `Necesidad de libros ilustrados bilingües, juegos de palabras y audios en ${lengua} (78%).`,
        `Motivación por fortalecer su pronunciación y redacción en Castellano como segunda lengua (75%).`,
      ],
      demandasTerritorio: [
        `Vitalización y prestigio social de la lengua originaria ${lengua} en ${dist}.`,
        `Transmisión respetuosa de conocimientos ecológicos, medicinales y productivos ancestrales.`,
        `Articulación orgánica entre autoridades comunales, APAFA y escuela EIB.`,
        `Formación de ciudadanos bilingües seguros de su identidad en ${region}.`,
      ],
      cuadroAActividades: [
        {
          fase: 'OE1 · Preparación',
          actividad: `Diagnóstico sociolingüístico/psicolingüístico actualizado y taller docente en metodología EIB`,
          evidencia: 'Ficha sociolingüística 2027, caracterización EIB y PCI actualizado',
          responsable: `${director} y ${coordinador}`,
          plazo: 'Mar - Abr 2027',
        },
        {
          fase: 'OE2 · Implementación',
          actividad: `Dotación de biblioteca bilingüe (${lengua}/Castellano), juegos léxicos y grabadoras de campo`,
          evidencia: 'Pecosas, inventario bilingüe y banco de láminas culturales',
          responsable: `${director} y Comité`,
          plazo: 'May - Jun 2027',
        },
        {
          fase: 'OE1 · Ejecución Aula',
          actividad: `Sesiones de diálogo de saberes con yachaq y producción oral/escrita bilingüe L1-L2`,
          evidencia: 'Textos bilingües ilustrados, audios y rúbricas L1/L2',
          responsable: 'Docentes y sabios',
          plazo: 'Jun - Oct 2027',
        },
        {
          fase: 'OE3 · Comunidad',
          actividad: `Vivencias del calendario comunal con familias y monitoreo EIB en aula (2 momentos)`,
          evidencia: 'Actas comunales, fichas de monitoreo EIB y bitácoras culturales',
          responsable: `${coordinador} y Comunidad`,
          plazo: 'Jul - Nov 2027',
        },
        {
          fase: 'OE3 · Cierre y Difusión',
          actividad: `Feria Intercultural Bilingüe, evaluación comparativa L1/L2 y publicación de libro comunitario`,
          evidencia: 'Libro bilingüe escolar, informe comparativo y video',
          responsable: 'Equipo responsable',
          plazo: 'Nov - Dic 2027',
        },
      ],
      cuadroBDescs: {
        bien1: `Biblioteca bilingüe (${lengua}/Castellano), loterías léxicas interculturales y kits de diálogo de saberes`,
        bien2: `Grabadoras digitales/parlantes portátiles y material de ilustración para libros comunitarios bilingües`,
        serv1: `Taller especializado docente en enseñanza de segunda lengua y diálogo de saberes con yachaq`,
        serv2: `Edición e impresión de textos bilingües producidos y organización de Feria Intercultural 2027`,
      },
      instrumentHighlights: {
        diagnostico: `Resultados diferenciados de comprensión y oralidad en ${lengua} (L1) y Castellano (L2)`,
        voz: `84% pide fortalecer sus dos lenguas sin temor y 81% valora aprender junto a los sabios de ${dist}`,
        rubrica: `Evalúa fluidez comunicativa bilingüe, pertinencia cultural y articulación de saberes locales`,
        guionExtra: `Diálogo vivo entre yachaq y estudiantes en el territorio y lectura bilingüe compartida`,
      },
    },
    sft_productivo: {
      domainLabel: `Formación Técnica Productiva (${especialidad}) y Emprendimiento`,
      tematicas: [TEMATICAS_CNPIE[7], TEMATICAS_CNPIE[1]],
      competencias: [COMPETENCIAS_CNEB[26], COMPETENCIAS_CNEB[24], COMPETENCIAS_CNEB[4]],
      suggestedTitle: makeTitleSuffix(
        `Prototipos Productivos Sostenibles en ${especialidad} para el emprendimiento en ${dist}`
      ),
      suggestedSolution: `Implementación de un taller productivo innovador en ${especialidad} (${modulo}) aplicando metodología Design Thinking, prototipado iterativo V1/V2, control de calidad, costeo real y validación directa con usuarios del mercado de ${dist}.`,
      causasDirectas: [
        `Causa Directa 1 (Práctica Tradicional de Taller): Enseñanza técnica limitada a ejercicios mecánicos repetitivos sin innovación de producto ni Design Thinking.`,
        `Causa Directa 2 (Brecha de Equipamiento Técnico): Equipos, herramientas e instrumentos de control de calidad insuficientes o desactualizados para ${especialidad}.`,
        `Causa Directa 3 (Desconexión del Mercado): Escasa validación de prototipos, marca, empaque y cálculo de costos frente a demandas reales de ${dist}.`,
      ],
      causasIndirectas: [
        `Causa Indirecta 1.1: Necesidad de actualizar al equipo docente en metodologías ágiles de emprendimiento y gestión CNOF.`,
        `Causa Indirecta 2.1: Alto costo de insumos y maquinaria especializada que la IE no logra cubrir con recursos ordinarios.`,
        `Causa Indirecta 3.1: Vínculos débiles con gremios productivos, CETPRO/IEST o consumidores locales para pasantías y validación.`,
      ],
      efectosDirectos: [
        `Efecto Directo 1: Bajo logro en la competencia C27 (gestiona proyectos de emprendimiento económico o social) y diseño tecnológico.`,
        `Efecto Directo 2: Productos escolares con acabado básico, sin ficha técnica, envase competitivo ni validación comercial.`,
        `Efecto Directo 3: Menores oportunidades de inserción laboral o autoempleo juvenil al concluir la secundaria en ${dist}.`,
      ],
      efectoFinal: `Limitada empleabilidad, innovación productiva y cultura emprendedora en los ${est} estudiantes de Secundaria de ${ie}.`,
      objetivosEspecificos: [
        `OE1 (Design Thinking SFT): Aplicar las 5 fases del Design Thinking y gestión del módulo "${modulo}" en el 100% de proyectos productivos de ${ie}.`,
        `OE2 (Taller Productivo): Modernizar el taller de ${especialidad} con equipamiento de producción, seguridad e insumos para prototipos V1/V2.`,
        `OE3 (Validación y Mercado): Validar prototipos con usuarios reales de ${dist} y consolidar convenios técnicos con CETPRO/IEST o sector productivo.`,
      ],
      mediosAccion: [
        `Medio 1.1: Asistencia técnica docente y estudiantil en Design Thinking, fichas técnicas, costos e inocuidad/seguridad.`,
        `Medio 2.1: Adquisición de maquinaria/herramientas especializadas (80% Bienes) para el taller de ${especialidad}.`,
        `Medio 3.1: Ruedas de validación con clientes reales y ferias productivas distritales.`,
      ],
      metaObjetivoGeneral: `Potenciar las competencias técnicas en ${especialidad} y el emprendimiento sostenible de ${est} estudiantes de ${ie}`,
      metodologiaFundamento: `Design Thinking aplicado a la Educación para el Trabajo (EPT), Marco CNOF y validación iterativa de prototipos V1/V2`,
      fasesMetodologicas: [
        `Fase 1 - Empatizar y Definir (Mapa de Empatía): Entrevistan a usuarios y productores de ${dist} detectando oportunidades de mejora productiva.`,
        `Fase 2 - Idear y Prototipar V1: Diseñan bocetos, Customer Journey Map, flujogramas y primeras muestras operativas.`,
        `Fase 3 - Testear, Costear y Prototipar V2: Someten el prototipo a pruebas de calidad, higiene/seguridad y validación con usuarios ajustando el producto V2.`,
        `Fase 4 - Emprendimiento y Expo-Venta Formativa: Presentan catálogo, etiqueta, hoja de costos y pitch comercial en ferias locales.`,
      ],
      rupturasInnovadoras: [
        `De prácticas aisladas sin cliente a diseño centrado en usuarios reales de ${dist}.`,
        `De producto único improvisado a iteración técnica documentada (Prototipo V1 → Prototipo V2).`,
        `Integración real de control de calidad, seguridad ocupacional, sostenibilidad ambiental y costeo.`,
        `Articulación certificable con módulos CNOF y aliados del sector productivo de ${region}.`,
      ],
      necesidadesEstudiantes: [
        `Demanda de prácticas intensivas con equipamiento técnico real y seguro en ${especialidad} (88%).`,
        `Interés por crear productos o servicios con valor agregado que puedan venderse en ${dist} (83%).`,
        `Necesidad de dominar cálculo de costos, empaque, marca y atención al cliente (76%).`,
        `Motivación por recibir retroalimentación de empresarios o técnicos locales expertos (74%).`,
      ],
      demandasTerritorio: [
        `Transformación con valor agregado de materias primas o servicios demandados en ${dist}.`,
        `Generación de autoempleo juvenil calificado que evite la migración forzada en ${region}.`,
        `Adopción de estándares de calidad, seguridad e higiene en pequeños talleres locales.`,
        `Alianzas estratégicas con CETPRO, IEST, municipalidad y gremios productivos.`,
      ],
      cuadroAActividades: [
        {
          fase: 'OE1 · Preparación',
          actividad: `Mapas de empatía con usuarios reales y actualización curricular del módulo "${modulo}"`,
          evidencia: 'Mapas de empatía tabulados, línea de base C27 y programación modular',
          responsable: `${director} y ${coordinador}`,
          plazo: 'Mar - Abr 2027',
        },
        {
          fase: 'OE2 · Implementación',
          actividad: `Equipamiento del taller de ${especialidad} con maquinaria, herramientas e insumos productivos`,
          evidencia: 'Pecosas, inventario valorizado (80% Bienes) y protocolos de seguridad',
          responsable: `${director} y Comité SFT`,
          plazo: 'May - Jun 2027',
        },
        {
          fase: 'OE1 · Prototipado',
          actividad: `Talleres de Design Thinking, elaboración de Prototipo V1/V2, fichas técnicas y control de calidad`,
          evidencia: 'Dossier V1/V2, Customer Journey, Storyboard y hojas de costos',
          responsable: 'Docentes EPT y estudiantes',
          plazo: 'Jun - Oct 2027',
        },
        {
          fase: 'OE3 · Validación',
          actividad: `Pruebas de validación con 25+ usuarios reales de ${dist} y asistencia técnica especializada`,
          evidencia: 'Fichas de validación comercial, actas de convenio y monitoreo',
          responsable: `${coordinador} y Aliados`,
          plazo: 'Jul - Nov 2027',
        },
        {
          fase: 'OE3 · Cierre y Difusión',
          actividad: `Expo-Feria Productiva SFT, evaluación comparativa C27 y publicación de Guía Técnica Transferible`,
          evidencia: 'Catálogo de prototipos, informe comparativo y video demostrativo',
          responsable: 'Equipo responsable',
          plazo: 'Nov - Dic 2027',
        },
      ],
      cuadroBDescs: {
        bien1: `Equipamiento y maquinaria técnica principal para el taller de ${especialidad} (${modulo})`,
        bien2: `Insumos productivos iniciales, envases ecoamigables, implementos de EPP y control de calidad`,
        serv1: `Asistencia técnica especializada en prototipado Design Thinking, calidad y gestión de módulo CNOF`,
        serv2: `Impresión de catálogos/fichas técnicas, montaje de validación con usuarios y Expo-Feria SFT 2027`,
      },
      instrumentHighlights: {
        diagnostico: `Línea de base en gestión de emprendimiento (C27), diseño tecnológico (C25) y dominio CNOF`,
        voz: `88% de estudiantes solicita equipamiento técnico real y 83% busca emprender con demanda local`,
        rubrica: `Evalúa calidad del prototipo V2, viabilidad financiera/costeo y respuesta al usuario real`,
        guionExtra: `Taller de ${especialidad} en acción, evolución de Prototipo V1 a V2 y testimonio de cliente real`,
      },
    },
    salud_fisica: {
      domainLabel: 'Educación física, vida activa y alimentación saludable',
      tematicas: [TEMATICAS_CNPIE[10], TEMATICAS_CNPIE[6]],
      competencias: [COMPETENCIAS_CNEB[6], COMPETENCIAS_CNEB[5], COMPETENCIAS_CNEB[29]],
      suggestedTitle: makeTitleSuffix(
        `Escuelas Activas y Loncheras Andino-Amazónicas Saludables en ${ie} (${dist})`
      ),
      suggestedSolution: `Implementación de circuitos psicomotrices, pausas activas diarias, recetarios escolares nutritivos con productos de ${dist} y monitoreo de hábitos saludables junto a familias y puesto de salud.`,
      causasDirectas: [
        `Causa Directa 1 (Sedentarismo y Hábitos): Incremento del sedentarismo escolar y consumo de productos ultraprocesados en loncheras y quioscos.`,
        `Causa Directa 2 (Desconexión Alimentaria): Escaso aprovechamiento pedagógico de alimentos locales ricos en hierro de ${dist} en la cultura escolar.`,
        `Causa Directa 3 (Falta de Implementos): Insuficiente equipamiento psicomotriz, deportivo y guías prácticas de alimentación saludable en ${ie}.`,
      ],
      causasIndirectas: [
        `Causa Indirecta 1.1: Limitada articulación transversal entre Educación Física, Ciencia y Tecnología y Tutoría.`,
        `Causa Indirecta 2.1: Desconocimiento en familias sobre preparación de loncheras económicas antianemia con insumos locales.`,
        `Causa Indirecta 3.1: Espacios recreativos poco habilitados para actividad física segura y cooperativa.`,
      ],
      efectosDirectos: [
        `Efecto Directo 1: Bajo logro en competencias motrices y asunción de vida saludable (C6 y C7) en ${est} estudiantes.`,
        `Efecto Directo 2: Fatiga escolar, baja concentración y vulnerabilidad frente a anemia o malnutrición.`,
        `Efecto Directo 3: Escasa práctica deportiva cooperativa y hábitos preventivos en el hogar.`,
      ],
      efectoFinal: `Afectación al desarrollo físico, rendimiento académico y bienestar integral de los ${est} estudiantes de ${ie}.`,
      objetivosEspecificos: [
        `OE1 (Vida Activa): Implementar circuitos motrices y pausas activas inclusivas para el 100% de aulas de ${ie} durante 2027.`,
        `OE2 (Alimentación Local): Diseñar recetarios saludables y kits psicomotrices valorando alimentos nutritivos de ${dist}.`,
        `OE3 (Comunidad Saludable): Articular talleres demostrativos con familias, APAFA y centro de salud de ${region}.`,
      ],
      mediosAccion: [
        `Medio 1.1: Capacitación docente en psicomotricidad educativa y estilos de vida saludable.`,
        `Medio 2.1: Adquisición de kits psicomotrices, balones, colchonetas y material gráfico nutricional.`,
        `Medio 3.1: Ferias gastronómicas nutritivas y olimpiadas inclusivas escolares.`,
      ],
      metaObjetivoGeneral: `Fortalecer la vida activa, autonomía motriz y alimentación saludable en los ${est} estudiantes de ${ie}`,
      metodologiaFundamento: `Enfoque de corporeidad, vida activa y promoción de la salud escolar del CNEB`,
      fasesMetodologicas: [
        `Fase 1 - Diagnóstico Corporal y Loncheras: Evalúan hábitos de actividad física y contenido nutricional con fichas participativas.`,
        `Fase 2 - Circuitos Motrices y Talleres Nutritivos: Practican juegos cooperativos, expresión corporal y preparan recetas saludables locales.`,
        `Fase 3 - Monitoreo de Hábitos: Registran avances físicos y consumo de agua y alimentos ricos en hierro con retroalimentación docente.`,
        `Fase 4 - Feria Saludable Familiar: Comparten recetarios y exhibiciones motrices con familias y especialistas de salud.`,
      ],
      rupturasInnovadoras: [
        `De clases repetitivas centradas solo en competencia deportiva a corporeidad inclusiva y bienestar integral.`,
        `Integración real de productos nutritivos locales de ${dist} frente a loncheras ultraprocesadas.`,
        `Involucramiento directo de familias y sector salud en la prevención escolar de anemia y sedentarismo.`,
        `Vinculación de actividad física con mejora de atención, emociones y rendimiento académico.`,
      ],
      necesidadesEstudiantes: [
        `Deseo de realizar juegos motrices variados, dinámicos e inclusivos (86%).`,
        `Necesidad de mejorar energía, concentración en clase y hábitos alimentarios diarios (78%).`,
        `Interés por preparar loncheras creativas y saludables con alimentos de su comunidad (74%).`,
        `Demanda de actividades deportivas cooperativas sin exclusión por habilidad o género (81%).`,
      ],
      demandasTerritorio: [
        `Reducción de índices locales de anemia y malnutrición infantil en ${dist}.`,
        `Revalorización de alimentos nutritivos andinos/amazónicos/costeños producidos en ${region}.`,
        `Promoción de espacios públicos y escolares seguros para recreación activa.`,
        `Alianza multisectorial escuela-familia-posta médica.`,
      ],
      cuadroAActividades: [
        {
          fase: 'OE1 · Preparación',
          actividad: `Diagnóstico motriz/alimentario de entrada y diseño de unidades integradas de vida saludable`,
          evidencia: 'Línea de base nutricional-motriz y programación curricular 2027',
          responsable: `${director} y ${coordinador}`,
          plazo: 'Mar - Abr 2027',
        },
        {
          fase: 'OE2 · Implementación',
          actividad: `Adquisición de kits psicomotrices, implementos deportivos inclusivos y guías nutricionales`,
          evidencia: 'Pecosas, inventario físico y recetarios ilustrados locales',
          responsable: `${director} y Comité`,
          plazo: 'May - Jun 2027',
        },
        {
          fase: 'OE1 · Ejecución Aula',
          actividad: `Circuitos motrices semanales, pausas activas y talleres de loncheras nutritivas`,
          evidencia: 'Fichas de progreso corporal, registros y rúbricas C6/C7',
          responsable: 'Docentes y Ed. Física',
          plazo: 'Jun - Oct 2027',
        },
        {
          fase: 'OE3 · Comunidad',
          actividad: `Talleres con familias y centro de salud local + monitoreo docente (2 momentos)`,
          evidencia: 'Actas de compromiso familiar, fichas de monitoreo y asistencia',
          responsable: `${coordinador} y APAFA`,
          plazo: 'Jul - Nov 2027',
        },
        {
          fase: 'OE3 · Cierre y Difusión',
          actividad: `Festival Escolar de Vida Activa y Feria Gastronómica Saludable Comunitaria`,
          evidencia: 'Recetario comunitario, evaluación comparativa y video',
          responsable: 'Equipo responsable',
          plazo: 'Nov - Dic 2027',
        },
      ],
      cuadroBDescs: {
        bien1: `Kits psicomotrices, vallas, aros, colchonetas, balones y materiales de expresión motriz inclusiva`,
        bien2: `Insumos educativos para talleres demostrativos de loncheras saludables y balanza/tallímetro pedagógico`,
        serv1: `Capacitación docente en corporeidad inclusiva y asesoría nutricional para escuelas saludables`,
        serv2: `Impresión de recetarios nutritivos locales y montaje del Festival Escolar Saludable 2027`,
      },
      instrumentHighlights: {
        diagnostico: `Línea de base en motricidad autónoma (C6), vida saludable (C7) y hábitos alimentarios`,
        voz: `86% pide juegos motrices inclusivos y 74% se interesa por loncheras saludables con insumos locales`,
        rubrica: `Evalúa coordinación motriz cooperativa, autorregulación corporal y hábitos saludables verificables`,
        guionExtra: `Circuitos psicomotrices cooperativos y familias preparando recetas nutritivas de ${dist}`,
      },
    },
    gestion_evaluacion: {
      domainLabel: 'Liderazgo pedagógico, CPA, evaluación formativa y autonomía (C29)',
      tematicas: [TEMATICAS_CNPIE[12], TEMATICAS_CNPIE[11]],
      competencias: [COMPETENCIAS_CNEB[28], COMPETENCIAS_CNEB[7], COMPETENCIAS_CNEB[18]],
      suggestedTitle: makeTitleSuffix(
        `Comunidades Profesionales y Rúbricas de Autonomía Formativa en ${ie} (${dist})`
      ),
      suggestedSolution: `Consolidación de Comunidades Profesionales de Aprendizaje (CPA), portafolios metacognitivos estudiantiles y protocolos de retroalimentación por descubrimiento para fortalecer autonomía (C29) y gestión escolar.`,
      causasDirectas: [
        `Causa Directa 1 (Evaluación Sumativa): Prácticas evaluativas centradas en calificación numérica con escasa retroalimentación reflexiva oportuna.`,
        `Causa Directa 2 (Trabajo Aislado): Limitada institucionalización de Comunidades Profesionales de Aprendizaje (CPA) y análisis colegiado de evidencias.`,
        `Causa Directa 3 (Baja Metacognición): Ausencia de instrumentos visuales y portafolios que permitan al estudiante monitorear su propio avance (C29).`,
      ],
      causasIndirectas: [
        `Causa Indirecta 1.1: Falta de criterios e instrumentos compartidos de evaluación formativa por ciclo o aula multigrado.`,
        `Causa Indirecta 2.1: Escasos protocolos prácticos de acompañamiento pedagógico entre pares y Semanas de Gestión productivas.`,
        `Causa Indirecta 3.1: Carencia de portafolios físicos/digitales y tableros de metas accesibles para estudiantes y familias.`,
      ],
      efectosDirectos: [
        `Efecto Directo 1: Dependencia estudiantil de la corrección externa y bajo dominio de autorregulación (C29).`,
        `Efecto Directo 2: Brechas persistentes en áreas básicas por detección tardía de dificultades de aprendizaje.`,
        `Efecto Directo 3: Desarticulación pedagógica entre docentes de distintos grados y ciclos de ${ie}.`,
      ],
      efectoFinal: `Estancamiento de los aprendizajes autónomos y débil cultura de mejora continua colegiada en los ${est} estudiantes de ${ie}.`,
      objetivosEspecificos: [
        `OE1 (Evaluación Formativa): Implementar la escalera de retroalimentación y portafolios metacognitivos en el 100% de aulas de ${ie} durante 2027.`,
        `OE2 (Recursos de Autonomía): Dotar kits de rúbricas visuales, agendas metacognitivas y tableros de progreso estudiantil.`,
        `OE3 (Liderazgo y CPA): Institucionalizar GIA mensuales y observación entre pares articulados al PEI, PAT y PCI.`,
      ],
      mediosAccion: [
        `Medio 1.1: Talleres de evaluación formativa, rúbricas analíticas y retroalimentación por descubrimiento.`,
        `Medio 2.1: Producción e impresión de portafolios, semáforos de logro y guías de autoevaluación.`,
        `Medio 3.1: Pasantías internas, Semanas de Gestión colegiadas y devolución dialogada con familias.`,
      ],
      metaObjetivoGeneral: `Consolidar la evaluación formativa, autonomía estudiantil (C29) y liderazgo colegiado en los ${est} estudiantes de ${ie}`,
      metodologiaFundamento: `Evaluación para el aprendizaje, metacognición autorregulada y liderazgo pedagógico distribuido`,
      fasesMetodologicas: [
        `Fase 1 - Meta Compartida: Docentes y estudiantes acuerdan criterios de logro claros en lenguaje cercano desde el inicio de cada unidad.`,
        `Fase 2 - Evidencia y Portafolio: Estudiantes producen evidencias auténticas y registran sus estrategias en bitácoras de aprendizaje.`,
        `Fase 3 - Retroalimentación Reflexiva: Se aplican preguntas socráticas, coevaluación entre pares y análisis en CPA docente.`,
        `Fase 4 - Balance Metacognitivo: Cada estudiante evalúa cómo aprendió y socializa sus metas logradas ante su familia.`,
      ],
      rupturasInnovadoras: [
        `Del examen sorpresivo punitivo a criterios transparentes, portafolios vivos y mejora continua.`,
        `De docentes trabajando en solitario a Comunidades Profesionales de Aprendizaje (CPA) con análisis real de evidencias.`,
        `Empoderamiento real del estudiante para identificar errores como oportunidades de aprendizaje (C29).`,
        `Adaptabilidad total a aulas multigrado, unidocentes, EBA o polidocentes de ${region}.`,
      ],
      necesidadesEstudiantes: [
        `Necesidad de comprender claramente qué se espera que logren antes de realizar tareas (83%).`,
        `Interés por recibir comentarios alentadores y pistas concretas en lugar de solo una nota (85%).`,
        `Necesidad de organizar su tiempo y estrategias de estudio de manera autónoma (79%).`,
        `Deseo de mostrar su progreso real a sus familias mediante portafolios propios (76%).`,
      ],
      demandasTerritorio: [
        `Reducción de deserción y repitencia escolar mediante acompañamiento formativo temprano en ${dist}.`,
        `Fortalecimiento del liderazgo directivo y estabilidad pedagógica en instituciones de ${region}.`,
        `Comunicación clara a familias sobre avances reales de aprendizaje más allá de calificativos.`,
        `Transferencia de buenas prácticas colegiadas a redes educativas de la UGEL.`,
      ],
      cuadroAActividades: [
        {
          fase: 'OE1 · Preparación',
          actividad: `Diagnóstico de prácticas evaluativas, actualización del PCI y diseño de rúbricas por ciclo`,
          evidencia: 'Actas de Semana de Gestión, matriz de rúbricas y línea de base C29',
          responsable: `${director} y ${coordinador}`,
          plazo: 'Mar - Abr 2027',
        },
        {
          fase: 'OE2 · Implementación',
          actividad: `Dotación de portafolios, tableros metacognitivos y material de organización de aula`,
          evidencia: 'Pecosas, portafolios distribuidos e inventario de aula',
          responsable: `${director} y Comité`,
          plazo: 'May - Jun 2027',
        },
        {
          fase: 'OE1 · Ejecución Aula',
          actividad: `Aplicación de retroalimentación formativa, coevaluación y bitácoras metacognitivas`,
          evidencia: 'Portafolios estudiantiles, listas de cotejo y fichas de reflexión',
          responsable: 'Docentes de aula',
          plazo: 'Jun - Oct 2027',
        },
        {
          fase: 'OE3 · Liderazgo CPA',
          actividad: `Sesiones mensuales de CPA, observación entre pares y jornadas de devolución con familias`,
          evidencia: 'Actas de CPA, fichas de monitoreo docente (2 momentos) y actas familiares',
          responsable: `${coordinador} y Directivo`,
          plazo: 'Jul - Nov 2027',
        },
        {
          fase: 'OE3 · Cierre y Difusión',
          actividad: `Feria de Portafolios de Autonomía, sistematización y pasantía en red UGEL`,
          evidencia: 'Guía transferible de evaluación formativa, informe comparativo y video',
          responsable: 'Equipo responsable',
          plazo: 'Nov - Dic 2027',
        },
      ],
      cuadroBDescs: {
        bien1: `Portafolios organizadores, pizarras/tableros de progreso metacognitivo y materiales de aula por equipos`,
        bien2: `Equipamiento digital/impresión para sistematización de evidencias y documentación de CPA docente`,
        serv1: `Asesoría especializada en evaluación formativa, retroalimentación reflexiva y liderazgo en CPA`,
        serv2: `Impresión de guías de autoevaluación/rúbricas y organización de pasantía en red educativa`,
      },
      instrumentHighlights: {
        diagnostico: `Diagnóstico de autonomía estudiantil (C29) y nivel de retroalimentación formativa en aula`,
        voz: `85% de estudiantes pide comentarios orientadores y 83% solicita rúbricas claras desde el inicio`,
        rubrica: `Evalúa planificación autónoma de metas, monitoreo de estrategias y metacognición en portafolio`,
        guionExtra: `Sesión de CPA analizando evidencias de aula y estudiantes explicando su progreso en portafolios`,
      },
    },
    general: {
      domainLabel: `Mejora de ${parseComp(proj.seed.competencias[0])}`,
      tematicas: proj.seed.tematicas.length > 0 ? proj.seed.tematicas : [TEMATICAS_CNPIE[0]],
      competencias:
        proj.seed.competencias.length > 0
          ? proj.seed.competencias
          : [COMPETENCIAS_CNEB[7], COMPETENCIAS_CNEB[22]],
      suggestedTitle: makeTitleSuffix(
        `Estrategias Vivas Contextualizadas para responder a los retos de aprendizaje en ${dist}`
      ),
      suggestedSolution: `Implementación de comunidades de indagación colaborativa, kits pedagógicos contextualizados a ${dist} y retroalimentación formativa continua centrada en revertir: ${shortCore}.`,
      causasDirectas: [
        `Causa Directa 1 (Práctica Pedagógica): Predominio de sesiones expositivas centradas en la transcripción con escasa retroalimentación reflexiva vinculada a "${shortCore}".`,
        `Causa Directa 2 (Pertinencia Curricular): Desarticulación entre las sesiones de aula y las situaciones auténticas y saberes de ${dist}.`,
        `Causa Directa 3 (Recursos Educativos): Insuficiente disponibilidad de materiales manipulativos, guías situadas y herramientas de apoyo en ${ie}.`,
      ],
      causasIndirectas: [
        `Causa Indirecta 1.1: Escasos espacios colegiados para modelar metodologías activas y evaluación formativa entre docentes.`,
        `Causa Indirecta 2.1: Limitada incorporación de problemáticas y potencialidades territoriales de ${region} en el PCI.`,
        `Causa Indirecta 3.1: Falta de dotación pedagógica contextualizada para las aulas del nivel ${nivel}.`,
      ],
      efectosDirectos: [
        `Efecto Directo 1: Persistencia de altos porcentajes en nivel Inicio respecto a las competencias vinculadas al problema.`,
        `Efecto Directo 2: Dificultad para analizar información, argumentar ideas y transferir aprendizajes a situaciones nuevas.`,
        `Efecto Directo 3: Baja motivación intrínseca y limitada autonomía estudiantil (Competencia 29) en el aula.`,
      ],
      efectoFinal: `Brecha sostenida en el logro de competencias del CNEB que limita el desarrollo integral de los ${est} estudiantes de ${ie}.`,
      objetivosEspecificos: [
        `OE1 (Metodología Activa): Implementar estrategias situadas y retroalimentación formativa en el 100% de aulas de ${nivel} para revertir el problema central durante 2027.`,
        `OE2 (Recursos Situados): Diseñar y dotar kits pedagógicos y materiales contextualizados pertinentes a ${dist} que movilicen aprendizajes auténticos.`,
        `OE3 (Comunidad Escolar): Consolidar comunidades de aprendizaje docente y alianzas con familias y la UGEL en el PEI, PAT y PCI.`,
      ],
      mediosAccion: [
        `Medio 1.1: Comunidades profesionales de aprendizaje docente, talleres metodológicos y monitoreo reflexivo.`,
        `Medio 2.1: Adquisición y producción de materiales manipulativos y guías didácticas situadas en ${dist}.`,
        `Medio 3.1: Jornadas abiertas con familias, sabios locales y aliados institucionales de ${region}.`,
      ],
      metaObjetivoGeneral: `Revertir el problema central ("${shortCore}") fortaleciendo las competencias priorizadas en ${est} estudiantes de ${ie}`,
      metodologiaFundamento: `Enfoque por competencias del CNEB, aprendizaje situado, socioconstructivismo y evaluación formativa`,
      fasesMetodologicas: [
        `Fase 1 - Problematización Situada: Analizan un reto real de ${dist} conectado directamente con el problema identificado.`,
        `Fase 2 - Indagación y Diseño Colaborativo: Manipulan kits pedagógicos, contrastan fuentes y elaboran producciones en equipos.`,
        `Fase 3 - Retroalimentación Formativa: Mejoran sus evidencias con rúbricas analíticas y reflexión guiada.`,
        `Fase 4 - Socialización y Metacognición: Presentan sus avances en ferias pedagógicas abiertas y evalúan cómo aprendieron.`,
      ],
      rupturasInnovadoras: [
        `Del aula expositiva pasiva a experiencias activas vinculadas a la realidad de ${dist}.`,
        `De fichas descontextualizadas a kits pedagógicos manipulativos y situaciones auténticas.`,
        `De evaluación meramente sumativa a portafolios y retroalimentación por descubrimiento.`,
        `Participación corresponsable de familias y comunidad como aliados pedagógicos.`,
      ],
      necesidadesEstudiantes: [
        `Necesidad de aprendizaje activo, manipulativo y vinculado a su realidad cotidiana (80%).`,
        `Interés por investigar su entorno, cultura y problemáticas concretas de ${dist} (75%).`,
        `Necesidad de trabajo colaborativo con retroalimentación cercana y respetuosa (72%).`,
        `Motivación por elaborar productos creativos, maquetas o registros digitales (78%).`,
      ],
      demandasTerritorio: [
        `Aprovechamiento formativo de los recursos, historia y biodiversidad de ${dist}.`,
        `Diálogo de saberes con familias, líderes comunales y actores locales de ${region}.`,
        `Respuesta educativa pertinente a los desafíos sociales y ambientales del territorio.`,
        `Fortalecimiento del vínculo escuela-comunidad para mejorar la trayectoria escolar.`,
      ],
      cuadroAActividades: [
        {
          fase: 'OE1 · Preparación',
          actividad: `Diagnóstico participativo frente al problema central, ajuste del PCI y taller docente`,
          evidencia: 'Actas de Semanas de Gestión, PCI actualizado y línea de base 2027',
          responsable: `${director} y ${coordinador}`,
          plazo: 'Mar - Abr 2027',
        },
        {
          fase: 'OE2 · Implementación',
          actividad: `Adquisición e implementación de kits pedagógicos contextualizados a ${dist}`,
          evidencia: 'Pecosas, inventario de aula y guías didácticas situadas',
          responsable: `${director} y Comité`,
          plazo: 'May - Jun 2027',
        },
        {
          fase: 'OE1 · Ejecución Aula',
          actividad: `Desarrollo de proyectos de aprendizaje situados con retroalimentación formativa continua`,
          evidencia: 'Portafolios estudiantiles, rúbricas analíticas y registros fotográficos',
          responsable: 'Docentes de aula',
          plazo: 'Jun - Oct 2027',
        },
        {
          fase: 'OE3 · Comunidad',
          actividad: `Jornadas con familias/aliados y monitoreo docente en dos momentos`,
          evidencia: 'Fichas de monitoreo, actas de compromiso y registros de asistencia',
          responsable: `${coordinador} y APAFA`,
          plazo: 'Jul - Nov 2027',
        },
        {
          fase: 'OE3 · Cierre y Difusión',
          actividad: `Feria Pedagógica Abierta, evaluación comparativa de salida y guía sistematizada`,
          evidencia: 'Informe comparativo de logros, guía metodológica y video',
          responsable: 'Equipo responsable',
          plazo: 'Nov - Dic 2027',
        },
      ],
      cuadroBDescs: {
        bien1: `Kits manipulativos y materiales didácticos contextualizados para atender el problema central en ${nivel}`,
        bien2: `Equipamiento audiovisual/digital de apoyo y bibliografía territorial para aulas de ${ie}`,
        serv1: `Taller especializado de fortalecimiento docente en metodologías activas y evaluación formativa`,
        serv2: `Impresión de guías metodológicas, rúbricas y organización de feria pedagógica de cierre 2027`,
      },
      instrumentHighlights: {
        diagnostico: `Diagnóstico de entrada SIAGIE, Evaluación Diagnóstica 2026 y ENLA 2025 centrado en el problema`,
        voz: `80% demanda aprendizaje activo manipulativo y 75% pide trabajar con situaciones de ${dist}`,
        rubrica: `Evalúa progresión de desempeños situados y transferencia autónoma de aprendizajes`,
        guionExtra: `Secuencia de aula mostrando cómo los estudiantes superan paso a paso el problema identificado`,
      },
    },
  };

  const chosen = domainConfigs[domain];
  if (isEib && domain !== 'eib') {
    return {
      domain,
      problemCore,
      ...chosen,
      tematicas: Array.from(new Set([...chosen.tematicas, TEMATICAS_CNPIE[4]])).slice(0, 3),
      suggestedSolution: `${chosen.suggestedSolution} Todo ello articulado en diálogo bilingüe (${lengua} - Castellano) con sabios/yachaq de ${dist}.`,
    };
  }
  return {
    domain,
    problemCore,
    ...chosen,
  };
}

export function getAllBasesProblemSuggestions(proj: ProjectModel): ProblemSuggestionOption[] {
  const ie = proj.ie.nombre?.trim() || 'nuestra Institución Educativa';
  const dist = proj.ie.distrito?.trim() || 'nuestra localidad';
  const nivel = proj.ie.nivel || 'Primaria';
  const est = proj.ie.estudiantes || 120;
  const lengua = proj.ie.lengua?.trim() || 'lengua originaria local';
  const especialidad = proj.ie.especialidad?.trim() || 'Industrias Alimentarias';
  const iapeNote =
    proj.category === '2D'
      ? 'Mediante diagnóstico participativo de aula, '
      : '';

  return [
    // TEMÁTICA 1: Comunicación + Matemática
    {
      id: 'base_t1_lectura',
      areaLabel: 'Temática 1 · Comprensión Lectora y Oralidad',
      tematica: TEMATICAS_CNPIE[0],
      scopeTag: 'Educación Básica · 2A / 2B / 2D',
      scopeGroup: 'tematicas_eb',
      domain: 'lectura',
      problema: `${iapeNote}El 63% de los ${est} estudiantes del nivel ${nivel} de ${ie} (${dist}) se ubica en nivel Inicio en comprensión lectora inferencial y producción de textos (Evaluación Diagnóstica 2026 y ENLA 2025), debido a lecturas literales mecánicas y escasez de textos contextualizados.`,
    },
    {
      id: 'base_t1_matematica',
      areaLabel: 'Temática 1 · Resolución de Problemas Matemáticos',
      tematica: TEMATICAS_CNPIE[0],
      scopeTag: 'Educación Básica · 2A / 2B / 2D',
      scopeGroup: 'tematicas_eb',
      domain: 'matematica',
      problema: `${iapeNote}El 61% de los ${est} estudiantes del nivel ${nivel} de ${ie} (${dist}) presenta bajo logro en resolución de problemas matemáticos de cantidad y regularidad (Evaluación Diagnóstica 2026), por predominio de enseñanza algorítmica sin material concreto CPA.`,
    },
    // TEMÁTICA 2: Indagación Científica
    {
      id: 'base_t2_ciencia',
      areaLabel: 'Temática 2 · Indagación Científica y Tecnología',
      tematica: TEMATICAS_CNPIE[1],
      scopeTag: 'Educación Básica · 2A / 2B / 2D',
      scopeGroup: 'tematicas_eb',
      domain: 'ciencia',
      problema: `${iapeNote}El 64% de los ${est} estudiantes de ${nivel} de ${ie} (${dist}) muestra dificultades para problematizar, formular hipótesis y diseñar experimentos verificables (C23 y C24), por enseñanza memorística sin laboratorio vivo ni kits de indagación.`,
    },
    // TEMÁTICA 3: Ciudadanía Activa y Convivencia Democrática
    {
      id: 'base_t3_ciudadania',
      areaLabel: 'Temática 3 · Ciudadanía Activa y Convivencia Democrática',
      tematica: TEMATICAS_CNPIE[2],
      scopeTag: 'Educación Básica · 2A / 2B / 2D',
      scopeGroup: 'tematicas_eb',
      domain: 'convivencia',
      problema: `${iapeNote}Escasa participación estudiantil deliberativa en asuntos públicos locales y débil resolución democrática de conflictos en los ${est} estudiantes de ${ie} (${dist}), limitando el desarrollo de la ciudadanía activa e intercultural (C2).`,
    },
    // TEMÁTICA 4: Educación Ambiental y Gestión del Riesgo
    {
      id: 'base_t4_ambiente',
      areaLabel: 'Temática 4 · Educación Ambiental, Clima y Gestión del Riesgo',
      tematica: TEMATICAS_CNPIE[3],
      scopeTag: 'Educación Básica · 2A / 2B / 2D',
      scopeGroup: 'tematicas_eb',
      domain: 'ambiente',
      problema: `${iapeNote}El 59% de los ${est} estudiantes de ${ie} (${dist}) evidencia limitado manejo responsable de residuos sólidos, cuidado del agua y preparación ante riesgos climáticos locales (C4 y C23), ante la ausencia de biohuertos y proyectos eco-territoriales.`,
    },
    // TEMÁTICA 5: EIB y Diálogo de Saberes
    {
      id: 'base_t5_eib_bilingue',
      areaLabel: `Temática 5 · EIB y Diálogo de Saberes (${lengua})`,
      tematica: TEMATICAS_CNPIE[4],
      scopeTag: 'EIB Fortalecimiento / Revitalización / Urbano (+5%)',
      scopeGroup: 'eib',
      domain: 'eib',
      recommendedEibTipo: 'EIB Fortalecimiento',
      problema: `El 64% de los ${est} estudiantes de ${ie} (${dist}) presenta dificultad en la oralidad, lectura y escritura bilingüe (${lengua} / Castellano) y débil valoración de los saberes ancestrales locales, por desconexión curricular con la cultura originaria y los yachaq de la comunidad.`,
    },
    // TEMÁTICA 6: Educación Inclusiva y DUA
    {
      id: 'base_t6_inclusion_dua',
      areaLabel: 'Temática 6 · Educación Inclusiva y Diseño Universal (DUA)',
      tematica: TEMATICAS_CNPIE[5],
      scopeTag: 'EBR Inclusiva / EBE · DUA',
      scopeGroup: 'tematicas_eb',
      domain: 'inclusion',
      problema: `Barreras de acceso metodológico y ausencia de recursos multisensoriales bajo el Diseño Universal para el Aprendizaje (DUA) dificultan el progreso equitativo de estudiantes con distintos ritmos y necesidades educativas especiales en las aulas de ${ie} (${dist}).`,
    },
    // TEMÁTICA 7: Bienestar Socioemocional y Prevención de Violencia
    {
      id: 'base_t7_socioemocional',
      areaLabel: 'Temática 7 · Bienestar Socioemocional y Prevención de Violencia',
      tematica: TEMATICAS_CNPIE[6],
      scopeTag: 'Educación Básica · Tutoría y Bienestar',
      scopeGroup: 'tematicas_eb',
      domain: 'convivencia',
      problema: `Incremento de conflictos entre pares, baja autorregulación emocional e inseguridad personal en los ${est} estudiantes de ${nivel} de ${ie} (${dist}), debido a respuestas disciplinarias punitivas y escasa implementación de círculos restaurativos y tutoría vivencial.`,
    },
    // TEMÁTICA 8: Emprendimiento y Educación Financiera (EB)
    {
      id: 'base_t8_emprendimiento_eb',
      areaLabel: 'Temática 8 · Emprendimiento Escolar y Educación Financiera',
      tematica: TEMATICAS_CNPIE[7],
      scopeTag: 'Educación Básica · EPT / C27 / C5',
      scopeGroup: 'tematicas_eb',
      domain: 'sft_productivo',
      problema: `Limitado desarrollo de capacidades de educación financiera, ahorro responsable y diseño de emprendimientos sociales sostenibles (C5 y C27) en los ${est} estudiantes de ${ie} (${dist}), por enseñanza teórica desconectada de iniciativas económicas locales.`,
    },
    // TEMÁTICA 9: Transformación Digital, Pensamiento Computacional e IA Ética
    {
      id: 'base_t9_digital',
      areaLabel: 'Temática 9 · Transformación Digital, Robótica e IA Ética',
      tematica: TEMATICAS_CNPIE[8],
      scopeTag: 'Educación Básica · C28 y Pensamiento Computacional',
      scopeGroup: 'tematicas_eb',
      domain: 'tic_digital',
      problema: `El 66% de los ${est} estudiantes de ${nivel} de ${ie} (${dist}) presenta limitado desarrollo de competencias digitales, pensamiento computacional y uso ético de herramientas tecnológicas offline (C28), por uso pasivo de dispositivos y falta de kits de programación/maker.`,
    },
    // TEMÁTICA 10: Arte, Cultura, Patrimonio e Identidad Territorial
    {
      id: 'base_t10_arte',
      areaLabel: 'Temática 10 · Arte, Cultura, Patrimonio e Identidad',
      tematica: TEMATICAS_CNPIE[9],
      scopeTag: 'Educación Básica · C17 y C18',
      scopeGroup: 'tematicas_eb',
      domain: 'arte_cultura',
      problema: `Escasa expresión creativa y pérdida de vínculo con la música, danza, artes plásticas y patrimonio vivo de ${dist} en los ${est} estudiantes de ${ie}, al reducirse el área artística a copias mecánicas sin contacto con cultores locales.`,
    },
    // TEMÁTICA 11: Educación Física, Vida Activa y Alimentación Saludable
    {
      id: 'base_t11_salud',
      areaLabel: 'Temática 11 · Educación Física, Vida Activa y Alimentación Saludable',
      tematica: TEMATICAS_CNPIE[10],
      scopeTag: 'Educación Básica · C6 y C7',
      scopeGroup: 'tematicas_eb',
      domain: 'salud_fisica',
      problema: `Aumento del sedentarismo escolar y consumo frecuente de productos ultraprocesados en loncheras de los ${est} estudiantes de ${ie} (${dist}), afectando su desarrollo psicomotriz (C6), hábitos saludables (C7) y concentración en aula.`,
    },
    // TEMÁTICA 12: Liderazgo Pedagógico Directivo y CPA
    {
      id: 'base_t12_liderazgo',
      areaLabel: 'Temática 12 · Liderazgo Directivo y Comunidades Profesionales (CPA)',
      tematica: TEMATICAS_CNPIE[11],
      scopeTag: 'Gestión Escolar · CGE / Trabajo Colegiado',
      scopeGroup: 'tematicas_eb',
      domain: 'gestion_evaluacion',
      problema: `Débil articulación pedagógica colegiada y escasa observación reflexiva entre docentes en ${ie} (${dist}), lo que fragmenta el monitoreo del aprendizaje y dificulta la consolidación de Comunidades Profesionales de Aprendizaje (CPA).`,
    },
    // TEMÁTICA 13: Evaluación Formativa, Autonomía y Metacognición
    {
      id: 'base_t13_evaluacion',
      areaLabel: 'Temática 13 · Evaluación Formativa, Autonomía y Metacognición',
      tematica: TEMATICAS_CNPIE[12],
      scopeTag: 'Educación Básica · C29 y Retroalimentación',
      scopeGroup: 'tematicas_eb',
      domain: 'gestion_evaluacion',
      problema: `El 65% de los ${est} estudiantes de ${ie} (${dist}) muestra baja autonomía para autorregular sus aprendizajes (C29), debido a evaluaciones centradas únicamente en calificaciones numéricas sin rúbricas claras, portafolios ni retroalimentación por descubrimiento.`,
    },
    // MODALIDAD EIB ÁMBITO AMAZÓNICO (S/ 21,600)
    {
      id: 'base_eib_amazonico',
      areaLabel: `EIB Amazónico · Biodiversidad del Bosque y Oralidad (${lengua})`,
      tematica: TEMATICAS_CNPIE[4],
      scopeTag: 'Modalidad EIB Amazónico · Hasta S/ 21,600',
      scopeGroup: 'eib',
      domain: 'eib',
      recommendedModality: 'EIB_AMAZ',
      recommendedEibTipo: 'EIB Fortalecimiento',
      problema: `El 66% de los ${est} estudiantes de la IE amazónica ${ie} (${dist}) evidencia dificultades en lectoescritura bilingüe (${lengua} / Castellano) e indagación sobre la biodiversidad del bosque, por falta de materiales interculturales amazónicos y articulación con sabios indígenas.`,
    },
    // CATEGORÍA 3 / MODALIDAD MSE-SFT (Anexo 2C · Hasta S/ 70,000)
    {
      id: 'base_sft_general',
      areaLabel: `MSE-SFT · Prototipado y Emprendimiento en ${especialidad}`,
      tematica: TEMATICAS_CNPIE[7],
      scopeTag: 'Categoría 3 · Anexo 2C MSE-SFT · Hasta S/ 70,000',
      scopeGroup: 'sft',
      domain: 'sft_productivo',
      recommendedCategory: '2C',
      recommendedModality: 'MSE_SFT',
      recommendedNivel: 'Secundaria',
      problema: `Limitado desarrollo de competencias técnicas CNOF en ${especialidad} y emprendimiento productivo (C27) en los ${est} estudiantes de secundaria de ${ie} (${dist}), debido a equipamiento desactualizado en taller y escasa validación de prototipos V1/V2 con usuarios reales.`,
    },
    {
      id: 'base_sft_agro_circular',
      areaLabel: 'MSE-SFT · Agroindustria, Inocuidad y Economía Circular',
      tematica: TEMATICAS_CNPIE[7],
      scopeTag: 'Categoría 3 · Anexo 2C MSE-SFT · 80% Bienes / 20% Servicios',
      scopeGroup: 'sft',
      domain: 'sft_productivo',
      recommendedCategory: '2C',
      recommendedModality: 'MSE_SFT',
      recommendedNivel: 'Secundaria',
      problema: `El 65% de los ${est} estudiantes de secundaria técnica de ${ie} (${dist}) presenta dificultades para transformar materias primas locales con control de calidad, empaque sostenible y aprovechamiento de mermas por carencia de equipos básicos de procesamiento y costeo real.`,
    },
    // CATEGORÍA 4: IAPE (Anexo 2D · Hasta S/ 14,000)
    {
      id: 'base_iape_investigacion',
      areaLabel: 'IAPE (Línea 2) · Investigación-Acción Participativa en Aula',
      tematica: TEMATICAS_CNPIE[12],
      scopeTag: 'Categoría 4 · Anexo 2D IAPE · Hasta S/ 14,000',
      scopeGroup: 'iape',
      domain: 'lectura',
      recommendedCategory: '2D',
      problema: `¿Cómo transformar la práctica pedagógica expositiva que mantiene al 62% de los ${est} estudiantes de ${ie} (${dist}) en nivel Inicio en comprensión crítica y argumentación, mediante ciclos espirales participativos de investigación-acción docente-estudiantil?`,
    },
    // MODALIDADES Y CONDICIONES ESPECIALES DE LAS BASES (Inicial, EBA, EBE, Rural/Multigrado/VRAEM)
    {
      id: 'base_esp_multigrado_rural',
      areaLabel: 'Rural / Multigrado / VRAEM · Atención Simultánea y Diferenciada',
      tematica: TEMATICAS_CNPIE[11],
      scopeTag: 'Rural 1 (+10%) / Multigrado (+5%) / VRAEM-Frontera (+10%)',
      scopeGroup: 'modalidades_esp',
      domain: 'matematica',
      recommendedArea: 'Rural 1',
      recommendedZona: 'Multigrado / Unidocente',
      problema: `Desfase de aprendizajes en aulas multigrado/unidocentes rurales de ${ie} (${dist}), donde el 64% de estudiantes presenta bajo logro en matemática y comunicación por ausencia de guías de interaprendizaje autónomo multinivel adaptadas al calendario comunal.`,
    },
    {
      id: 'base_esp_inicial',
      areaLabel: 'EBR Inicial · Juego Libre, Psicomotricidad y Oralidad Temprana',
      tematica: TEMATICAS_CNPIE[0],
      scopeTag: 'Nivel Inicial · Juego y Lenguaje',
      scopeGroup: 'modalidades_esp',
      domain: 'lectura',
      recommendedNivel: 'Inicial',
      problema: `El 58% de niños y niñas de Educación Inicial de ${ie} (${dist}) muestra vocabulario reducido, timidez al expresarse oralmente y escasa exploración sensorial, debido a fichas de aprestamiento prematuras que desplazan el juego simbólico y los sectores interactivos.`,
    },
    {
      id: 'base_esp_eba',
      areaLabel: 'EBA (Básica Alternativa) · Competencias para Jóvenes y Adultos',
      tematica: TEMATICAS_CNPIE[7],
      scopeTag: 'Submodalidad EBA · Flexibilidad y Empleabilidad',
      scopeGroup: 'modalidades_esp',
      domain: 'sft_productivo',
      recommendedNivel: 'EBA',
      problema: `Alta intermitencia y dificultad para aplicar competencias comunicativas, cálculo financiero y gestión de microemprendimientos en estudiantes jóvenes y adultos de EBA de ${ie} (${dist}), debido a horarios rígidos y materiales escolares alejados de su realidad laboral.`,
    },
    {
      id: 'base_esp_ebe',
      areaLabel: 'EBE (Básica Especial) · Comunicación Aumentativa y Autonomía Funcional',
      tematica: TEMATICAS_CNPIE[5],
      scopeTag: 'Submodalidad EBE · SAANEE / Accesibilidad Total',
      scopeGroup: 'modalidades_esp',
      domain: 'inclusion',
      recommendedNivel: 'EBE',
      problema: `Limitada autonomía funcional y comunicación expresiva en estudiantes con discapacidad de EBE en ${ie} (${dist}), por carencia de tableros de comunicación aumentativa alternativa (CAA), materiales táctiles en relieve y capacitación práctica para sus familias.`,
    },
  ];
}

export function getProblemSuggestionsByModality(proj: ProjectModel): ProblemSuggestionOption[] {
  const all = getAllBasesProblemSuggestions(proj);

  if (proj.category === '2C' || proj.modalidad === 'MSE_SFT') {
    const sftFirst = all.filter((o) => o.scopeGroup === 'sft');
    const comp = all.filter((o) =>
      ['base_t9_digital', 'base_t4_ambiente', 'base_t13_evaluacion'].includes(o.id)
    );
    return [...sftFirst, ...comp];
  }

  if (proj.modalidad === 'EIB_AMAZ') {
    const eibFirst = all.filter((o) => o.scopeGroup === 'eib');
    const comp = all.filter((o) =>
      ['base_t1_lectura', 'base_t1_matematica', 'base_t4_ambiente', 'base_t7_socioemocional'].includes(
        o.id
      )
    );
    return [...eibFirst, ...comp];
  }

  if (proj.category === '2D') {
    const iapeFirst = all.filter((o) => o.scopeGroup === 'iape');
    const comp = all.filter((o) => o.scopeGroup === 'tematicas_eb');
    return [...iapeFirst, ...comp];
  }

  return all.filter((o) => o.scopeGroup === 'tematicas_eb' || o.id === 'base_t5_eib_bilingue');
}

export function applyProblemAlignment(
  proj: ProjectModel,
  nextProblemText: string,
  options: {syncTitleAndSolution?: boolean; syncBeneficiarios?: boolean; syncTrees?: boolean} = {}
): ProjectModel {
  const draft: ProjectModel = {
    ...proj,
    seed: {
      ...proj.seed,
      problema: nextProblemText,
    },
  };

  const profile = inferProblemProfile(nextProblemText, draft);

  const nextSeed = {
    ...draft.seed,
    tematicas: profile.tematicas,
    competencias: profile.competencias.slice(0, 2),
    titulo: options.syncTitleAndSolution ? profile.suggestedTitle : draft.seed.titulo,
    solucion: options.syncTitleAndSolution ? profile.suggestedSolution : draft.seed.solucion,
  };

  const aligned: ProjectModel = {
    ...draft,
    seed: nextSeed,
  };

  if (options.syncBeneficiarios || !aligned.beneficiarios?.directos?.trim()) {
    aligned.beneficiarios = generateBeneficiariosDefault(aligned);
  }

  if (options.syncTrees && aligned.arbolProblemas) {
    const ctx = buildProjectContext(aligned);
    const nextProbTree = generateArbolProblemasData(ctx);
    aligned.arbolProblemas = nextProbTree;
    aligned.arbolObjetivos = generateArbolObjetivosData(nextProbTree, ctx);
  } else if (aligned.arbolProblemas) {
    aligned.arbolProblemas = {
      ...aligned.arbolProblemas,
      problemaCentral: nextProblemText,
    };
  }

  return aligned;
}

export function buildProjectContext(proj: ProjectModel): ProjectContext {
  const fin = getProjectFinancialRules(proj);
  const parseComp = (c?: string) =>
    c && c.includes(':') ? c.split(':')[1].trim() : c || 'competencias priorizadas del CNEB';
  const rawProb = (proj.seed.problema || '').trim();
  const rawSol = (proj.seed.solucion || '').trim();
  const profile = inferProblemProfile(rawProb, proj);

  const effectiveComps =
    rawProb.length >= 10 &&
    profile.domain !== 'general' &&
    isFactoryDefaultCompetencias(proj.seed.competencias)
      ? profile.competencias
      : proj.seed.competencias;

  const effectiveTematicas =
    rawProb.length >= 10 &&
    profile.domain !== 'general' &&
    isFactoryDefaultTematicas(proj.seed.tematicas)
      ? profile.tematicas
      : proj.seed.tematicas;

  const comp1Str = effectiveComps[0] || profile.competencias[0];
  const comp2Str = effectiveComps[1] || profile.competencias[1] || comp1Str;

  return {
    cat: proj.category,
    mod: proj.modalidad,
    densidad: proj.densidad || 'optimo',
    ieNombre: proj.ie.nombre || 'la Institución Educativa',
    ieCodigo: proj.ie.codigo || '0000000',
    nivel: proj.ie.nivel || 'Educación Básica',
    estudiantes: proj.ie.estudiantes || 120,
    dre: proj.ie.dre || 'DRE correspondiente',
    ugel: proj.ie.ugel || 'UGEL correspondiente',
    region: proj.ie.region || 'la región',
    provincia: proj.ie.provincia || 'la provincia',
    distrito: proj.ie.distrito || 'el distrito',
    area: proj.ie.area || 'Rural 1',
    isEIB:
      proj.modalidad === 'EIB_AMAZ' ||
      Boolean(proj.ie.eib_tipo && proj.ie.eib_tipo !== 'No aplica'),
    eibTipo: proj.ie.eib_tipo || 'EIB',
    lengua: proj.ie.lengua || 'lengua originaria local',
    especialidad: proj.ie.especialidad || 'Formación Técnica',
    modulo: proj.ie.modulo || 'Módulo Formativo CNOF',
    director: proj.equipo.director.nombre || 'el/la Director(a) de la IE',
    coordinador: proj.equipo.coordinador.nombre || 'el/la Docente Coordinador(a)',
    titulo: proj.seed.titulo?.trim() || profile.suggestedTitle,
    tematica1: effectiveTematicas[0] || TEMATICAS_CNPIE[0],
    comp1: parseComp(comp1Str),
    comp2: parseComp(comp2Str),
    semillaProb:
      rawProb ||
      'Brecha significativa en el desarrollo de las competencias priorizadas detectada en la evaluación diagnóstica 2026.',
    semillaSol: rawSol || profile.suggestedSolution,
    hasCustomProb: rawProb.length >= 10,
    hasCustomSol: rawSol.length >= 10,
    fin,
    profile,
  };
}

export function getDefaultProblemaByModality(proj: ProjectModel): string {
  const suggestions = getProblemSuggestionsByModality(proj);
  return suggestions[0]?.problema || '';
}

export function getDefaultSolucionByModality(proj: ProjectModel): string {
  const profile = inferProblemProfile(proj.seed.problema || '', proj);
  return profile.suggestedSolution;
}

export function getContextualRubroSuggestions(
  fieldKey: string,
  proj: ProjectModel
): PedagogicalLogic & {contextualSuggestions: string[]} {
  const ctx = buildProjectContext(proj);
  const labels = getModalityAndProjectLabels(proj);
  const base: PedagogicalLogic = PEDAGOGICAL_LOGIC_MAP[fieldKey] || {
    focus: 'Coherencia pedagógica con el CNEB, el problema central y las evidencias de aula.',
    sequence: '1. Contexto y objetivo → 2. Estrategia concreta → 3. Evidencia verificable.',
    rubricCriteria:
      'Nivel IV exige precisión técnica, evidencias verificables y articulación directa con el problema central.',
    suggestions: [
      'Incorporar evidencias verificables y porcentajes reales de la Institución Educativa.',
      'Articular explícitamente las competencias priorizadas del CNEB y el rol protagonista de los estudiantes.',
    ],
  };

  const shortProb =
    ctx.semillaProb.length > 150 ? `${ctx.semillaProb.slice(0, 147).trim()}...` : ctx.semillaProb;

  const contextualSuggestions: string[] = [];

  if (fieldKey.startsWith('p1_')) {
    contextualSuggestions.push(
      `Enfoque del problema (${ctx.profile.domainLabel}): Relaciona "${shortProb}" con "${ctx.profile.causasDirectas[0]}" y "${ctx.profile.causasDirectas[1]}" respaldados con SIAGIE y Evaluación Diagnóstica 2026.`
    );
  } else if (fieldKey.startsWith('p2_')) {
    contextualSuggestions.push(
      `Estrategia acorde al problema: Detalla "${ctx.profile.fasesMetodologicas[1]}" movilizando "${ctx.comp1}" y "${ctx.comp2}" para superar "${shortProb}".`
    );
  } else if (fieldKey.startsWith('p3_')) {
    contextualSuggestions.push(
      `Pertinencia según el problema: Incorpora "${ctx.profile.necesidadesEstudiantes[0]}" y "${ctx.profile.demandasTerritorio[0]}" en ${ctx.distrito}.`
    );
  } else if (fieldKey.startsWith('p4_')) {
    contextualSuggestions.push(
      `Presupuesto alineado (${labels.montoLabel}): Prioriza en Bienes "${ctx.profile.cuadroBDescs.bien1}" y en Servicios "${ctx.profile.cuadroBDescs.serv1}".`
    );
  } else if (fieldKey.startsWith('p5_')) {
    contextualSuggestions.push(
      `Sostenibilidad frente al problema (${ctx.profile.domainLabel}): Incorpora compromisos en PEI, PAT y PCI de ${ctx.ieNombre} para sostener los logros más allá de 2027.`
    );
  } else {
    contextualSuggestions.push(
      `Resultados comparativos en ${ctx.profile.domainLabel}: Contrasta la línea de base ("${shortProb}") frente al avance logrado con actas refrendadas por la Dirección.`
    );
  }

  if (ctx.cat === '2C' || ctx.mod === 'MSE_SFT') {
    contextualSuggestions.push(
      `Enfoque MSE-SFT (Anexo 2C): Precisar el módulo formativo "${ctx.modulo}" de ${ctx.especialidad}, prototipado V1/V2, validación con usuarios reales y proporción 80% Bienes / 20% Servicios.`
    );
  } else if (ctx.cat === '2D') {
    contextualSuggestions.push(
      `Enfoque IAPE (Anexo 2D): Explicitar la pregunta de investigación, la hipótesis de acción participativa, la espiral de 4 momentos y el consentimiento informado (Ley N° 29733).`
    );
  } else if (ctx.isEIB) {
    contextualSuggestions.push(
      `Enfoque EIB (${ctx.eibTipo} · ${ctx.lengua}): Integrar diálogo de saberes con sabios/yachaq de ${ctx.distrito}, calendario comunal y uso pedagógico bilingüe.`
    );
  } else if (ctx.cat === '2A') {
    contextualSuggestions.push(
      `Enfoque Consolidados (Anexo 2A): Respaldar la trayectoria ≥ 2 años con cifras comparativas Antes vs. Después y fichas de monitoreo docente en 2 momentos.`
    );
  } else {
    contextualSuggestions.push(
      `Enfoque Promisorios (Anexo 2B): Resaltar la innovación metodológica frente a "${ctx.profile.domainLabel}", uso de kits contextualizados y rúbricas analíticas.`
    );
  }

  return {
    ...base,
    contextualSuggestions,
  };
}

function extractProblemKeywords(rawProb: string): string[] {
  const stop = new Set([
    'para', 'como', 'entre', 'sobre', 'hacia', 'desde', 'hasta', 'donde', 'cuando',
    'mediante', 'segun', 'durante', 'estudiantes', 'nivel', 'educativa', 'institucion',
    'escuela', 'colegio', 'grado', 'grados', 'debido', 'presenta', 'presentan', 'evidencia',
    'ubica', 'ubican', 'bajo', 'baja', 'limitado', 'limitada', 'escaso', 'escasa',
    'evaluacion', 'diagnostica', 'inicio', 'proceso', 'logrado', 'distrito', 'localidad',
    'region', 'provincia', 'nuestra', 'nuestro', 'porque', 'sobre', 'todos', 'todas',
    'menos', 'mayor', 'menor', 'falta', 'ausencia', 'incremento', 'dificultad', 'dificultades',
  ]);
  const tokens = normalizeTextForMatch(rawProb)
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 5 && !stop.has(w));
  return Array.from(new Set(tokens)).slice(0, 8);
}

function getSectionExpansionBlocks(fieldKey: string, ctx: ProjectContext): string[] {
  const p = ctx.profile;
  if (fieldKey.startsWith('p1_')) {
    return [
      `Desde la perspectiva del Marco Lógico y la triangulación diagnóstica, este análisis vincula directamente el problema central (${p.problemCore}) con las evidencias institucionales de SIAGIE, Evaluación Diagnóstica 2026 y ENLA 2025 en ${ctx.ieNombre}, garantizando consistencia vertical entre causas, efectos y metas al cierre de 2027.`,
      `Asimismo, la superación de estas brechas en ${p.domainLabel} responde al Compromiso de Gestión Escolar 1 (desarrollo integral de las y los ${ctx.estudiantes} estudiantes del nivel ${ctx.nivel}), orientando la toma de decisiones colegiadas en ${ctx.distrito}.`,
    ];
  }
  if (fieldKey.startsWith('p2_')) {
    return [
      `Metodológicamente, cada fase integra principios del Diseño Universal para el Aprendizaje (DUA) y evaluación formativa mediante rúbricas analíticas y portafolios, asegurando que la retroalimentación reflexiva permita a los ${ctx.estudiantes} estudiantes autorregular su progreso en "${ctx.comp1}" y "${ctx.comp2}".`,
      `De este modo, la propuesta supera prácticas rutinarias y convierte el entorno de ${ctx.distrito} (${ctx.region}) en un escenario vivo de indagación, creatividad y resolución auténtica frente a ${p.domainLabel}.`,
    ];
  }
  if (fieldKey.startsWith('p3_')) {
    return [
      `Esta articulación entre las expectativas reales de los ${ctx.estudiantes} estudiantes y las potencialidades culturales, ambientales y productivas de ${ctx.distrito} fortalece el sentido de pertenencia e igualdad de oportunidades educativas sin dejar a ningún estudiante atrás.`,
      `Por consiguiente, el diálogo permanente con familias, sabios locales y referentes territoriales de ${ctx.region} consolida aprendizajes situados directamente pertinentes para resolver ${p.domainLabel}.`,
    ];
  }
  if (fieldKey.startsWith('p4_')) {
    return [
      `En términos de gestión institucional y transparencia financiera en SIFINANCIA, cada actor asume responsabilidades verificables mediante actas y cada partida de Bienes (${ctx.fin.bienesPct}%) y Servicios (${ctx.fin.serviciosPct}%) responde estrictamente a las actividades priorizadas del Cuadro A.`,
      `De igual forma, la coordinación continua entre ${ctx.director}, ${ctx.coordinador}, APAFA y especialistas de la ${ctx.ugel} asegura ejecución oportuna y trazable durante el año escolar 2027.`,
    ];
  }
  if (fieldKey.startsWith('p5_')) {
    return [
      `Para garantizar continuidad más allá de 2027, los protocolos metodológicos, las comunidades profesionales de aprendizaje y los instrumentos de evaluación se incorporan formalmente en el PEI, PAT y PCI de ${ctx.ieNombre} durante las Semanas de Gestión.`,
      `Asimismo, las jornadas abiertas de socialización y la sistematización de lecciones aprendidas permiten transferir la experiencia a otras instituciones educativas de la ${ctx.ugel} en la región ${ctx.region}.`,
    ];
  }
  return [
    `Los resultados comparativos refrendados por ${ctx.director} corroboran que la intervención sostenida sobre ${p.domainLabel} transformó tanto los niveles de logro en "${ctx.comp1}" y "${ctx.comp2}" como la práctica pedagógica reflexiva del equipo docente de ${ctx.ieNombre}.`,
    `En consecuencia, la institucionalización en los documentos de gestión y la participación activa de las familias de ${ctx.distrito} respaldan la consolidación duradera de la innovación.`,
  ];
}

export function calibrateTextToWordTarget(
  paragraphs: string[],
  maxChars: number,
  targetWords: number,
  ctx: ProjectContext,
  fieldKey = ''
): string {
  const safeMaxChars = maxChars - 12;
  const minAcceptable = Math.max(35, targetWords - 12);
  const maxAcceptable = targetWords + 12;

  let fullText = paragraphs.join('\n\n').trim();

  const expansionBlocks = [
    ...getSectionExpansionBlocks(fieldKey, ctx),
    `En coherencia con el Proyecto Educativo Nacional al 2036 y el foco en ${ctx.profile.domainLabel}, ${ctx.ieNombre} (${ctx.distrito}) consolida procesos formativos situados y equitativos para los ${ctx.estudiantes} estudiantes de ${ctx.nivel}.`,
    `De manera complementaria, el desarrollo combinado de "${ctx.comp1}", "${ctx.comp2}" y la gestión autónoma del aprendizaje (Competencia 29) asegura transferencia sostenible a situaciones reales de su comunidad.`,
  ];

  let idx = 0;
  while (countWords(fullText) < targetWords && idx < expansionBlocks.length * 3) {
    const block = expansionBlocks[idx % expansionBlocks.length];
    if ((`${fullText}\n\n${block}`).length <= safeMaxChars) {
      fullText += `\n\n${block}`;
    } else {
      break;
    }
    idx++;
  }

  let wordsArr = fullText.split(/\s+/);
  if (wordsArr.length > maxAcceptable) {
    const slice = wordsArr.slice(0, targetWords + 6).join(' ');
    const lastPeriod = slice.lastIndexOf('.');
    if (
      lastPeriod >= Math.floor(slice.length * 0.72) &&
      countWords(slice.slice(0, lastPeriod + 1)) >= minAcceptable
    ) {
      fullText = slice.slice(0, lastPeriod + 1).trim();
    } else {
      const tighterSlice = wordsArr.slice(0, targetWords).join(' ');
      const tightPeriod = tighterSlice.lastIndexOf('.');
      if (tightPeriod >= Math.floor(tighterSlice.length * 0.78)) {
        fullText = tighterSlice.slice(0, tightPeriod + 1).trim();
      } else {
        fullText = `${tighterSlice.replace(/[,;:\-–]$/, '').trim()}.`;
      }
    }
  }

  while (fullText.length > safeMaxChars) {
    wordsArr = fullText.split(/\s+/);
    wordsArr.pop();
    fullText = `${wordsArr.join(' ').replace(/[,;:\-–]$/, '').trim()}.`;
  }

  return fullText.trim();
}

export function generateFieldContent(
  fieldKey: string,
  maxChars: number,
  ctx: ProjectContext,
  customTargetWords: number | null = null
): string {
  const p = ctx.profile;
  const probClean = p.problemCore;
  const eibClause = ctx.isEIB
    ? ` Asimismo, atendiendo el enfoque ${ctx.eibTipo} en ${ctx.lengua}, se articula el diálogo de saberes con los yachaq locales y la producción oral y escrita bilingüe.`
    : '';
  const sftClause =
    ctx.cat === '2C'
      ? ` En la especialidad técnica de ${ctx.especialidad} (${ctx.modulo}), se incorpora el diseño iterativo con Design Thinking, control de calidad y costeo real.`
      : '';

  const stripLabelPrefix = (s: string) => s.replace(/^[^:]+:\s*/, '').trim();

  const specificMap: Record<string, () => string[]> = {
    p1_1_1: () => [
      `En la ${ctx.ieNombre} (Código Modular ${ctx.ieCodigo}), ubicada en el distrito de ${ctx.distrito}, provincia de ${ctx.provincia} (${ctx.region}), el diagnóstico institucional basado en actas SIAGIE, la Evaluación Diagnóstica 2026 y el reporte ENLA 2025 ha permitido delimitar como problema central en torno a ${p.domainLabel} que: ${probClean}. Esta brecha incide directamente en el desempeño de "${ctx.comp1}" y "${ctx.comp2}" en los ${ctx.estudiantes} estudiantes del nivel ${ctx.nivel}.`,
      `Un análisis causal riguroso —articulado al Árbol de Problemas adjunto— evidencia que esta problemática responde a tres causas directas interrelacionadas. En primer lugar, en el plano de la mediación didáctica, se observa que: ${stripLabelPrefix(p.causasDirectas[0])} En segundo término, respecto a la pertinencia curricular: ${stripLabelPrefix(p.causasDirectas[1])} Finalmente, en relación con las condiciones materiales del aula: ${stripLabelPrefix(p.causasDirectas[2])}${eibClause}${sftClause}`,
      `De persistir estas causas, se consolidan tres consecuencias críticas en la trayectoria formativa de los estudiantes: ${stripLabelPrefix(p.efectosDirectos[0])} Asimismo, se advierte que: ${stripLabelPrefix(p.efectosDirectos[1])} Por consiguiente, se genera: ${stripLabelPrefix(p.efectosDirectos[2])} Todo ello configura como efecto final que ${p.efectoFinal.charAt(0).toLowerCase() + p.efectoFinal.slice(1)}`,
    ],
    p1_1_2: () => [
      `El problema central identificado en ${ctx.ieNombre} —centrado en ${p.domainLabel} (${probClean})— repercute de manera sistémica en tres dimensiones estratégicas del servicio educativo. En primer lugar, respecto al desarrollo de las competencias del CNEB ("${ctx.comp1}" y "${ctx.comp2}"), los portafolios y pruebas de entrada muestran limitaciones para analizar situaciones complejas, argumentar con evidencias y transferir aprendizajes hacia contextos reales de ${ctx.distrito}.${eibClause}${sftClause}`,
      `En segundo lugar, desde la práctica pedagógica docente, los registros de acompañamiento evidencian la necesidad de superar rutinas centradas en la exposición unilateral (${stripLabelPrefix(p.causasDirectas[0])}), fortaleciendo el trabajo colegiado y la retroalimentación reflexiva o por descubrimiento en aula.`,
      `Finalmente, en el ámbito de la gestión escolar (Compromiso de Gestión Escolar 1), si bien el PEI y el PAT priorizan la mejora continua de los aprendizajes, resulta indispensable institucionalizar comunidades profesionales docentes, dotación de recursos pertinentes y alianzas comunitarias sostenibles en ${ctx.distrito}.`,
    ],
    p1_2_1: () => [
      `OBJETIVO GENERAL (Criterios SMART):\n${p.metaObjetivoGeneral}, a través de la implementación sistemática e institucionalizada de "${ctx.titulo}", movilizando de manera articulada las competencias "${ctx.comp1}" y "${ctx.comp2}" en los ${ctx.estudiantes} estudiantes del nivel ${ctx.nivel} de ${ctx.ieNombre} (${ctx.distrito} - ${ctx.region}), para lograr que al menos el 75% alcance el nivel Logrado entre marzo y diciembre de 2027.`,
      `OBJETIVOS ESPECÍFICOS:\nEn coherencia directa con las causas del diagnóstico, se plantean tres objetivos específicos:\n1. ${p.objetivosEspecificos[0]}\n2. ${p.objetivosEspecificos[1]}\n3. ${p.objetivosEspecificos[2]}`,
    ],
    p1_2_2: () => [
      `Los objetivos propuestos mantienen una relación causal directa y verificable con el problema central (${probClean}) y con cada una de las raíces del Árbol de Problemas (Numeral 1.1.1), situando al estudiante como protagonista activo de su aprendizaje.`,
      `De manera específica, el Objetivo Específico 1 revierte la primera causa directa (${stripLabelPrefix(p.causasDirectas[0])}) al transformar la enseñanza expositiva en experiencias activas de indagación, colaboración y retroalimentación oportuna. A su vez, el Objetivo Específico 2 atiende las brechas curriculares y de recursos mediante materiales situados en ${ctx.distrito} bajo los principios del Diseño Universal para el Aprendizaje (DUA).${eibClause}${sftClause} Por último, el Objetivo Específico 3 consolida el liderazgo pedagógico directivo y la corresponsabilidad de familias y aliados de la ${ctx.ugel}.`,
    ],
    p2_1_1: () => [
      `Con el propósito de responder de forma rigurosa y situada al problema central delimitado en torno a ${p.domainLabel} (${probClean}), el proyecto "${ctx.titulo}" se sustenta en ${p.metodologiaFundamento}. En términos operativos, la estrategia central consiste en: ${ctx.semillaSol}`,
      `Para garantizar su aplicación coherente en el aula durante el año escolar 2027, la intervención pedagógica sigue una secuencia didáctica articulada en cuatro fases progresivas:\n• ${p.fasesMetodologicas[0]}\n• ${p.fasesMetodologicas[1]}\n• ${p.fasesMetodologicas[2]}\n• ${p.fasesMetodologicas[3]}\nDurante todo el ciclo, el docente actúa como mediador reflexivo y utiliza rúbricas analíticas, listas de cotejo y portafolios para brindar retroalimentación formativa oportuna.${eibClause}${sftClause}`,
    ],
    p2_1_2: () => [
      `Frente a las prácticas convencionales que originaron el problema central en ${p.domainLabel} dentro de ${ctx.ieNombre}, esta propuesta aporta un valor agregado concreto sustentado en cuatro transformaciones pedagógicas sustantivas:`,
      `1. ${p.rupturasInnovadoras[0]}\n2. ${p.rupturasInnovadoras[1]}\n3. ${p.rupturasInnovadoras[2]}\n4. ${p.rupturasInnovadoras[3]}\nDe esta manera, la innovación no constituye una actividad aislada, sino una reconfiguración integral del rol activo del estudiante, el aprovechamiento creativo del territorio de ${ctx.distrito} y la transferibilidad metodológica hacia otras instituciones educativas de la ${ctx.ugel}.${eibClause}${sftClause}`,
    ],
    p2_2_1: () => [
      `Para transformar de manera participativa y reflexiva el problema central (${probClean}) en ${ctx.ieNombre}, la ruta metodológica de la Investigación-Acción Participativa Educativa (IAPE) se despliega en cuatro momentos espirales articulados: primero, una deconstrucción crítica colegiada sobre las prácticas actuales vinculadas a ${p.domainLabel} mediante diarios de campo; segundo, la planificación participativa de hipótesis de acción junto a docentes y estudiantes co-investigadores (${p.fasesMetodologicas[0]}).${eibClause}`,
      `En un tercer momento, se ejecuta la acción transformadora en aula mediante "${ctx.semillaSol}", registrando sistemáticamente evidencias en diarios de campo y bitácoras estudiantiles. Finalmente, en el cuarto momento de reflexión y devolución comunitaria en ${ctx.distrito}, se triangulan los hallazgos, se ajustan estrategias con familias y se resguarda estrictamente la ética investigativa mediante consentimiento informado y asentimiento estudiantil conforme a la Ley N° 29733.`,
    ],
    p3_1_1: () => [
      `A partir de la aplicación de encuestas diagnósticas y grupos focales a los ${ctx.estudiantes} estudiantes del nivel ${ctx.nivel} de ${ctx.ieNombre}, se identificaron cuatro necesidades e intereses auténticos estrechamente vinculados a la superación del problema central en ${p.domainLabel}:`,
      `En primer lugar, destaca que: ${p.necesidadesEstudiantes[0]} En segundo término, se recogió que: ${p.necesidadesEstudiantes[1]} Asimismo, las voces estudiantiles señalan: ${p.necesidadesEstudiantes[2]} Por último, resulta clave atender que: ${p.necesidadesEstudiantes[3]} Estas evidencias orientan el diseño de actividades inclusivas (DUA) adaptadas a diversos ritmos y estilos de aprendizaje.${sftClause}`,
    ],
    p3_2_1: () => [
      `La pertinencia territorial y sociocultural de la propuesta se fundamenta en su articulación orgánica con cuatro demandas y potencialidades reales del distrito de ${ctx.distrito}, provincia de ${ctx.provincia} (${ctx.region}), todas ellas vinculadas directamente a ${p.domainLabel}:`,
      `En primer lugar, el proyecto impulsa: ${p.demandasTerritorio[0]} En segundo orden, promueve: ${p.demandasTerritorio[1]}${eibClause} De manera complementaria, atiende: ${p.demandasTerritorio[2]} Finalmente, consolida: ${p.demandasTerritorio[3]} Con ello, los aprendizajes del CNEB cobran sentido vital para los estudiantes y sus familias.${sftClause}`,
    ],
    p4_1_1: () => [
      `La gestión del proyecto en ${ctx.ieNombre} se sustenta en una gobernanza participativa que moviliza actores internos y externos con roles específicos para revertir el problema central (${probClean}):\n\nACTORES INTERNOS (4): El/la Director(a) (${ctx.director}) ejerce el liderazgo institucional, el monitoreo en ${p.domainLabel} y la gestión transparente en SIFINANCIA; el/la Docente Coordinador(a) (${ctx.coordinador}) y el equipo docente lideran la planificación curricular, mediación situada y sistematización; los ${ctx.estudiantes} estudiantes participan como protagonistas y brigadas de coevaluación; y la APAFA junto a los Comités de Aula brindan acompañamiento familiar y soporte logístico.`,
      `ACTORES EXTERNOS (3): Los especialistas de la ${ctx.ugel} brindan asistencia técnica pedagógica y articulan la transferencia en redes; la Municipalidad Distrital de ${ctx.distrito} y las autoridades comunales facilitan espacios y logística territorial; y los sabios locales junto a aliados técnicos de ${ctx.region} enriquecen el diálogo de saberes y la validación formativa.`,
    ],
    p3_1_2: () => [
      `La IAPE en ${ctx.ieNombre} consolida espacios institucionales permanentes de reflexión crítica colegiada, toma de decisiones democrática y devolución de hallazgos en torno a ${p.domainLabel} (${probClean}).`,
      `Operativamente, mediante reuniones quincenales de Comunidades Profesionales de Aprendizaje (CPA), docentes y estudiantes co-investigadores analizan diarios de campo y evidencias de "${ctx.comp1}" para reajustar las hipótesis de acción. Al concluir cada ciclo espiral en ${ctx.distrito}, se desarrollan jornadas abiertas de devolución en lenguaje accesible ante familias y directivos, validando los avances y registrando los acuerdos en actas formales.`,
    ],
    p4_1_2: () => [
      `El sistema de registro, triangulación de evidencias y aprendizaje colectivo de la IAPE en ${ctx.ieNombre} garantiza rigor metodológico y trazabilidad ética al investigar cómo superar el problema central en ${p.domainLabel}.`,
      `Para evitar sesgos interpretativos, se triangulan sistemáticamente tres fuentes complementarias —diarios de campo docentes, bitácoras y portafolios estudiantiles en "${ctx.comp1}" y "${ctx.comp2}", además de resultados diagnósticos y observaciones de aula— bajo resguardo ético (codificación anónima y consentimiento informado), sistematizando trimestralmente lecciones aprendidas compartidas con la red de la ${ctx.ugel}.`,
    ],
    p4_2_1: () => [
      `El Plan de Implementación (Cuadro A) y el Presupuesto detallado (Cuadro B - Anexo N° 5 por S/ ${ctx.fin.maxMonto.toLocaleString('es-PE')}) guardan estricta coherencia técnica y financiera con los objetivos destinados a revertir el problema central en ${p.domainLabel}.`,
      `En el rubro Bienes (${ctx.fin.bienesPct}% = S/ ${ctx.fin.maxBienes.toLocaleString('es-PE')}), cada adquisición responde directamente a las Actividades 2 y 3 del Cuadro A mediante ${p.cuadroBDescs.bien1}, complementado con ${p.cuadroBDescs.bien2}. Por su parte, el rubro Servicios (${ctx.fin.serviciosPct}% = S/ ${ctx.fin.maxServicios.toLocaleString('es-PE')}) viabiliza las Actividades 1, 4 y 5 a través de ${p.cuadroBDescs.serv1} y ${p.cuadroBDescs.serv2}, cumpliendo íntegramente los topes y criterios de transparencia de SIFINANCIA.`,
    ],
    p5_1_1: () => [
      `Para asegurar la continuidad pedagógica e institucional del proyecto y evitar la reaparición del problema central (${probClean}), ${ctx.ieNombre} implementa cuatro estrategias de sostenibilidad articuladas desde el inicio hasta el cierre del 2027:`,
      `1. Conformación de Comunidades Profesionales de Aprendizaje (CPA) con pasantías internas y modelamiento entre pares sobre metodologías activas en ${p.domainLabel}.\n2. Protocolo institucional de inventario, mantenimiento y reposición solidaria de recursos junto a APAFA y CONEI.\n3. Formación de brigadas y líderes estudiantiles que aseguran el relevo intergeneracional en aula.\n4. Consolidación de alianzas permanentes con la ${ctx.ugel}, el gobierno local de ${ctx.distrito} y sabios/aliados de ${ctx.region}.${eibClause}${sftClause}`,
    ],
    p5_1_2: () => [
      `La institucionalización curricular y organizacional de "${ctx.titulo}" en ${ctx.ieNombre} se concreta de manera planificada durante las Semanas de Gestión (marzo, julio y noviembre de 2027), integrando la propuesta al núcleo de la gestión escolar:`,
      `En el Proyecto Educativo Institucional (PEI), se incorporan las metas de mejora frente a ${p.domainLabel} dentro de los objetivos estratégicos y el CGE 1; en el Plan Anual de Trabajo (PAT), se programan las jornadas colegiadas, visitas de monitoreo y ferias abiertas del Día del Logro; y en el Proyecto Curricular Institucional (PCI) y programaciones anuales de ${ctx.nivel}, se integran de forma estable las cuatro fases metodológicas y rúbricas de "${ctx.comp1}" y "${ctx.comp2}".${eibClause}${sftClause}`,
    ],
    p5_1_3: () => [
      `El seguimiento, monitoreo y evaluación formativa de la experiencia en ${ctx.ieNombre} permiten verificar la superación progresiva del problema central en ${p.domainLabel} mediante tres mecanismos técnicos complementarios durante el año 2027:`,
      `1. Evaluación comparativa en tres hitos (Entrada en marzo, Proceso en julio y Salida en noviembre) con rúbricas analíticas y pruebas situadas para medir el progreso en "${ctx.comp1}" y "${ctx.comp2}".\n2. Acompañamiento docente bimestral entre pares liderado por ${ctx.director} y ${ctx.coordinador} con fichas de observación reflexiva y compromisos de mejora.\n3. Encuestas semestrales de voz estudiantil y grupos focales familiares que retroalimentan oportunamente los ajustes del Cuadro A.`,
    ],
    p5_2_1: () => [
      `La estrategia de comunicación y difusión socializa de forma transparente los avances y logros obtenidos frente a ${p.domainLabel} tanto dentro de ${ctx.ieNombre} como en el ámbito comunitario de ${ctx.distrito}, mediante cuatro líneas de acción:`,
      `1. Ferias Pedagógicas Abiertas y Día del Logro (julio y noviembre 2027), donde los ${ctx.estudiantes} estudiantes exponen evidencias y producciones auténticas ante familias y autoridades.\n2. Boletines y murales informativos bilingües o comunitarios con difusión bimestral de avances.${eibClause}\n3. Microprogramas radiales o digitales institucionales con testimonios de aula sobre la superación del problema central.\n4. Pasantías en red con escuelas vecinas de la ${ctx.ugel} y publicación en la Red de Docentes Innovadores del FONDEP.`,
    ],
    p5_3_1: () => [
      `La sistematización basada en evidencias del proceso formativo y productivo en ${ctx.especialidad} (${ctx.modulo}) permite documentar el aprendizaje técnico alcanzado frente al problema central (${probClean}) mediante tres mecanismos rigurosos:`,
      `1. Bitácora técnica y Dossier de Prototipo V1/V2 con mapas de empatía, pruebas de control de calidad, hojas de costos y mejoras validadas con usuarios reales de ${ctx.distrito}.\n2. Talleres semestrales de reconstrucción crítica colegiada para analizar aciertos, nudos productivos y competencias CNEB/CNOF.\n3. Edición de una Guía Metodológica Transferible para su réplica en otras IIEE MSE-SFT de la ${ctx.ugel} y ${ctx.region}.`,
    ],
    p6_1_1: () => [
      `La contrastación rigurosa entre la línea de base inicial y los resultados consolidados en ${ctx.ieNombre} demuestra avances sustantivos y verificables frente al problema central en ${p.domainLabel} (${probClean}):`,
      `1. En la competencia "${ctx.comp1}", se pasó del 18% al 74% (+56 puntos porcentuales) de estudiantes en nivel Logrado según actas SIAGIE refrendadas por ${ctx.director}.\n2. En "${ctx.comp2}", el nivel Inicio se redujo del 58% al 9%, alcanzando el 76% en nivel Logrado.\n3. Respecto a autonomía y dominio en ${p.domainLabel} (C29), el 84% de los ${ctx.estudiantes} estudiantes planifica y autoevalúa sus productos.\n4. La participación activa de familias y aliados de ${ctx.distrito} se elevó del 38% al 85% en jornadas pedagógicas.${eibClause}`,
    ],
    p6_1_2: () => [
      `Tras más de dos años de implementación sostenida en ${p.domainLabel}, ${ctx.ieNombre} evidencia transformaciones institucionales verificables en tres dimensiones articuladas:`,
      `1. Práctica pedagógica docente: las fichas de monitoreo en dos momentos confirman la transición del 35% al 95% de docentes que aplican "${ctx.semillaSol}" con retroalimentación por descubrimiento.\n2. Gestión escolar colegiada: el liderazgo directivo consolidó Semanas de Gestión productivas e institucionalizó la propuesta en PEI, PAT y PCI.\n3. Participación comunitaria: actas del CONEI, APAFA y convenios locales en ${ctx.distrito} respaldan su continuidad.`,
    ],
  };

  const fn = specificMap[fieldKey];
  const paragraphs = fn
    ? fn()
    : [
        `En el marco del proyecto "${ctx.titulo}" implementado en la ${ctx.ieNombre} (${ctx.distrito} - ${ctx.region}), la propuesta educativa aborda de forma lógica y situada el problema central en ${p.domainLabel} (${probClean}), fortaleciendo "${ctx.comp1}" y "${ctx.comp2}" en los ${ctx.estudiantes} estudiantes del nivel ${ctx.nivel}.${eibClause}${sftClause}`,
        `De manera coherente, la solución planteada (${ctx.semillaSol}) cumple los estándares de excelencia de Nivel IV de las Bases CNPIE 2027, articulando evaluación formativa continua, pertinencia territorial de ${ctx.distrito}, cogestión con actores de la ${ctx.ugel} y sostenibilidad institucional en el PEI, PAT y PCI al cierre del año escolar 2027.`,
      ];

  const {maxWordsBases, metaPalabras} = getWordTargetMetrics(maxChars);
  let targetWords = metaPalabras;
  if (customTargetWords !== null) {
    targetWords = customTargetWords;
  } else if (ctx.densidad === 'sintetico') {
    targetWords = Math.max(50, metaPalabras - 60);
  } else if (ctx.densidad === 'extenso') {
    targetWords = Math.min(maxWordsBases - 35, metaPalabras + 55);
  }

  return calibrateTextToWordTarget(paragraphs, maxChars, targetWords, ctx, fieldKey);
}

export interface QuickAuditCheck {
  id: string;
  label: string;
  passed: boolean;
  detail: string;
}

export interface QuickAuditResult {
  verdict: 'optimo' | 'ajustar' | 'critico';
  score: number;
  scopeLabel: string;
  analyzedExcerpt: string;
  normativa: {
    paragraphWords: number;
    totalWords: number;
    metaPalabras: number;
    maxWordsBases: number;
    totalChars: number;
    maxChars: number;
    marginToMaxWords: number;
    status: 'ok' | 'short' | 'over';
    summary: string;
  };
  checks: QuickAuditCheck[];
  recommendations: string[];
}

export function runQuickParagraphAudit(
  fullText: string,
  selectedFragment: string,
  selectionMode: 'selection' | 'cursor_paragraph' | 'full_rubro',
  paragraphNumber: number | null,
  field: Pick<SchemaField, 'key' | 'code' | 'label' | 'maxChars'>,
  proj: ProjectModel
): QuickAuditResult {
  const ctx = buildProjectContext(proj);
  const {maxWordsBases, metaPalabras} = getWordTargetMetrics(field.maxChars);

  const cleanFull = (fullText || '').trim();
  const targetText = (selectedFragment || cleanFull).trim();
  const normTarget = normalizeTextForMatch(targetText);

  const paragraphWords = countWords(targetText);
  const totalWords = countWords(cleanFull);
  const totalChars = cleanFull.length;
  const marginToMaxWords = maxWordsBases - totalWords;

  let scopeLabel = 'Texto completo del rubro';
  if (selectionMode === 'selection') {
    scopeLabel = `Fragmento seleccionado (${paragraphWords} pal.)`;
  } else if (selectionMode === 'cursor_paragraph' && paragraphNumber !== null) {
    scopeLabel = `Párrafo ${paragraphNumber} activo (${paragraphWords} pal.)`;
  } else {
    scopeLabel = `Rubro completo (${totalWords} pal.)`;
  }

  let normStatus: 'ok' | 'short' | 'over' = 'ok';
  let normSummary = `Dentro del rango normativo FONDEP (${totalWords} / ${maxWordsBases} palabras máx.; meta ideal ${metaPalabras} pal.).`;
  if (totalWords > maxWordsBases || totalChars > field.maxChars) {
    normStatus = 'over';
    normSummary = `Excede el tope de las Bases FONDEP (${totalWords}/${maxWordsBases} pal. o ${totalChars}/${field.maxChars} car.). Debe recortarse para evitar corte o penalidad.`;
  } else if (totalWords < Math.floor(metaPalabras * 0.65)) {
    normStatus = 'short';
    normSummary = `Extensión insuficiente frente a la meta recomendada FONDEP (${totalWords}/${metaPalabras} pal.). Amplía el sustento para aspirar al Nivel IV.`;
  }

  // 1. Conexión con el Problema Central y competencias CNEB
  const probKeywords = extractProblemKeywords(ctx.semillaProb);
  const compKeywords = extractProblemKeywords(`${ctx.comp1} ${ctx.comp2}`);
  const domainKeywords = extractProblemKeywords(ctx.profile.domainLabel);
  const allAnchorWords = Array.from(new Set([...probKeywords, ...compKeywords, ...domainKeywords]));
  const matchedAnchors = allAnchorWords.filter((kw) => normTarget.includes(kw));
  const problemAligned =
    paragraphWords >= 8 &&
    (matchedAnchors.length >= 2 ||
      (matchedAnchors.length >= 1 &&
        /(problema|brecha|competencia|cneb|estudiantes|aprendizaje)/.test(normTarget)));

  // 2. Coherencia pedagógica específica con el numeral CNPIE
  const rubricRuleMap: Array<[RegExp, RegExp, string]> = [
    [
      /^p1_1_1$/,
      /(siagie|enla|diagnost|evaluacion|%|causa|efecto|consecuencia|evidencia)/,
      'Incluye evidencias diagnósticas (SIAGIE/ENLA/%) o relación causa-efecto del numeral 1.1.1.',
    ],
    [
      /^p1_1_2$/,
      /(competencia|cneb|practica|docente|gestion|pei|pat|cge|retroalimentacion)/,
      'Articula impacto en competencias CNEB, práctica docente o gestión escolar (1.1.2).',
    ],
    [
      /^p1_2_1$/,
      /(objetivo|%|2027|lograr|fortalecer|implementar|desarrollar|mejorar|revertir|superar|smart)/,
      'Contiene verbo de acción, meta verificable o temporalidad 2027 (criterios SMART 1.2.1).',
    ],
    [
      /^p1_2_2$/,
      /(coherencia|causa|objetivo|protagonista|estudiante|dua|vinculo)/,
      'Explicita consistencia causal diagnóstico-objetivos y rol activo estudiantil (1.2.2).',
    ],
    [
      /^p2_1_1$|^p2_2_1$/,
      /(fase|etapa|momento|secuencia|estrategia|metodolog|rubrica|retroalimentacion|portafolio|iape|diario|etica|29733)/,
      'Describe secuencia metodológica, mediación o evaluación formativa acorde al criterio 2.x.',
    ],
    [
      /^p2_1_2$/,
      /(valor agregado|innovac|diferencia|tradicional|frente a|ruptura|creativ|territori|transferib)/,
      'Distingue el valor agregado o ruptura innovadora frente a la enseñanza convencional (2.1.2).',
    ],
    [
      /^p3_1_1$|^p3_1_2$/,
      /(necesidad|interes|estudiante|%|encuesta|grupo focal|voz|reflexion|devolucion|cpa)/,
      'Sustenta voz/necesidades estudiantiles o reflexión colegiada (3.1).',
    ],
    [
      /^p3_2_1$/,
      /(territori|comunidad|cultur|local|distrito|region|saber|yachaq|bilingue|lengua|ambiental|productiv)/,
      'Integra pertinencia territorial, cultural, lingüística o comunitaria (3.2.1).',
    ],
    [
      /^p4_1_1$|^p4_1_2$/,
      /(director|docente|estudiante|apafa|ugel|municipalidad|aliado|actor|triangulacion|evidencia)/,
      'Precisa roles de actores internos/externos o triangulación de evidencias (4.1).',
    ],
    [
      /^p4_2_1$/,
      /(cuadro a|cuadro b|anexo 5|bienes|servicios|presupuesto|sifinancia|%|actividad)/,
      'Vincula explícitamente el Cuadro A de actividades con Bienes y Servicios del Cuadro B (4.2.1).',
    ],
    [
      /^p5_/,
      /(pei|pat|pci|sostenib|monitoreo|evaluacion|hito|entrada|proceso|salida|difusion|feria|sistematiz|guia|cpa)/,
      'Incorpora institucionalización (PEI/PAT/PCI), monitoreo, difusión o sistematización (5.x).',
    ],
    [
      /^p6_/,
      /(antes|despues|linea de base|resultado|%|incremento|reduccion|monitoreo|acta|refrendad)/,
      'Presenta datos comparativos verificables Antes vs. Después o monitoreo docente (6.x).',
    ],
  ];

  const matchedRule = rubricRuleMap.find(([re]) => re.test(field.key));
  const numeralAligned = matchedRule ? matchedRule[1].test(normTarget) : paragraphWords >= 12;
  const numeralDetail = matchedRule
    ? matchedRule[2]
    : `Pertinente al criterio del numeral ${field.code}.`;

  // 3. Cohesión académica, conectores y estructura del párrafo
  const hasConnectors =
    /(asimismo|por ello|en consecuencia|mediante|a traves de|con el fin|con el proposito|debido a|considerando|ademas|en primer lugar|en segundo|por consiguiente|frente a|respecto a|sin embargo|de igual modo|a su vez|finalmente)/.test(
      normTarget
    );
  const hasPunctuation = /[.,;:]/.test(targetText);
  const cohesionPassed =
    paragraphWords >= (selectionMode === 'selection' ? 10 : 20) &&
    hasPunctuation &&
    (hasConnectors || paragraphWords >= 28);

  // 4. Cumplimiento de extensión del fragmento y del rubro FONDEP
  const lengthOk =
    normStatus === 'ok' &&
    (selectionMode === 'full_rubro' || (paragraphWords >= 15 && paragraphWords <= 190));

  const checks: QuickAuditCheck[] = [
    {
      id: 'normativa_palabras',
      label: 'Límite de palabras FONDEP',
      passed: normStatus === 'ok',
      detail:
        normStatus === 'ok'
          ? `Cumple normativa: ${totalWords} palabras totales (tope ${maxWordsBases}, margen de ${marginToMaxWords} pal.; párrafo analizado: ${paragraphWords} pal.).`
          : normSummary,
    },
    {
      id: 'coherencia_problema',
      label: 'Coherencia con el Problema Central',
      passed: problemAligned,
      detail: problemAligned
        ? `Alineado al foco del problema y competencias (${matchedAnchors.slice(0, 4).join(', ')}).`
        : `El fragmento no evidencia conexión clara con los términos clave del Problema Central (${allAnchorWords.slice(0, 4).join(', ') || ctx.profile.domainLabel}).`,
    },
    {
      id: 'coherencia_numeral',
      label: `Criterio pedagógico (${field.code})`,
      passed: numeralAligned,
      detail: numeralAligned
        ? numeralDetail
        : `Falta explicitar elementos propios del numeral ${field.code}: ${numeralDetail}`,
    },
    {
      id: 'claridad_academica',
      label: 'Redacción académica y cohesión',
      passed: cohesionPassed && (selectionMode === 'full_rubro' || paragraphWords <= 190),
      detail:
        paragraphWords < 10
          ? `Fragmento muy breve (${paragraphWords} pal.): selecciona un párrafo completo para evaluar cohesión.`
          : paragraphWords > 190
          ? `Párrafo muy extenso (${paragraphWords} pal.): conviene dividirlo en 2 párrafos para facilitar la lectura del jurado.`
          : cohesionPassed
          ? `Buena fluidez, puntuación y conectores lógicos (${paragraphWords} pal.).`
          : `Conviene incorporar conectores lógicos (ej. "asimismo", "en consecuencia", "mediante") y cerrar ideas con claridad.`,
    },
  ];

  const passedCount = checks.filter((c) => c.passed).length;
  let score = Math.round((passedCount / checks.length) * 100);
  if (normStatus === 'over') score = Math.min(score, 45);
  if (totalWords === 0) score = 0;

  let verdict: 'optimo' | 'ajustar' | 'critico' = 'optimo';
  if (normStatus === 'over' || score < 50) {
    verdict = 'critico';
  } else if (score < 85 || normStatus === 'short') {
    verdict = 'ajustar';
  }

  const recommendations: string[] = [];
  if (normStatus === 'over') {
    recommendations.push(
      `Recorta ${Math.max(1, totalWords - maxWordsBases + 10)} palabras del rubro para respetar el límite máximo oficial (${maxWordsBases} pal. / ${field.maxChars} car.).`
    );
  } else if (normStatus === 'short') {
    recommendations.push(
      `Agrega aproximadamente ${Math.max(15, metaPalabras - totalWords)} palabras para alcanzar la meta recomendada FONDEP (${metaPalabras} pal.).`
    );
  }
  if (!problemAligned) {
    recommendations.push(
      `Conecta este párrafo directamente con el Problema Central ("${ctx.profile.problemCore.slice(0, 90)}...") y las competencias "${ctx.comp1}".`
    );
  }
  if (!numeralAligned) {
    recommendations.push(
      `Refuerza los criterios de rúbrica Nivel IV del numeral ${field.code}: ${numeralDetail}`
    );
  }
  if (!cohesionPassed || paragraphWords > 190) {
    recommendations.push(
      paragraphWords > 190
        ? 'Divide este bloque en dos párrafos temáticos cortos con conectores de transición.'
        : 'Enlaza las oraciones con conectores académicos ("En primer lugar", "Por consiguiente", "Mediante") para mayor claridad.'
    );
  }
  if (recommendations.length === 0 && lengthOk) {
    recommendations.push(
      `El párrafo y el rubro cumplen con la coherencia pedagógica y los límites normativos del FONDEP CNPIE 2027.`
    );
  }

  return {
    verdict,
    score,
    scopeLabel,
    analyzedExcerpt:
      targetText.length > 150 ? `${targetText.slice(0, 147).trim()}...` : targetText || '(Sin texto aún)',
    normativa: {
      paragraphWords,
      totalWords,
      metaPalabras,
      maxWordsBases,
      totalChars,
      maxChars: field.maxChars,
      marginToMaxWords,
      status: normStatus,
      summary: normSummary,
    },
    checks,
    recommendations,
  };
}

export type RubricLevelId = 'Nivel IV' | 'Nivel III' | 'Nivel II' | 'Nivel I';

export interface RubricDepthCriterion {
  id: string;
  label: string;
  passed: boolean;
  detail: string;
}

export interface RubricFieldComparison {
  fieldKey: string;
  sectionId: string;
  sectionTab: string;
  order: number;
  code: string;
  label: string;
  words: number;
  metaPalabras: number;
  maxWordsBases: number;
  score: number;
  level: RubricLevelId;
  needsDepth: boolean;
  isOverLimit: boolean;
  rubricCriteria: string;
  criteriaChecks: RubricDepthCriterion[];
  argumentGaps: string[];
  actionHint: string;
}

export interface RubricNivel4Report {
  overallPct: number;
  estimatedLevel: RubricLevelId;
  totalFields: number;
  nivel4Count: number;
  needsDepthCount: number;
  criticalCount: number;
  items: RubricFieldComparison[];
  byFieldKey: Record<string, RubricFieldComparison>;
}

const NUMERAL_RUBRIC_SPECS: Array<{
  pattern: RegExp;
  regex: RegExp;
  minCountHint?: number;
  requirementLabel: string;
  missingMsg: string;
}> = [
  {
    pattern: /^p1_1_1$/,
    regex: /(siagie|enla|diagnost|evaluacion|%|\bcausa|\befecto|consecuencia|evidencia)/,
    minCountHint: 2,
    requirementLabel: 'Diagnóstico cuantitativo (SIAGIE/ENLA/%) con 3+ causas y efectos',
    missingMsg:
      'Incluye porcentajes reales de evaluación diagnóstica (SIAGIE/ENLA) y precisa 3 causas directas con sus efectos.',
  },
  {
    pattern: /^p1_1_2$/,
    regex: /(competencia|cneb|practica|docente|gestion|pei|pat|cge|retroalimentacion|desarrollo integral)/,
    requirementLabel: 'Triangulación en Competencias CNEB, Práctica Docente y Gestión (CGE)',
    missingMsg:
      'Explica cómo el problema afecta las competencias del CNEB, la retroalimentación docente y la gestión escolar.',
  },
  {
    pattern: /^p1_2_1$/,
    regex: /(objetivo|%|2027|lograr|fortalecer|implementar|desarrollar|mejorar|revertir|superar|especifico)/,
    requirementLabel: 'Objetivos SMART con verbo en infinitivo, meta % y plazo 2027',
    missingMsg:
      'Redacta cada objetivo con verbo en infinitivo, cambio porcentual verificable, población y horizonte 2027.',
  },
  {
    pattern: /^p1_2_2$/,
    regex: /(coherencia|causa|objetivo|protagonista|estudiante|dua|autonomia|diversidad)/,
    requirementLabel: 'Consistencia causal causas-objetivos y rol protagonista estudiantil',
    missingMsg:
      'Demuestra la correspondencia entre cada causa del diagnóstico y los objetivos, destacando el rol activo y DUA.',
  },
  {
    pattern: /^p2_1_1$/,
    regex: /(fase|etapa|momento|secuencia|estrategia|metodolog|rubrica|retroalimentacion|portafolio|lista de cotejo|cneb)/,
    requirementLabel: 'Secuencia metodológica paso a paso, fundamento teórico y evaluación formativa',
    missingMsg:
      'Detalla las fases pedagógicas en aula, su sustento en el CNEB, frecuencia semanal e instrumentos formativos.',
  },
  {
    pattern: /^p2_1_2$/,
    regex: /(valor agregado|innovac|diferencia|tradicional|frente a|ruptura|creativ|territori|antes)/,
    requirementLabel: 'Contraste explícito frente a la enseñanza tradicional y valor creativo',
    missingMsg:
      'Contrasta claramente qué rompe con la práctica tradicional y cuál es el valor agregado creativo en el territorio.',
  },
  {
    pattern: /^p2_2_1$/,
    regex: /(espiral|deconstruc|planific|accion|reflexion|diario de campo|bitacora|consentimiento|29733|co-investigador)/,
    requirementLabel: '4 momentos de la ruta IAPE, diarios/bitácoras y ética (Ley N° 29733)',
    missingMsg:
      'Describe los 4 momentos espirales de la IAPE, el rol de co-investigadores, diarios de campo y consentimiento informado.',
  },
  {
    pattern: /^p3_1_1$/,
    regex: /(necesidad|interes|estudiante|%|encuesta|grupo focal|voz|ritmo|estilo)/,
    minCountHint: 2,
    requirementLabel: 'Sustento de 4+ necesidades e intereses estudiantiles con evidencia diagnóstica',
    missingMsg:
      'Sustenta al menos 4 necesidades e intereses recogidos de los estudiantes (encuesta o grupo focal) con porcentajes.',
  },
  {
    pattern: /^p3_1_2$/,
    regex: /(reflexion|colegiad|gia|asamblea|devolucion|hallazgo|estudiante|familia|acta)/,
    requirementLabel: 'Reflexión colegiada democrática y devolución accesible de hallazgos',
    missingMsg:
      'Detalla las jornadas de reflexión colegiada y cómo se devuelven los hallazgos en lenguaje accesible a estudiantes y familias.',
  },
  {
    pattern: /^p3_2_1$/,
    regex: /(territori|comunidad|cultur|local|distrito|region|saber|yachaq|bilingue|lengua|ambiental|productiv)/,
    minCountHint: 2,
    requirementLabel: 'Pertinencia territorial, saberes locales, lengua e interculturalidad',
    missingMsg:
      'Vincula 4 demandas o potencialidades del territorio con saberes comunitarios, lengua o contexto socioambiental.',
  },
  {
    pattern: /^p4_1_1$/,
    regex: /(director|docente|estudiante|apafa|ugel|municipalidad|aliado|actor|conei|comite|acta)/,
    minCountHint: 2,
    requirementLabel: 'Participación de 3+ actores internos y 3+ externos respaldados con actas',
    missingMsg:
      'Precisa los mecanismos de cogestión y roles de al menos 3 actores internos y 3 externos con actas de compromiso.',
  },
  {
    pattern: /^p4_1_2$/,
    regex: /(triangulacion|diario|bitacora|observacion|cuantitativ|cualitativ|sesgo|evidencia)/,
    requirementLabel: 'Triangulación rigurosa de datos cuantitativos y cualitativos sin sesgos',
    missingMsg:
      'Explica cómo triangulas diarios de campo, bitácoras y resultados de aprendizaje para validar hallazgos sin sesgos.',
  },
  {
    pattern: /^p4_2_1$/,
    regex: /(cuadro a|cuadro b|anexo 5|bienes|servicios|presupuesto|sifinancia|%|actividad)/,
    requirementLabel: 'Vinculación directa de Bienes y Servicios (Cuadro B) con Cuadro A',
    missingMsg:
      'Justifica cada partida de Bienes y Servicios vinculándola explícitamente a las actividades del Cuadro A y proporciones.',
  },
  {
    pattern: /^p5_1_1$/,
    regex: /(cpa|comunidad|alianza|mantenimiento|reposicion|continuidad|sostenib|capacidad|pasantia)/,
    minCountHint: 2,
    requirementLabel: '4+ estrategias viables de continuidad más allá del financiamiento',
    missingMsg:
      'Incorpora 4+ estrategias concretas de sostenibilidad (CPA docente, mantenimiento, alianzas y réplica sin subvención).',
  },
  {
    pattern: /^p5_1_2$/,
    regex: /(pei|pat|pci|semana|gestion|marzo|julio|noviembre|programacion|unidad)/,
    requirementLabel: 'Incorporación curricular y de gestión en PEI, PAT y PCI con fechas',
    missingMsg:
      'Precisa en qué momentos (Semanas de Gestión) y cómo se institucionaliza la propuesta en PEI, PAT, PCI y unidades.',
  },
  {
    pattern: /^p5_1_3$/,
    regex: /(indicador|instrumento|responsable|frecuencia|entrada|proceso|salida|marzo|julio|noviembre|monitoreo|rubrica)/,
    minCountHint: 2,
    requirementLabel: '3+ mecanismos de monitoreo con indicadores, responsables y frecuencia',
    missingMsg:
      'Detalla 3+ mecanismos indicando indicadores, instrumentos, responsables, momentos (entrada/proceso/salida) y uso de resultados.',
  },
  {
    pattern: /^p5_2_1$/,
    regex: /(publico|canal|mensaje|feria|dia del logro|boletin|radio|red|pasantia|difusion)/,
    minCountHint: 2,
    requirementLabel: '4+ estrategias de difusión detallando público, canal, mensaje y momento',
    missingMsg:
      'Especifica 4+ acciones de difusión señalando público objetivo, canal comunicacional, mensaje clave y momento de ejecución.',
  },
  {
    pattern: /^p5_3_1$/,
    regex: /(bitacora|leccion|reconstruc|guia|sistematiz|transferib|evidencia|portafolio)/,
    requirementLabel: 'Mecanismos de registro continuo, lecciones aprendidas y guía transferible',
    missingMsg:
      'Describe cómo se registran lecciones aprendidas de forma sistemática y el producto final transferible (guía o cartilla).',
  },
  {
    pattern: /^p6_1_1$/,
    regex: /(antes|despues|linea de base|resultado|%|incremento|reduccion|acta|refrendad|siagie)/,
    minCountHint: 2,
    requirementLabel: '4+ resultados diferenciados comparando Línea de Base vs. Actual refrendado',
    missingMsg:
      'Presenta 4+ resultados con cifras comparativas Antes vs. Después refrendadas por la Dirección.',
  },
  {
    pattern: /^p6_1_2$/,
    regex: /(momento 1|momento 2|monitoreo|practica|docente|gestion|acta|conei|familia)/,
    requirementLabel: 'Evidencias de monitoreo docente en 2 momentos y acuerdos sostenidos',
    missingMsg:
      'Contrasta el Momento 1 y Momento 2 de monitoreo docente e incluye acuerdos institucionales sostenidos.',
  },
];

export function evaluateProjectRubricNivel4(proj: ProjectModel): RubricNivel4Report {
  const schema = SCHEMA_FICHAS[proj.category];
  const ctx = buildProjectContext(proj);
  const probKeywords = extractProblemKeywords(ctx.semillaProb);
  const compKeywords = extractProblemKeywords(`${ctx.comp1} ${ctx.comp2}`);
  const domainKeywords = extractProblemKeywords(ctx.profile.domainLabel);
  const anchorWords = Array.from(new Set([...probKeywords, ...compKeywords, ...domainKeywords]));

  const items: RubricFieldComparison[] = [];
  const byFieldKey: Record<string, RubricFieldComparison> = {};

  let orderCounter = 1;
  schema.sections.forEach((sec) => {
    sec.fields.forEach((f) => {
      const order = orderCounter++;
      const rawText = (proj.fields[f.key] || '').trim();
      const words = countWords(rawText);
      const {maxWordsBases, metaPalabras} = getWordTargetMetrics(f.maxChars);
      const norm = normalizeTextForMatch(rawText);
      const logic = PEDAGOGICAL_LOGIC_MAP[f.key];
      const rubricCriteria =
        logic?.rubricCriteria ||
        'Nivel IV exige rigor argumentativo, evidencias verificables y articulación directa con el problema central y el CNEB.';

      const isOverLimit = words > maxWordsBases || rawText.length > f.maxChars;
      const minDepthWords = Math.max(45, Math.round(metaPalabras * 0.72));
      const sentenceCount = rawText
        .split(/[.!?]+/)
        .map((s) => s.trim())
        .filter((s) => s.length > 15).length;

      // 1. Suficiencia y estructura argumentativa
      const depthLengthPassed =
        words >= minDepthWords && !isOverLimit && sentenceCount >= 2;
      let lengthDetail = '';
      if (words === 0) {
        lengthDetail = 'Campo vacío: requiere redacción completa.';
      } else if (isOverLimit) {
        lengthDetail = `Excede el tope de Bases (${words}/${maxWordsBases} pal.): debe sintetizarse sin perder sustancia.`;
      } else if (words < minDepthWords) {
        lengthDetail = `Desarrollo breve (${words}/${metaPalabras} pal. recomendadas): amplía con mayor detalle argumentativo.`;
      } else if (sentenceCount < 2) {
        lengthDetail = 'Conviene estructurar el argumento en al menos 2–3 oraciones o párrafos articulados.';
      } else {
        lengthDetail = `Extensión y estructura sólidas (${words} pal. dentro del tope ${maxWordsBases}).`;
      }

      // 2. Respaldo de evidencias, cifras e instrumentos
      const hasPercentagesOrNumbers = /%|\b\d{2,}\b|\b(2025|2026|2027)\b/.test(norm);
      const hasInstrumentTerms =
        /(siagie|enla|diagnost|encuesta|grupo focal|acta|rubrica|lista de cotejo|portafolio|diario de campo|bitacora|matriz|cuadro a|cuadro b|anexo|pei|pat|pci|evidencia|indicador|testimonio)/.test(
          norm
        );
      const listCueMatches = rawText.match(/(?:^|\n)\s*(?:•|-|\d+[.)]|\(\d+\))/g) || [];
      const hasEnumeratedBreadth =
        listCueMatches.length >= 2 ||
        /(primer lugar|segundo|tercer|cuarto|ademas|asimismo|1\)|2\)|3\))/.test(norm);
      const evidencePassed =
        words >= 35 &&
        ((hasPercentagesOrNumbers && hasInstrumentTerms) ||
          (hasInstrumentTerms && hasEnumeratedBreadth));
      const evidencePartial =
        !evidencePassed && words >= 25 && (hasPercentagesOrNumbers || hasInstrumentTerms);

      const evidenceDetail = evidencePassed
        ? 'Respalda afirmaciones con datos verificables, fuentes o instrumentos concretos.'
        : 'Falta sustento verificable (cifras/porcentajes, fuentes como SIAGIE/ENLA, o evidencias enumeradas).';

      // 3. Coherencia causal con Problema Central, CNEB y conectores lógicos
      const matchedAnchors = anchorWords.filter((kw) => norm.includes(kw));
      const hasCausalConnectors =
        /(debido a|por ello|por consiguiente|en consecuencia|mediante|a traves de|con el fin|con el proposito|para lograr|lo cual|frente a|asimismo|sin embargo|ademas)/.test(
          norm
        );
      const hasPedagogicalDepthTerms =
        /(cneb|competencia|capacidad|evaluacion formativa|retroalimentacion|dua|protagonista|autonomia|mediacion|aprendizaje)/.test(
          norm
        );
      const coherencePassed =
        words >= 35 &&
        matchedAnchors.length >= 2 &&
        (hasCausalConnectors || hasPedagogicalDepthTerms);
      const coherencePartial =
        !coherencePassed &&
        words >= 25 &&
        (matchedAnchors.length >= 1 || hasCausalConnectors || hasPedagogicalDepthTerms);

      const coherenceDetail = coherencePassed
        ? `Articula causalmente con el problema central y el CNEB (${matchedAnchors.slice(0, 3).join(', ')}).`
        : `Refuerza el vínculo explícito con el Problema Central (${anchorWords.slice(0, 3).join(', ') || ctx.profile.domainLabel}), el enfoque CNEB y conectores causales.`;

      // 4. Exigencia específica Nivel IV del numeral
      const spec = NUMERAL_RUBRIC_SPECS.find((s) => s.pattern.test(f.key));
      const numeralPassed =
        words >= 35 &&
        (spec ? spec.regex.test(norm) : words >= minDepthWords) &&
        (!spec?.minCountHint || hasEnumeratedBreadth || sentenceCount >= 3);
      const numeralPartial =
        !numeralPassed && words >= 25 && Boolean(spec && spec.regex.test(norm));

      const numeralDetail = numeralPassed
        ? `Cumple el requisito clave Nivel IV: ${spec?.requirementLabel || rubricCriteria}`
        : spec?.missingMsg || rubricCriteria;

      const criteriaChecks: RubricDepthCriterion[] = [
        {
          id: 'depth_length',
          label: 'Extensión y estructura',
          passed: depthLengthPassed,
          detail: lengthDetail,
        },
        {
          id: 'depth_evidence',
          label: 'Evidencias y precisión',
          passed: evidencePassed,
          detail: evidenceDetail,
        },
        {
          id: 'depth_coherence',
          label: 'Coherencia causal y CNEB',
          passed: coherencePassed,
          detail: coherenceDetail,
        },
        {
          id: 'depth_numeral',
          label: `Exigencia Nivel IV (${f.code})`,
          passed: numeralPassed,
          detail: numeralDetail,
        },
      ];

      let score = 0;
      if (words > 0) {
        score += depthLengthPassed ? 25 : words >= Math.round(minDepthWords * 0.5) && !isOverLimit ? 12 : 5;
        score += evidencePassed ? 25 : evidencePartial ? 13 : 0;
        score += coherencePassed ? 25 : coherencePartial ? 13 : 0;
        score += numeralPassed ? 25 : numeralPartial ? 13 : 0;
      }
      if (isOverLimit) {
        score = Math.min(score, 55);
      }
      score = Math.min(100, Math.max(0, score));

      let level: RubricLevelId = 'Nivel I';
      if (score >= 85 && !isOverLimit) level = 'Nivel IV';
      else if (score >= 65) level = 'Nivel III';
      else if (score >= 35) level = 'Nivel II';

      const needsDepth = level !== 'Nivel IV';
      const argumentGaps: string[] = [];
      criteriaChecks.forEach((chk) => {
        if (!chk.passed) {
          argumentGaps.push(chk.detail);
        }
      });

      const actionHint =
        words === 0
          ? 'Redacta, dicta o genera el borrador inicial alineado al Problema Central.'
          : isOverLimit
          ? `Recorta ${words - maxWordsBases + 10} palabras manteniendo las evidencias y cifras clave.`
          : argumentGaps[0] || 'Rubro sólido en nivel destacado (Nivel IV).';

      const item: RubricFieldComparison = {
        fieldKey: f.key,
        sectionId: sec.id,
        sectionTab: sec.tab,
        order,
        code: f.code,
        label: f.label,
        words,
        metaPalabras,
        maxWordsBases,
        score,
        level,
        needsDepth,
        isOverLimit,
        rubricCriteria,
        criteriaChecks,
        argumentGaps,
        actionHint,
      };

      items.push(item);
      byFieldKey[f.key] = item;
    });
  });

  const totalFields = items.length;
  const overallPct =
    totalFields > 0
      ? Math.round(items.reduce((acc, it) => acc + it.score, 0) / totalFields)
      : 0;
  const nivel4Count = items.filter((it) => it.level === 'Nivel IV').length;
  const needsDepthCount = items.filter((it) => it.needsDepth).length;
  const criticalCount = items.filter(
    (it) => it.level === 'Nivel I' || it.level === 'Nivel II' || it.isOverLimit
  ).length;

  let estimatedLevel: RubricLevelId = 'Nivel I';
  if (overallPct >= 85 && criticalCount === 0) estimatedLevel = 'Nivel IV';
  else if (overallPct >= 65) estimatedLevel = 'Nivel III';
  else if (overallPct >= 35) estimatedLevel = 'Nivel II';

  return {
    overallPct,
    estimatedLevel,
    totalFields,
    nivel4Count,
    needsDepthCount,
    criticalCount,
    items,
    byFieldKey,
  };
}

export function generateArbolProblemasData(ctx: ProjectContext): ArbolProblemas {
  const p = ctx.profile;
  const centralProblem = ctx.hasCustomProb
    ? ctx.semillaProb
    : `Limitado desarrollo de "${ctx.comp1}" y "${ctx.comp2}" (${p.domainLabel}) en los ${ctx.estudiantes} estudiantes del nivel ${ctx.nivel} de la ${ctx.ieNombre} (${ctx.distrito} - ${ctx.region}).`;

  return {
    efectoFinal: p.efectoFinal,
    efectosDirectos: [...p.efectosDirectos],
    problemaCentral: centralProblem,
    causasDirectas: [...p.causasDirectas],
    causasIndirectas: [...p.causasIndirectas],
  };
}

export function generateArbolObjetivosData(
  arbol: ArbolProblemas,
  ctx: ProjectContext
): ArbolObjetivos {
  const p = ctx.profile;
  const sftClause =
    ctx.cat === '2C' || ctx.mod === 'MSE_SFT'
      ? ` en la especialidad ${ctx.especialidad}`
      : '';
  const problemRef = arbol.problemaCentral
    ? ` (revirtiendo: ${arbol.problemaCentral.slice(0, 120)}${arbol.problemaCentral.length > 120 ? '...' : ''})`
    : '';

  return {
    finPrincipal: `Contribuir a superar las brechas en ${p.domainLabel} y asegurar la formación integral autónoma de los ${ctx.estudiantes} estudiantes de ${ctx.ieNombre} (${ctx.distrito} - ${ctx.region}).`,
    finesDirectos: [
      `Resultado 1: Incremento a ≥ 75% de estudiantes en nivel Logrado en "${ctx.comp1}" al cierre de 2027.`,
      `Resultado 2: Estudiantes que movilizan "${ctx.comp2}" con evidencias auténticas en ${p.domainLabel}${sftClause}.`,
      `Resultado 3: Alta motivación intrínseca, autonomía (C29) y protagonismo activo en las aulas.`,
    ],
    objetivoGeneral: `${p.metaObjetivoGeneral} mediante la implementación de "${ctx.titulo}"${problemRef}.`,
    objetivosEspecificos: [...p.objetivosEspecificos],
    mediosAccion: [...p.mediosAccion],
  };
}

export function generateBeneficiariosDefault(proj: ProjectModel): {
  directos: string;
  indirectos: string;
} {
  const ctx = buildProjectContext(proj);
  return {
    directos: `${ctx.estudiantes} estudiantes del nivel ${ctx.nivel} de ${ctx.ieNombre} participantes en ${ctx.profile.domainLabel} y equipo docente de aula 2027.`,
    indirectos: `Familias de los estudiantes, equipo directivo, especialistas de la ${ctx.ugel} y aliados comunitarios de ${ctx.distrito}.`,
  };
}

export function getMissionGuidance(
  secId: string,
  cat: CategoryId
): {title: string; focus: string; tip: string} {
  const map: Record<string, {title: string; focus: string; tip: string}> = {
    sec1: {
      title: 'Misión · Diagnóstico y Marco Lógico',
      focus:
        cat === '2D'
          ? 'Delimita el problema educativo con evidencias y formula la pregunta e hipótesis IAPE.'
          : 'Conecta el Problema Central (causas y consecuencias) con el Objetivo General y Específicos.',
      tip: 'Usa el Árbol de Problemas y transfórmalo a Árbol de Objetivos para asegurar coherencia vertical.',
    },
    sec2: {
      title: 'Misión · Propuesta Innovadora y Valor Agregado',
      focus:
        cat === '2C'
          ? 'Detalla el prototipo V1/V2, flujo Design Thinking y validación técnica productiva.'
          : 'Explica la estrategia metodológica paso a paso y qué la diferencia de la enseñanza tradicional.',
      tip: 'Sustenta tus fundamentos CNEB y vincula la secuencia al guion del video de 3 minutos.',
    },
    sec3: {
      title: 'Misión · Pertinencia Estudiantil y Territorial',
      focus:
        'Demuestra cómo la propuesta responde a intereses reales de tus estudiantes y demandas del territorio.',
      tip: 'Incluye voz estudiantil, enfoque intercultural/DUA y saberes de tu distrito o región.',
    },
    sec4: {
      title: 'Misión · Actores, Cronograma y Presupuesto',
      focus:
        'Articula aliados internos/externos con el Cuadro A de actividades y el Cuadro B del Anexo N° 5.',
      tip: 'Verifica que la proporción Bienes/Servicios respete el tope exacto de tu modalidad.',
    },
    sec5: {
      title: 'Misión · Sostenibilidad y Gestión Escolar',
      focus:
        'Asegura la continuidad incorporando la innovación en PEI, PAT, PCI y mecanismos de monitoreo.',
      tip: 'Define estrategias de difusión comunitaria y evaluación continua al cierre del 2027.',
    },
    sec6: {
      title: 'Misión · Resultados Verificables y Anexos',
      focus:
        'Compara resultados cuantitativos frente a la línea de base y refrenda las declaraciones juradas.',
      tip: 'Consigna cifras concretas de mejora en competencias CNEB y práctica docente.',
    },
    sec_inst: {
      title: 'Misión Final · Instrumentos y Evidencias',
      focus:
        'Prepara las matrices, guiones, consentimientos y fichas obligatorias según tu modalidad.',
      tip: 'Marca como Listo o genera cada instrumento antes de auditar en el Paso 3.',
    },
  };
  return (
    map[secId] || {
      title: 'Misión Pedagógica',
      focus: 'Completa los rubros manteniendo coherencia con el Problema Central.',
      tip: 'Usa Dictar o Sugerencias para enriquecer cada criterio.',
    }
  );
}

export function generateCuadroAData(ctx: ProjectContext): CuadroARow[] {
  return ctx.profile.cuadroAActividades.map((row) => ({...row}));
}

export function generateCuadroBData(ctx: ProjectContext): CuadroBRow[] {
  const fin = ctx.fin;
  const b1 = Math.round(fin.maxBienes * 0.55);
  const b2 = fin.maxBienes - b1;
  const s1 = Math.round(fin.maxServicios * 0.55);
  const s2 = fin.maxServicios - s1;
  const desc = ctx.profile.cuadroBDescs;

  return [
    {
      rubro: 'Bienes',
      desc: desc.bien1,
      unidad: 'Kit',
      cant: 1,
      unit: b1,
      just: `OE2 · ${ctx.profile.domainLabel}`,
    },
    {
      rubro: 'Bienes',
      desc: desc.bien2,
      unidad: 'Lote',
      cant: 1,
      unit: b2,
      just: `OE2 · Evidencias y recursos de aula`,
    },
    {
      rubro: 'Servicios',
      desc: desc.serv1,
      unidad: 'Taller',
      cant: 1,
      unit: s1,
      just: `OE1 · Fortalecimiento docente`,
    },
    {
      rubro: 'Servicios',
      desc: desc.serv2,
      unidad: 'Servicio',
      cant: 1,
      unit: s2,
      just: `OE3 · Difusión y sistematización`,
    },
  ];
}

export function generateSingleInstrumentContent(instId: string, proj: ProjectModel): string {
  const ctx = buildProjectContext(proj);
  const p = ctx.profile;
  if (instId === 'inst_arbol') {
    const a = proj.arbolProblemas || generateArbolProblemasData(ctx);
    return `ÁRBOL DE PROBLEMAS (${ctx.ieNombre} - ${ctx.distrito})\n• EFECTO FINAL: ${a.efectoFinal}\n• EFECTOS DIRECTOS:\n  1) ${a.efectosDirectos[0]}\n  2) ${a.efectosDirectos[1]}\n  3) ${a.efectosDirectos[2]}\n• PROBLEMA CENTRAL: ${a.problemaCentral}\n• CAUSAS DIRECTAS E INDIRECTAS:\n  1) ${a.causasDirectas[0]} (${a.causasIndirectas[0]})\n  2) ${a.causasDirectas[1]} (${a.causasIndirectas[1]})\n  3) ${a.causasDirectas[2]} (${a.causasIndirectas[2]})`;
  }

  const map: Record<string, string> = {
    inst_diagnostico: `MATRIZ DE LÍNEA DE BASE 2026 - ${ctx.ieNombre} (${ctx.estudiantes} estudiantes)\n• Foco: ${p.domainLabel} — ${p.instrumentHighlights.diagnostico}.\n• ${ctx.comp1}: 60% Inicio | 24% Proceso | 16% Logrado → Meta 2027: ≥ 75% Logrado.\n• ${ctx.comp2}: 56% Inicio | 26% Proceso | 18% Logrado → Meta 2027: ≥ 76% Logrado.\nFuentes: Actas SIAGIE, Evaluación Diagnóstica 2026 y Reporte ENLA 2025.`,
    inst_guion_video: `GUION VIDEO YOUTUBE (MÁX. 03:00 MIN - HORIZONTAL 16:9)\n• [00:00-00:35] Presentación en ${ctx.ieNombre} (${ctx.distrito}): ${ctx.director}, ${ctx.coordinador} y estudiantes.\n• [00:35-01:15] Problema Central (${p.domainLabel}): ${ctx.semillaProb}\n• [01:15-02:20] Solución en acción: ${ctx.semillaSol} (${p.instrumentHighlights.guionExtra}).\n• [02:20-03:00] Metas 2027, testimonios de estudiantes/familias y compromiso de sostenibilidad.`,
    inst_2a_voz: `FICHA DE VOZ ESTUDIANTIL (ANEXO 2A) - ${ctx.ieNombre}\n• Hallazgo principal: ${p.instrumentHighlights.voz}.\n1. ${p.necesidadesEstudiantes[0]}\n2. ${p.necesidadesEstudiantes[1]}\n3. ${p.necesidadesEstudiantes[2]}\n4. ${p.necesidadesEstudiantes[3]}`,
    inst_2a_monitoreo: `FICHA DE MONITOREO DOCENTE (2 MOMENTOS) - ${ctx.ieNombre} (${p.domainLabel})\n• Momento 1 (Inicio): 35% aplica estrategias activas y retroalimentación reflexiva frente al problema central.\n• Momento 2 (Consolidación): 95% integra "${ctx.semillaSol}" con rúbricas analíticas y recursos de ${ctx.distrito}.`,
    inst_2a_resultados: `CUADRO COMPARATIVO DE RESULTADOS REFRENDADO POR DIRECCIÓN (${ctx.director})\n• Foco: ${p.domainLabel}\n• ${ctx.comp1}: Incremento de 18% a 74% en Nivel Logrado (+56 pp).\n• ${ctx.comp2}: Incremento de 22% a 76% en Nivel Logrado (+54 pp).\n• Participación familiar y comunitaria: Incremento del 38% al 85%.`,
    inst_2b_caract: `CARACTERIZACIÓN ESTUDIANTIL (ANEXO 2B) - ${ctx.ieNombre}\n• Síntesis: ${p.instrumentHighlights.voz}.\n1. ${p.necesidadesEstudiantes[0]}\n2. ${p.necesidadesEstudiantes[1]}\n3. ${p.necesidadesEstudiantes[2]}\n4. ${p.necesidadesEstudiantes[3]}`,
    inst_2b_actores: `MATRIZ DE ACTORES Y ACUERDOS 2027 - ${ctx.ieNombre} (${p.domainLabel})\n• Internos: Directivo (${ctx.director}), Docentes (${ctx.coordinador}), Estudiantes (${ctx.estudiantes}), APAFA.\n• Externos: Especialistas ${ctx.ugel}, Municipalidad Distrital de ${ctx.distrito}, Sabios y aliados locales de ${ctx.region}.`,
    inst_2b_rubrica: `RÚBRICA ANALÍTICA 2027 (${ctx.comp1} / ${ctx.comp2})\n• Criterio clave: ${p.instrumentHighlights.rubrica}.\n• Nivel IV (Destacado): Sustenta con evidencias territoriales de ${ctx.distrito} y propone mejoras creativas.\n• Nivel III (Logrado): Desarrolla los desempeños usando las estrategias y kits del proyecto.\n• Nivel II (Proceso): Requiere mediación docente para articular evidencias.`,
    inst_2c_empatia: `MAPAS DE EMPATÍA MSE-SFT - ${ctx.especialidad} (${ctx.ieNombre})\n• Problema detectado: ${ctx.semillaProb}\n• Estudiantes: ${p.necesidadesEstudiantes[0]} / ${p.necesidadesEstudiantes[1]}\n• Usuarios del Sector Productivo: Valoran productos locales seguros, sostenibles y de calidad certificada en ${ctx.distrito}.`,
    inst_2c_prototipo: `DOSSIER DE PROTOTIPO V1/V2, CUSTOMER JOURNEY Y STORYBOARD - ${ctx.especialidad}\n• Prototipo V1: Boceto técnico y diagrama de flujo orientado a resolver: ${ctx.semillaProb}\n• Prototipo V2: Muestra funcional validada con ficha técnica, insumos de ${ctx.distrito} e higiene.\n• Storyboard (6 viñetas): Necesidad → Ideación → Prototipo → Control de calidad → Validación usuario → Mejora.`,
    inst_2c_validacion: `VALIDACIÓN CON 25 USUARIOS REALES DE ${ctx.distrito} (${ctx.especialidad})\n• Utilidad territorial: 92% aprobación | Calidad y acabado: 84% | Seguridad/inocuidad: 96% | Precio justo: 88%.`,
    inst_2d_barreras: `MATRIZ DE CONTRASTE DE 4 FUENTES Y BARRERAS IAPE - ${ctx.ieNombre}\n• Problema priorizado: ${ctx.semillaProb}\n• Fuentes: (1) SIAGIE/Diagnóstica 2026; (2) Observación de aula; (3) Cartografía estudiantil; (4) ENLA 2025.\n• Barrera crítica: ${p.causasDirectas[0]}`,
    inst_2d_diario: `DIARIO DE CAMPO DOCENTE Y BITÁCORA CO-INVESTIGADOR IAPE (${p.domainLabel})\n• Registro de sesión transformadora ("${ctx.semillaSol}"), preguntas de los estudiantes, reflexión crítica sobre supuestos docentes y acuerdos de ajuste para el siguiente ciclo espiral.`,
    inst_2d_etica: `CONSENTIMIENTO Y ASENTIMIENTO INFORMADO (LEY N° 29733)\nAutorización voluntaria de padres/apoderados y asentimiento de estudiantes co-investigadores de ${ctx.ieNombre} en la investigación sobre ${p.domainLabel}, garantizando confidencialidad y uso exclusivamente pedagógico.`,
    inst_eib: `FICHA SOCIOLINGÜÍSTICA Y DIÁLOGO DE SABERES EIB (${ctx.lengua})\nCaracterización bilingüe de los ${ctx.estudiantes} estudiantes en ${p.domainLabel} y guía de sesiones compartidas con yachaq/sabios de ${ctx.distrito} articuladas al calendario comunal.`,
    inst_convenio: `FICHA DE CONVENIO INTERINSTITUCIONAL VIGENTE (+2 PUNTOS)\nConvenio suscrito entre ${ctx.ieNombre} y entidad aliada de ${ctx.region} para asistencia técnica en ${p.domainLabel}, pasantías y uso de equipamiento durante 2027.`,
  };

  return map[instId] || `Instrumento técnico elaborado para ${ctx.ieNombre} (${ctx.distrito}) sobre ${p.domainLabel}.`;
}

export function getFichaPartsCatalog(proj: ProjectModel): FichaPartItem[] {
  const schema = SCHEMA_FICHAS[proj.category];
  const fin = getProjectFinancialRules(proj);
  const reqInstruments = getRequiredInstrumentsForProject(proj);
  const parts: FichaPartItem[] = [];

  let rubroCounter = 1;
  schema.sections.forEach((sec) => {
    sec.fields.forEach((f) => {
      const colorIdx = (rubroCounter - 1) % 7;
      const st = getRubroStatusInfo(proj, f);
      const pct = Math.min(100, Math.round((st.words / st.metaPalabras) * 100));
      parts.push({
        id: `rubro:${f.key}`,
        sectionId: sec.id,
        sectionTitle: sec.tab,
        kind: 'rubro',
        code: `Rubro ${rubroCounter} · ${f.code}`,
        title: f.label.split('(')[0].trim(),
        fieldKey: f.key,
        maxChars: f.maxChars,
        colorIdx,
        pct,
        completed: st.state === 'complete',
        progressText: `${pct}% (${st.words}/${st.metaPalabras} pal.)`,
      });

      if (f.key === 'p1_1_1') {
        const treeOk = Boolean(
          proj.arbolProblemas &&
            proj.arbolProblemas.problemaCentral &&
            proj.arbolProblemas.problemaCentral.trim().length > 10
        );
        parts.push({
          id: 'part:arbol',
          sectionId: sec.id,
          sectionTitle: sec.tab,
          kind: 'arbol',
          code: 'Diagrama 1.1.1',
          title: 'Árbol de Problemas Interactivo (Copa, Tronco y Raíces)',
          colorIdx: 5,
          pct: treeOk ? 100 : 0,
          completed: treeOk,
          progressText: treeOk ? '100% · Listo' : '0% · Pendiente',
        });
      }

      rubroCounter++;
    });

    if (sec.hasTables) {
      const aCount = (proj.cuadroA || []).length;
      const aOk = aCount >= 3;
      const aPct = aOk ? 100 : Math.min(80, aCount * 30);
      parts.push({
        id: 'part:cuadroA',
        sectionId: sec.id,
        sectionTitle: sec.tab,
        kind: 'cuadroA',
        code: 'Cuadro A',
        title: 'Plan de Actividades 2027 (Objetivos, Metas y Plazos)',
        colorIdx: 2,
        pct: aPct,
        completed: aOk,
        progressText: aOk ? `100% (${aCount} filas)` : `${aPct}% (${aCount} filas)`,
      });

      const totalBudget = (proj.cuadroB || []).reduce(
        (acc, r) => acc + (Number(r.cant) || 0) * (Number(r.unit) || 0),
        0
      );
      const bOk = totalBudget > 0 && totalBudget <= fin.maxMonto;
      const bPct = bOk ? 100 : totalBudget > 0 ? 70 : 0;
      parts.push({
        id: 'part:cuadroB',
        sectionId: sec.id,
        sectionTitle: sec.tab,
        kind: 'cuadroB',
        code: 'Cuadro B · Anexo 5',
        title: `Presupuesto (${fin.bienesPct}% Bienes / ${fin.serviciosPct}% Servicios · S/ ${fin.maxMonto.toLocaleString('es-PE')})`,
        colorIdx: 3,
        pct: bPct,
        completed: bOk,
        progressText: bOk ? `100% (S/ ${totalBudget.toFixed(0)})` : `${bPct}%`,
      });
    }

    if (sec.hasLegal) {
      const legalReady = Boolean(
        proj.ie.nombre.trim() && proj.equipo.director.nombre.trim() && proj.equipo.director.dni.trim()
      );
      parts.push({
        id: 'part:anexos',
        sectionId: sec.id,
        sectionTitle: sec.tab,
        kind: 'anexos',
        code: 'Anexos 3 y 4',
        title: 'Declaraciones Juradas (Cumplimiento y Originalidad)',
        colorIdx: 4,
        pct: legalReady ? 100 : 50,
        completed: legalReady,
        progressText: legalReady ? '100% · Datos completos' : '50% · Completar IE/Director',
      });
    }

    if (sec.hasInstruments) {
      reqInstruments.forEach((inst, idx) => {
        const textVal = (proj.instruments && proj.instruments[inst.id]) || '';
        const isReady =
          textVal.trim().length >= 60 ||
          Boolean(proj.instrumentsChecked && proj.instrumentsChecked[inst.id]);
        const instPct = isReady
          ? 100
          : Math.min(85, Math.round((textVal.trim().length / 60) * 100));
        parts.push({
          id: `part:inst:${inst.id}`,
          sectionId: sec.id,
          sectionTitle: sec.tab,
          kind: 'instrumento',
          code: `Instrumento ${idx + 1}`,
          title: inst.title,
          instrumentId: inst.id,
          colorIdx: idx % 7,
          pct: instPct,
          completed: isReady,
          progressText: `${instPct}% · ${isReady ? 'Listo' : 'Pendiente'}`,
        });
      });
    }
  });

  return parts;
}

function isAutoTemplateTitle(titulo: string): boolean {
  const clean = (titulo || '').trim();
  if (!clean) return true;
  const prefixes = [
    'Tertulias Vivas y Bibliotecas Territoriales',
    'Matemática Viva y Material Concreto',
    'Eco-Laboratorios y Biohuerto Escolar',
    'Clubes de Indagación Científica',
    'Círculos Restaurativos y Aulas de Bienestar',
    'Aulas Maker y Pensamiento Computacional',
    'Talleres Vivos de Arte, Patrimonio',
    'Aulas Accesibles y Kits Multisensoriales',
    'Laboratorios Vivos Interculturales Bilingües',
    'Prototipos Productivos Sostenibles',
    'Estrategias Vivas Contextualizadas',
    'Laboratorios Vivos Territoriales',
  ];
  const bare = clean.replace(/^Investigación-Acción Participativa:\s*/i, '');
  return prefixes.some((p) => bare.startsWith(p));
}

function isAutoTemplateSolucion(sol: string): boolean {
  const clean = (sol || '').trim();
  if (!clean) return true;
  const prefixes = [
    'Implementación de tertulias literarias dialógicas',
    'Implementación de talleres de matemática contextualizada',
    'Implementación de biohuertos agroecológicos escolares',
    'Implementación de laboratorios vivos de indagación escolar',
    'Implementación de círculos de diálogo restaurativo',
    'Implementación de un espacio maker y talleres de pensamiento computacional',
    'Creación de talleres interdisciplinarios de artes escénicas',
    'Implementación de adaptaciones curriculares bajo los 3 principios del Diseño Universal',
    'Implementación de laboratorios vivos interculturales bilingües',
    'Implementación de un taller productivo innovador',
    'Implementación de comunidades de indagación colaborativa',
  ];
  return prefixes.some((p) => clean.startsWith(p));
}

export function ensureProjectSeedForGeneration(proj: ProjectModel): ProjectModel {
  const updated: ProjectModel = JSON.parse(JSON.stringify(proj));

  if (!updated.seed.problema || !updated.seed.problema.trim()) {
    updated.seed.problema = getDefaultProblemaByModality(updated);
  }

  const profile = inferProblemProfile(updated.seed.problema, updated);
  const titleAuto = isAutoTemplateTitle(updated.seed.titulo);
  const solAuto = isAutoTemplateSolucion(updated.seed.solucion);

  if (
    profile.domain !== 'general' &&
    (isFactoryDefaultTematicas(updated.seed.tematicas) || titleAuto)
  ) {
    updated.seed.tematicas = profile.tematicas;
  }

  if (
    profile.domain !== 'general' &&
    (isFactoryDefaultCompetencias(updated.seed.competencias) || titleAuto)
  ) {
    updated.seed.competencias = profile.competencias.slice(0, 2);
  }

  if (solAuto) {
    updated.seed.solucion = profile.suggestedSolution;
  }
  if (titleAuto) {
    updated.seed.titulo = profile.suggestedTitle;
  }

  if (!updated.beneficiarios || !updated.beneficiarios.directos.trim()) {
    updated.beneficiarios = generateBeneficiariosDefault(updated);
  }

  return updated;
}

export function generateSelectedParts(proj: ProjectModel, selectedPartIds: string[]): ProjectModel {
  const updated = ensureProjectSeedForGeneration(proj);
  const ctx = buildProjectContext(updated);
  const schema = SCHEMA_FICHAS[updated.category];
  const selectedSet = new Set(selectedPartIds);

  if (selectedSet.has('part:arbol')) {
    const arbol = generateArbolProblemasData(ctx);
    updated.arbolProblemas = arbol;
    updated.arbolObjetivos = generateArbolObjetivosData(arbol, ctx);
  }

  schema.sections.forEach((sec) => {
    sec.fields.forEach((f) => {
      if (selectedSet.has(`rubro:${f.key}`)) {
        updated.fields[f.key] = generateFieldContent(f.key, f.maxChars, ctx);
      }
    });
  });

  if (selectedSet.has('part:cuadroA')) {
    updated.cuadroA = generateCuadroAData(ctx);
  }
  if (selectedSet.has('part:cuadroB')) {
    updated.cuadroB = generateCuadroBData(ctx);
  }

  const reqList = getRequiredInstrumentsForProject(updated);
  reqList.forEach((inst) => {
    if (selectedSet.has(`part:inst:${inst.id}`)) {
      updated.instruments[inst.id] = generateSingleInstrumentContent(inst.id, updated);
      updated.instrumentsChecked[inst.id] = true;
    }
  });

  return updated;
}

export function generateCompleteProjectData(proj: ProjectModel): ProjectModel {
  const updated = ensureProjectSeedForGeneration(proj);
  const ctx = buildProjectContext(updated);
  const schema = SCHEMA_FICHAS[updated.category];

  const arbol = generateArbolProblemasData(ctx);
  updated.arbolProblemas = arbol;
  updated.arbolObjetivos = generateArbolObjetivosData(arbol, ctx);
  schema.sections.forEach((sec) => {
    sec.fields.forEach((f) => {
      updated.fields[f.key] = generateFieldContent(f.key, f.maxChars, ctx);
    });
  });

  updated.cuadroA = generateCuadroAData(ctx);
  updated.cuadroB = generateCuadroBData(ctx);

  const reqList = getRequiredInstrumentsForProject(updated);
  reqList.forEach((inst) => {
    updated.instruments[inst.id] = generateSingleInstrumentContent(inst.id, updated);
    updated.instrumentsChecked[inst.id] = true;
  });

  return updated;
}

export function createDemoProjectData(): ProjectModel {
  const proj = createEmptyProjectModel();
  proj.category = '2B';
  proj.modalidad = 'EB';
  proj.ie = {
    nombre: 'I.E. N° 36150 Virgen de Lourdes',
    codigo: '0421895',
    nivel: 'Primaria',
    estudiantes: 145,
    dre: 'DRE Huancavelica',
    ugel: 'UGEL Acobamba',
    region: 'Huancavelica',
    provincia: 'Acobamba',
    distrito: 'Pomacocha',
    area: 'Rural 1',
    zona_especial: 'Rural 1 + Convenio',
    eib_tipo: 'EIB Fortalecimiento',
    lengua: 'Quechua Chanka',
    especialidad: '',
    modulo: '',
  };
  proj.equipo = {
    director: {
      nombre: 'Mg. Elena Victoria Quispe Huamán',
      dni: '23456789',
      celular: '967412580',
      correo: 'direccion.36150@minedu.edu.pe',
      exp: 'Sí',
    },
    coordinador: {
      nombre: 'Prof. Juan Carlos Mendoza Taipe',
      dni: '41258963',
      celular: '954123698',
      correo: 'jmendoza@minedu.edu.pe',
      exp: 'Sí',
    },
    integrantes: [
      {
        nombre: 'Prof. Rosa Luz Palomino Castro',
        dni: '42589631',
        cargo: 'Docente',
        celular: '945123874',
        correo: 'rpalomino@minedu.edu.pe',
        exp: 'No',
      },
    ],
  };
  proj.seed = {
    titulo:
      'Laboratorios Vivos Agroecológicos y Saberes Quechuas para la Indagación Científica y Oralidad en Pomacocha',
    tematicas: [TEMATICAS_CNPIE[1], TEMATICAS_CNPIE[3], TEMATICAS_CNPIE[4]],
    competencias: [COMPETENCIAS_CNEB[22], COMPETENCIAS_CNEB[7], COMPETENCIAS_CNEB[28]],
    problema:
      'El 62% de los 145 estudiantes del nivel Primaria de la I.E. N° 36150 Virgen de Lourdes se ubica en nivel Inicio en indagación científica y expresión oral (Evaluación Diagnóstica 2026 y ENLA 2025), debido al predominio de sesiones expositivas descontextualizadas y escaso uso de materiales manipulativos en Pomacocha.',
    solucion:
      'Implementación de laboratorios vivos agroecológicos bilingües (Quechua Chanka - Castellano), kits de indagación territorial y diálogo de saberes con yachaq locales para que los estudiantes formulen hipótesis, experimenten y comuniquen hallazgos.',
  };
  proj.videoUrl = 'https://www.youtube.com/watch?v=cnpie2027_ejemplo';

  return generateCompleteProjectData(proj);
}

export function getAnexo3Text(proj: ProjectModel): string {
  const d = proj.equipo.director;
  const c = proj.equipo.coordinador;
  return `ANEXO N° 3: DECLARACIÓN JURADA DE CUMPLIMIENTO DE REQUISITOS (CNPIE 2027)

Yo, ${d.nombre || '[Nombre del Director/a]'}, identificado(a) con DNI N° ${d.dni || '[DNI]'}, en mi calidad de Director(a) de la Institución Educativa "${proj.ie.nombre || '[Nombre de la IE]'}" (Código Modular N° ${proj.ie.codigo || '[Código]'}), perteneciente a la ${proj.ie.ugel || '[UGEL]'} - ${proj.ie.dre || '[DRE]'}, conjuntamente con el/la Docente Coordinador(a) ${c.nombre || '[Nombre del Coordinador/a]'} (DNI N° ${c.dni || '[DNI]'}), DECLARO BAJO JURAMENTO:

1. Que la Institución Educativa es de gestión pública y el equipo responsable cuenta con vínculo laboral vigente durante el año lectivo 2027.
2. Que no registramos impedimentos, sanciones administrativas vigentes ni omisiones de rendición de cuentas ante el FONDEP o el MINEDU.
3. Que nos comprometemos a ejecutar la subvención conforme al Anexo N° 5 y rendir cuentas transparentemente en el sistema SIFINANCIA.

Lugar y fecha: ${proj.ie.distrito || 'Perú'}, año 2027.`;
}

export function getAnexo4Text(proj: ProjectModel): string {
  const d = proj.equipo.director;
  return `ANEXO N° 4: DECLARACIÓN JURADA DE AUTENTICIDAD Y ORIGINALIDAD DEL PROYECTO

Yo, ${d.nombre || '[Nombre del Director/a]'}, identificado(a) con DNI N° ${d.dni || '[DNI]'}, Director(a) de la Institución Educativa "${proj.ie.nombre || '[Nombre de la IE]'}" (Código Modular N° ${proj.ie.codigo || '[Código]'}), DECLARO BAJO JURAMENTO:

1. Que el proyecto titulado "${proj.seed.titulo || '[Título del Proyecto]'}" es una creación original del equipo docente y directivo de nuestra Institución Educativa, respetando los derechos de autor conforme al Decreto Legislativo N° 822.
2. Que toda la información, diagnósticos, resultados y evidencias consignadas son veraces y verificables.

Firma y sello del Director(a): ${d.nombre || '[Nombre del Director/a]'} · DNI N° ${d.dni || '[DNI]'}`;
}
