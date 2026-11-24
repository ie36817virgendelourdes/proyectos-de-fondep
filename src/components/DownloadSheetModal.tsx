import React from 'react';
import {FileCode2, FileJson, FileText, FileType, X} from 'lucide-react';
import type {ProjectModel} from '../types/cnpie';

interface DownloadSheetModalProps {
  open: boolean;
  project: ProjectModel | null;
  onClose: () => void;
  onExportWord: () => void;
  onExportPDF: () => void;
  onExportWeb: () => void;
  onExportJSON: () => void;
}

export const DownloadSheetModal: React.FC<DownloadSheetModalProps> = ({
  open,
  project,
  onClose,
  onExportWord,
  onExportPDF,
  onExportWeb,
  onExportJSON,
}) => {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/60 p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-t-3xl sm:rounded-2xl bg-white p-5 sm:p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-slate-300 sm:hidden" />
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Descargar Expediente Ordenado</h2>
            <p className="mt-1 text-xs text-slate-600">
              {project
                ? `Exporta las 7 secciones oficiales de "${project.seed.titulo || 'Proyecto CNPIE 2027'}" 100% offline.`
                : 'Abre o crea un proyecto primero para exportar su expediente.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex min-h-[40px] min-w-[40px] items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
            aria-label="Cerrar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-2.5">
          <button
            type="button"
            disabled={!project}
            onClick={() => {
              onExportWord();
              onClose();
            }}
            className="flex min-h-[48px] items-center justify-between rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-left text-sm font-semibold text-blue-900 hover:bg-blue-100 disabled:opacity-45 cursor-pointer"
          >
            <span className="flex items-center gap-2.5">
              <FileType className="h-4 w-4 text-blue-700" />
              Documento Word editable (.doc)
            </span>
            <span className="text-xs font-mono-tabular text-blue-700">.DOC</span>
          </button>

          <button
            type="button"
            disabled={!project}
            onClick={() => {
              onExportPDF();
              onClose();
            }}
            className="flex min-h-[48px] items-center justify-between rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-left text-sm font-semibold text-red-900 hover:bg-red-100 disabled:opacity-45 cursor-pointer"
          >
            <span className="flex items-center gap-2.5">
              <FileText className="h-4 w-4 text-red-700" />
              PDF nativo multipágina (.pdf)
            </span>
            <span className="text-xs font-mono-tabular text-red-700">.PDF</span>
          </button>

          <button
            type="button"
            disabled={!project}
            onClick={() => {
              onExportWeb();
              onClose();
            }}
            className="flex min-h-[48px] items-center justify-between rounded-xl border border-teal-200 bg-teal-50 px-4 py-3 text-left text-sm font-semibold text-teal-900 hover:bg-teal-100 disabled:opacity-45 cursor-pointer"
          >
            <span className="flex items-center gap-2.5">
              <FileCode2 className="h-4 w-4 text-teal-700" />
              Página Web autónoma (.html)
            </span>
            <span className="text-xs font-mono-tabular text-teal-700">.HTML</span>
          </button>

          <button
            type="button"
            disabled={!project}
            onClick={() => {
              onExportJSON();
              onClose();
            }}
            className="flex min-h-[48px] items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-left text-sm font-semibold text-slate-800 hover:bg-slate-100 disabled:opacity-45 cursor-pointer"
          >
            <span className="flex items-center gap-2.5">
              <FileJson className="h-4 w-4 text-slate-600" />
              Respaldo portable del proyecto (.json)
            </span>
            <span className="text-xs font-mono-tabular text-slate-600">.JSON</span>
          </button>
        </div>
      </div>
    </div>
  );
};
