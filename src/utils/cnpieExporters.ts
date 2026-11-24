import {SCHEMA_FICHAS} from '../data/cnpieSchemas';
import type {ArbolProblemas, ProjectModel} from '../types/cnpie';
import {
  buildProjectContext,
  generateArbolProblemasData,
  getAnexo3Text,
  getAnexo4Text,
  getModalityAndProjectLabels,
  getProjectBonuses,
  getProjectFinancialRules,
  getRequiredInstrumentsForProject,
} from './cnpieEngine';

function escapeHtml(str?: string): string {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function getSafeFileName(proj: ProjectModel, ext: string): string {
  const base = (proj.seed.titulo || 'Proyecto_CNPIE_2027')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 45);
  return `${base || 'Proyecto_CNPIE_2027'}_${proj.category}.${ext}`;
}

function triggerSafeDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 4500);
}

export function buildOrderedExpedienteSections(proj: ProjectModel) {
  const schema = SCHEMA_FICHAS[proj.category];
  const fin = getProjectFinancialRules(proj);
  const bonus = getProjectBonuses(proj);
  const labels = getModalityAndProjectLabels(proj);
  const arbol: ArbolProblemas =
    proj.arbolProblemas && proj.arbolProblemas.problemaCentral
      ? proj.arbolProblemas
      : generateArbolProblemasData(buildProjectContext(proj));
  const reqInst = getRequiredInstrumentsForProject(proj);

  const rubrosOrdered: Array<{
    order: number;
    dim: string;
    code: string;
    label: string;
    text: string;
  }> = [];
  let n = 1;
  schema.sections.forEach((sec) => {
    sec.fields.forEach((f) => {
      rubrosOrdered.push({
        order: n++,
        dim: sec.tab,
        code: f.code,
        label: f.label,
        text: proj.fields[f.key] || '[Pendiente de redacción]',
      });
    });
  });

  let bSum = 0;
  let sSum = 0;
  (proj.cuadroB || []).forEach((r) => {
    const sub = (Number(r.cant) || 0) * (Number(r.unit) || 0);
    if (r.rubro === 'Bienes') bSum += sub;
    else sSum += sub;
  });

  return {
    schema,
    fin,
    bonus,
    labels,
    arbol,
    rubrosOrdered,
    reqInst,
    bSum,
    sSum,
    totalSum: bSum + sSum,
    anexo3: getAnexo3Text(proj),
    anexo4: getAnexo4Text(proj),
  };
}

export function buildStructuredDocumentHTML(proj: ProjectModel, isStandaloneWeb = false): string {
  const d = buildOrderedExpedienteSections(proj);
  const teamRows = [
    {rol: 'Director(a)', ...proj.equipo.director},
    {rol: 'Coordinador(a)', ...proj.equipo.coordinador},
    ...(proj.equipo.integrantes || []).map((i) => ({rol: i.cargo || 'Docente', ...i})),
  ];

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${escapeHtml(proj.seed.titulo || 'Expediente CNPIE 2027')}</title>
<style>
  body { font-family: Arial, Helvetica, sans-serif; color: #0f172a; line-height: 1.55; margin: 0; padding: ${isStandaloneWeb ? '20px' : '18px'}; background: ${isStandaloneWeb ? '#f1f5f9' : '#ffffff'}; }
  .doc-wrap { max-width: 960px; margin: 0 auto; background: #ffffff; padding: ${isStandaloneWeb ? '28px' : '0'}; border-radius: 12px; }
  h1 { color: #991b1b; font-size: 20px; border-bottom: 3px solid #991b1b; padding-bottom: 8px; }
  h2 { color: #1e293b; font-size: 16px; background: #f1f5f9; padding: 8px 12px; border-left: 5px solid #991b1b; margin-top: 24px; }
  h3 { color: #0f766e; font-size: 14px; margin-top: 16px; margin-bottom: 6px; }
  table { width: 100%; border-collapse: collapse; margin: 10px 0 16px; font-size: 12.5px; }
  th { background: #1e293b; color: #ffffff; padding: 7px 9px; text-align: left; border: 1px solid #cbd5e1; }
  td { padding: 7px 9px; border: 1px solid #cbd5e1; vertical-align: top; }
  .rubro-box { border: 1px solid #cbd5e1; border-left: 5px solid #0f766e; padding: 10px 12px; margin-bottom: 12px; border-radius: 6px; }
  .toc { background: #f8fafc; border: 1px solid #cbd5e1; padding: 12px 16px; border-radius: 8px; margin: 14px 0; font-size: 13px; }
  .tree-box { border: 1.5px solid #059669; background: #f0fdf4; padding: 12px; border-radius: 8px; margin: 10px 0; }
  pre.legal { white-space: pre-wrap; font-family: Arial, sans-serif; font-size: 12.5px; background: #f8fafc; padding: 12px; border: 1px solid #cbd5e1; }
  @media print { .no-print { display: none; } body { background: #ffffff; } }
</style>
</head>
<body>
<div class="doc-wrap">
  ${isStandaloneWeb ? `<div class="no-print" style="text-align:right; margin-bottom:10px;"><button onclick="window.print()" style="background:#991b1b; color:#fff; border:none; padding:8px 14px; border-radius:6px; font-weight:bold; cursor:pointer;">Imprimir / Guardar PDF</button></div>` : ''}
  <div style="font-size:12px; font-weight:bold; color:#991b1b;">CONCURSO NACIONAL DE PROYECTOS DE INNOVACIÓN EDUCATIVA 2027 - FONDEP</div>
  <h1>${escapeHtml(proj.seed.titulo || 'Proyecto CNPIE 2027')}</h1>
  <p><strong>Línea / Categoría:</strong> ${d.schema.linea} · ${d.labels.catLabel}<br/>
  <strong>Modalidad:</strong> ${d.labels.modLabel} · <strong>Subvención:</strong> ${d.labels.montoLabel} · <strong>Bonificación:</strong> +${d.bonus.pct}% ${d.bonus.points ? `(+${d.bonus.points} pts)` : ''}</p>

  <div class="toc">
    <strong>ÍNDICE GENERAL DEL EXPEDIENTE ORDENADO:</strong>
    <ol style="margin:6px 0 0 18px;">
      <li>Sección I: Anexo N° 1 - Datos de la Institución Educativa y Equipo Responsable</li>
      <li>Sección II: Ficha Descriptiva Ordenada por Rubros (${d.schema.code})</li>
      <li>Sección III: Árbol de Problemas (Numeral 1.1.1)</li>
      <li>Sección IV: Cuadro A - Plan de Implementación 2027</li>
      <li>Sección V: Cuadro B - Presupuesto de Bienes y Servicios (Anexo N° 5)</li>
      <li>Sección VI: Declaraciones Juradas (Anexo N° 3 y Anexo N° 4)</li>
      <li>Sección VII: Instrumentos y Evidencias Obligatorias por Modalidad</li>
    </ol>
  </div>

  <h2>SECCIÓN I: ANEXO N° 1 · DATOS DE LA INSTITUCIÓN EDUCATIVA Y EQUIPO RESPONSABLE</h2>
  <table>
    <tr><th>Institución Educativa</th><td>${escapeHtml(proj.ie.nombre)}</td><th>Código Modular</th><td>${escapeHtml(proj.ie.codigo)}</td></tr>
    <tr><th>DRE / UGEL</th><td>${escapeHtml(proj.ie.dre)} / ${escapeHtml(proj.ie.ugel)}</td><th>Nivel / Estudiantes</th><td>${escapeHtml(proj.ie.nivel)} (${proj.ie.estudiantes} est.)</td></tr>
    <tr><th>Ubicación</th><td>${escapeHtml(proj.ie.distrito)}, ${escapeHtml(proj.ie.provincia)}, ${escapeHtml(proj.ie.region)}</td><th>Ámbito / EIB</th><td>${escapeHtml(proj.ie.area)} · ${escapeHtml(proj.ie.eib_tipo)} ${proj.ie.lengua ? `(${escapeHtml(proj.ie.lengua)})` : ''}</td></tr>
  </table>
  <table>
    <thead><tr><th>Rol</th><th>Apellidos y Nombres</th><th>DNI</th><th>Celular</th><th>Correo</th></tr></thead>
    <tbody>
      ${teamRows.map((m) => `<tr><td>${escapeHtml(m.rol)}</td><td>${escapeHtml(m.nombre)}</td><td>${escapeHtml(m.dni)}</td><td>${escapeHtml(m.celular || '-')}</td><td>${escapeHtml(m.correo || '-')}</td></tr>`).join('')}
    </tbody>
  </table>

  <h2>SECCIÓN II: FICHA DESCRIPTIVA ORDENADA POR RUBROS (${d.schema.code})</h2>
  ${d.rubrosOrdered
    .map(
      (r) => `
    <div class="rubro-box">
      <h3>RUBRO ${r.order} · NUMERAL ${r.code} - ${escapeHtml(r.label)}</h3>
      <div style="white-space:pre-line; font-size:13px;">${escapeHtml(r.text)}</div>
    </div>`
    )
    .join('')}

  <h2>SECCIÓN III: ÁRBOL DE PROBLEMAS (NUMERAL 1.1.1)</h2>
  <div class="tree-box">
    <p><strong>Efecto Final:</strong> ${escapeHtml(d.arbol.efectoFinal)}</p>
    <p><strong>Efectos Directos (Ramas):</strong><br/>
    1. ${escapeHtml(d.arbol.efectosDirectos[0])}<br/>
    2. ${escapeHtml(d.arbol.efectosDirectos[1])}<br/>
    3. ${escapeHtml(d.arbol.efectosDirectos[2])}</p>
    <p style="background:#fef3c7; padding:8px; border-left:4px solid #d97706;"><strong>Problema Central (Tronco):</strong> ${escapeHtml(d.arbol.problemaCentral)}</p>
    <p><strong>Causas Directas e Indirectas (Raíces):</strong><br/>
    1. ${escapeHtml(d.arbol.causasDirectas[0])} → <em>${escapeHtml(d.arbol.causasIndirectas[0])}</em><br/>
    2. ${escapeHtml(d.arbol.causasDirectas[1])} → <em>${escapeHtml(d.arbol.causasIndirectas[1])}</em><br/>
    3. ${escapeHtml(d.arbol.causasDirectas[2])} → <em>${escapeHtml(d.arbol.causasIndirectas[2])}</em></p>
  </div>

  <h2>SECCIÓN IV: CUADRO A · PLAN DE IMPLEMENTACIÓN 2027</h2>
  <table>
    <thead><tr><th>Objetivo / Fase</th><th>Actividad Principal 2027</th><th>Metas / Evidencias</th><th>Responsable</th><th>Plazo</th></tr></thead>
    <tbody>
      ${(proj.cuadroA || []).map((r) => `<tr><td>${escapeHtml(r.fase)}</td><td>${escapeHtml(r.actividad)}</td><td>${escapeHtml(r.evidencia)}</td><td>${escapeHtml(r.responsable)}</td><td>${escapeHtml(r.plazo)}</td></tr>`).join('')}
    </tbody>
  </table>

  <h2>SECCIÓN V: CUADRO B · PRESUPUESTO DE BIENES Y SERVICIOS (ANEXO N° 5)</h2>
  <table>
    <thead><tr><th>Rubro</th><th>Descripción</th><th>Unidad</th><th>Cant.</th><th>P. Unit (S/)</th><th>Total (S/)</th><th>Justificación</th></tr></thead>
    <tbody>
      ${(proj.cuadroB || [])
        .map((r) => {
          const sub = (Number(r.cant) || 0) * (Number(r.unit) || 0);
          return `<tr><td>${escapeHtml(r.rubro)}</td><td>${escapeHtml(r.desc)}</td><td>${escapeHtml(r.unidad)}</td><td>${r.cant}</td><td>${Number(r.unit).toFixed(2)}</td><td>${sub.toFixed(2)}</td><td>${escapeHtml(r.just)}</td></tr>`;
        })
        .join('')}
      <tr><td colspan="5" style="text-align:right; font-weight:bold;">Subtotal Bienes:</td><td colspan="2" style="font-weight:bold;">S/ ${d.bSum.toFixed(2)}</td></tr>
      <tr><td colspan="5" style="text-align:right; font-weight:bold;">Subtotal Servicios:</td><td colspan="2" style="font-weight:bold;">S/ ${d.sSum.toFixed(2)}</td></tr>
      <tr style="background:#fef2f2;"><td colspan="5" style="text-align:right; font-weight:bold; color:#991b1b;">TOTAL SUBVENCIÓN:</td><td colspan="2" style="font-weight:bold; color:#991b1b;">S/ ${d.totalSum.toFixed(2)}</td></tr>
    </tbody>
  </table>

  <h2>SECCIÓN VI: DECLARACIONES JURADAS (ANEXO N° 3 Y ANEXO N° 4)</h2>
  <pre class="legal">${escapeHtml(d.anexo3)}</pre>
  <pre class="legal">${escapeHtml(d.anexo4)}</pre>

  <h2>SECCIÓN VII: INSTRUMENTOS Y EVIDENCIAS OBLIGATORIAS POR MODALIDAD</h2>
  <p><strong>Enlace Video YouTube (Máx. 3 min):</strong> ${escapeHtml(proj.videoUrl || 'Pendiente de enlace público')}</p>
  ${d.reqInst
    .map(
      (inst, idx) => `
    <div class="rubro-box">
      <h3>Instrumento ${idx + 1} · ${escapeHtml(inst.title)} (${escapeHtml(inst.format)})</h3>
      <div style="white-space:pre-line; font-size:12.5px;">${escapeHtml((proj.instruments && proj.instruments[inst.id]) || '[Pendiente de generar]')}</div>
    </div>`
    )
    .join('')}
</div>
</body>
</html>`;
}

export function exportToWordDoc(proj: ProjectModel): void {
  const html = buildStructuredDocumentHTML(proj, false);
  const blob = new Blob(['\ufeff', html], {type: 'application/msword;charset=utf-8'});
  triggerSafeDownload(blob, getSafeFileName(proj, 'doc'));
}

export function exportToWebHTML(proj: ProjectModel): void {
  const html = buildStructuredDocumentHTML(proj, true);
  const blob = new Blob([html], {type: 'text/html;charset=utf-8'});
  triggerSafeDownload(blob, getSafeFileName(proj, 'html'));
}

export function exportArbolWord(proj: ProjectModel): void {
  const ctx = buildProjectContext(proj);
  const a = proj.arbolProblemas || generateArbolProblemasData(ctx);
  const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>Árbol de Problemas</title></head><body style="font-family:Arial,sans-serif;line-height:1.5;">
    <h2 style="color:#991b1b;">ÁRBOL DE PROBLEMAS - NUMERAL 1.1.1 (CNPIE 2027)</h2>
    <p><strong>Institución Educativa:</strong> ${escapeHtml(proj.ie.nombre)} (${escapeHtml(proj.ie.distrito)})</p>
    <p><strong>Proyecto:</strong> ${escapeHtml(proj.seed.titulo)}</p><hr/>
    <h3 style="color:#065f46;">1. EFECTO FINAL</h3><p>${escapeHtml(a.efectoFinal)}</p>
    <h3 style="color:#047857;">2. EFECTOS DIRECTOS (CONSECUENCIAS)</h3>
    <ul><li>${escapeHtml(a.efectosDirectos[0])}</li><li>${escapeHtml(a.efectosDirectos[1])}</li><li>${escapeHtml(a.efectosDirectos[2])}</li></ul>
    <h3 style="color:#b45309;">3. PROBLEMA CENTRAL</h3><p><strong>${escapeHtml(a.problemaCentral)}</strong></p>
    <h3 style="color:#991b1b;">4. CAUSAS DIRECTAS E INDIRECTAS</h3>
    <ul>
      <li><strong>${escapeHtml(a.causasDirectas[0])}</strong> — <em>${escapeHtml(a.causasIndirectas[0])}</em></li>
      <li><strong>${escapeHtml(a.causasDirectas[1])}</strong> — <em>${escapeHtml(a.causasIndirectas[1])}</em></li>
      <li><strong>${escapeHtml(a.causasDirectas[2])}</strong> — <em>${escapeHtml(a.causasIndirectas[2])}</em></li>
    </ul>
  </body></html>`;
  const blob = new Blob(['\ufeff', html], {type: 'application/msword;charset=utf-8'});
  triggerSafeDownload(blob, `Arbol_Problemas_${proj.category}.doc`);
}

function toWinAnsiBytes(str: string): number[] {
  const map: Record<string, number> = {
    Á: 0xc1,
    É: 0xc9,
    Í: 0xcd,
    Ó: 0xd3,
    Ú: 0xda,
    Ü: 0xdc,
    Ñ: 0xd1,
    á: 0xe1,
    é: 0xe9,
    í: 0xed,
    ó: 0xf3,
    ú: 0xfa,
    ü: 0xfc,
    ñ: 0xf1,
    '¿': 0xbf,
    '¡': 0xa1,
    '°': 0xb0,
    '·': 0xb7,
    '•': 0x95,
    '—': 0x97,
    '–': 0x96,
    '“': 0x93,
    '”': 0x94,
    '‘': 0x91,
    '’': 0x92,
    '«': 0xab,
    '»': 0xbb,
    '≥': 0x3e,
    '≤': 0x3c,
    '↔': 0x2d,
  };
  const out: number[] = [];
  for (let i = 0; i < str.length; i++) {
    const ch = str[i];
    const code = str.charCodeAt(i);
    if (ch === '(' || ch === ')' || ch === '\\') {
      out.push(0x5c, code);
    } else if (code >= 32 && code <= 126) {
      out.push(code);
    } else if (map[ch] !== undefined) {
      out.push(map[ch]);
    } else {
      out.push(0x20);
    }
  }
  return out;
}

function wrapTextLines(text: string, maxCharsPerLine: number): string[] {
  const result: string[] = [];
  const rawLines = (text || '').split(/\r?\n/);
  rawLines.forEach((raw) => {
    const trimmed = raw.trim();
    if (!trimmed) {
      result.push('');
      return;
    }
    const words = trimmed.split(/\s+/);
    let line = '';
    words.forEach((w) => {
      if (!line) {
        line = w.length > maxCharsPerLine ? w.slice(0, maxCharsPerLine) : w;
      } else if (`${line} ${w}`.length <= maxCharsPerLine) {
        line += ` ${w}`;
      } else {
        result.push(line);
        line = w.length > maxCharsPerLine ? w.slice(0, maxCharsPerLine) : w;
      }
    });
    if (line) result.push(line);
  });
  return result;
}

export function exportToNativePDF(proj: ProjectModel): number {
  const d = buildOrderedExpedienteSections(proj);
  const docLines: Array<{type: 'h1' | 'h2' | 'p'; text: string}> = [];

  const addTitle = (t: string) => docLines.push({type: 'h1', text: t});
  const addSub = (t: string) => docLines.push({type: 'h2', text: t});
  const addBody = (t: string) => {
    wrapTextLines(t, 88).forEach((l) => docLines.push({type: 'p', text: l}));
  };

  addTitle('EXPEDIENTE DE POSTULACION CNPIE 2027 - FONDEP');
  addSub(proj.seed.titulo || 'Proyecto CNPIE 2027');
  addBody(`${d.schema.linea} | ${d.labels.catLabel} | ${d.labels.modLabel} | ${d.labels.montoLabel}`);
  addBody('');

  addTitle('SECCION I: ANEXO N° 1 - DATOS DE LA IE Y EQUIPO RESPONSABLE');
  addBody(`IE: ${proj.ie.nombre} (Codigo Modular: ${proj.ie.codigo}) | DRE/UGEL: ${proj.ie.dre} / ${proj.ie.ugel}`);
  addBody(`Ubicacion: ${proj.ie.distrito}, ${proj.ie.provincia}, ${proj.ie.region} | Ambito: ${proj.ie.area} | Estudiantes: ${proj.ie.estudiantes}`);
  addBody(`Director(a): ${proj.equipo.director.nombre} (DNI ${proj.equipo.director.dni}) | Coordinador(a): ${proj.equipo.coordinador.nombre} (DNI ${proj.equipo.coordinador.dni})`);
  addBody('');

  addTitle(`SECCION II: FICHA DESCRIPTIVA ORDENADA (${d.schema.code})`);
  d.rubrosOrdered.forEach((r) => {
    addSub(`RUBRO ${r.order} · NUMERAL ${r.code} - ${r.label}`);
    addBody(r.text);
    addBody('');
  });

  addTitle('SECCION III: ARBOL DE PROBLEMAS (NUMERAL 1.1.1)');
  addBody(`Efecto Final: ${d.arbol.efectoFinal}`);
  d.arbol.efectosDirectos.forEach((ef, i) => addBody(`Efecto Directo ${i + 1}: ${ef}`));
  addSub(`Problema Central: ${d.arbol.problemaCentral}`);
  d.arbol.causasDirectas.forEach((cd, i) => {
    addBody(`Causa Directa ${i + 1}: ${cd}`);
    addBody(`Causa Indirecta ${i + 1}.1: ${d.arbol.causasIndirectas[i] || ''}`);
  });
  addBody('');

  addTitle('SECCION IV: CUADRO A - PLAN DE IMPLEMENTACION 2027');
  (proj.cuadroA || []).forEach((r, i) => {
    addBody(`${i + 1}. [${r.fase}] ${r.actividad} | Evidencia: ${r.evidencia} | Resp: ${r.responsable} (${r.plazo})`);
  });
  addBody('');

  addTitle('SECCION V: CUADRO B - PRESUPUESTO DE BIENES Y SERVICIOS (ANEXO N° 5)');
  (proj.cuadroB || []).forEach((r, i) => {
    const sub = (Number(r.cant) || 0) * (Number(r.unit) || 0);
    addBody(`${i + 1}. [${r.rubro}] ${r.desc} (${r.cant} ${r.unidad} x S/ ${Number(r.unit).toFixed(2)}) = S/ ${sub.toFixed(2)} | ${r.just}`);
  });
  addSub(`Subtotal Bienes: S/ ${d.bSum.toFixed(2)} | Subtotal Servicios: S/ ${d.sSum.toFixed(2)} | TOTAL: S/ ${d.totalSum.toFixed(2)}`);
  addBody('');

  addTitle('SECCION VI: DECLARACIONES JURADAS (ANEXO N° 3 Y ANEXO N° 4)');
  addBody(d.anexo3);
  addBody('');
  addBody(d.anexo4);
  addBody('');

  addTitle('SECCION VII: INSTRUMENTOS Y EVIDENCIAS OBLIGATORIAS POR MODALIDAD');
  addBody(`Enlace Video YouTube: ${proj.videoUrl || 'Pendiente de registro'}`);
  d.reqInst.forEach((inst, i) => {
    addSub(`Instrumento ${i + 1}: ${inst.title} (${inst.format})`);
    addBody((proj.instruments && proj.instruments[inst.id]) || '[Pendiente]');
    addBody('');
  });

  const pages: Array<Array<{type: 'h1' | 'h2' | 'p'; text: string; y: number}>> = [];
  let currPage: Array<{type: 'h1' | 'h2' | 'p'; text: string; y: number}> = [];
  let y = 780;
  const minY = 55;

  docLines.forEach((item, idx) => {
    const stepY = item.type === 'h1' ? 18 : item.type === 'h2' ? 15 : 13;
    const isHeading = item.type === 'h1' || item.type === 'h2';
    if (y - stepY < minY || (isHeading && y - stepY * 2.5 < minY && idx < docLines.length - 1)) {
      pages.push(currPage);
      currPage = [];
      y = 780;
    }
    currPage.push({...item, y});
    y -= stepY;
  });
  if (currPage.length) pages.push(currPage);

  const chunks: number[] = [];
  const offsets: number[] = [0];
  let byteLen = 0;

  const pushStr = (s: string) => {
    for (let i = 0; i < s.length; i++) {
      chunks.push(s.charCodeAt(i) & 0xff);
      byteLen++;
    }
  };
  const pushBytes = (arr: number[]) => {
    for (let i = 0; i < arr.length; i++) {
      chunks.push(arr[i] & 0xff);
      byteLen++;
    }
  };

  pushStr('%PDF-1.4\n');

  const totalPages = pages.length;
  const addObj = (id: number, writeContentFn: () => void) => {
    offsets[id] = byteLen;
    pushStr(`${id} 0 obj\n`);
    writeContentFn();
    pushStr('\nendobj\n');
  };

  addObj(1, () => pushStr('<< /Type /Catalog /Pages 2 0 R >>'));
  const kidsRefs = pages.map((_, i) => `${5 + i * 2} 0 R`).join(' ');
  addObj(2, () => pushStr(`<< /Type /Pages /Kids [ ${kidsRefs} ] /Count ${totalPages} >>`));
  addObj(3, () => pushStr('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>'));
  addObj(4, () => pushStr('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>'));

  pages.forEach((pLines, pIdx) => {
    const pageObjId = 5 + pIdx * 2;
    const contObjId = 6 + pIdx * 2;

    addObj(pageObjId, () => {
      pushStr(
        `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contObjId} 0 R >>`
      );
    });

    const streamBytes: number[] = [];
    const addStreamStr = (s: string) => {
      for (let i = 0; i < s.length; i++) streamBytes.push(s.charCodeAt(i) & 0xff);
    };
    const addStreamText = (fontTag: string, size: number, x: number, posY: number, txt: string) => {
      addStreamStr(`BT ${fontTag} ${size} Tf 1 0 0 1 ${x} ${posY} Tm (`);
      toWinAnsiBytes(txt).forEach((b) => streamBytes.push(b));
      addStreamStr(') Tj ET\n');
    };

    addStreamText('/F2', 8.5, 45, 812, 'CNPIE 2027 - FONDEP | Expediente de Postulacion Ordenado');
    addStreamText('/F1', 8.5, 475, 28, `Pagina ${pIdx + 1} de ${totalPages}`);

    pLines.forEach((ln) => {
      if (!ln.text) return;
      if (ln.type === 'h1') {
        addStreamText('/F2', 11, 45, ln.y, ln.text);
      } else if (ln.type === 'h2') {
        addStreamText('/F2', 9.8, 45, ln.y, ln.text);
      } else {
        addStreamText('/F1', 9.2, 45, ln.y, ln.text);
      }
    });

    addObj(contObjId, () => {
      pushStr(`<< /Length ${streamBytes.length} >>\nstream\n`);
      pushBytes(streamBytes);
      pushStr('endstream');
    });
  });

  const xrefStart = byteLen;
  const maxObjId = 4 + totalPages * 2;
  pushStr(`xref\n0 ${maxObjId + 1}\n`);
  pushStr('0000000000 65535 f \n');
  for (let id = 1; id <= maxObjId; id++) {
    const off = String(offsets[id] || 0).padStart(10, '0');
    pushStr(`${off} 00000 n \n`);
  }
  pushStr(`trailer\n<< /Size ${maxObjId + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`);

  const pdfBytes = new Uint8Array(chunks);
  const blob = new Blob([pdfBytes], {type: 'application/pdf'});
  triggerSafeDownload(blob, getSafeFileName(proj, 'pdf'));
  return totalPages;
}

export function exportProjectJSON(proj: ProjectModel): void {
  const blob = new Blob([JSON.stringify(proj, null, 2)], {type: 'application/json;charset=utf-8'});
  triggerSafeDownload(blob, getSafeFileName(proj, 'json'));
}
