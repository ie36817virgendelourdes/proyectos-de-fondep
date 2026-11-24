import React from 'react';
import {X} from 'lucide-react';

interface BasesModalProps {
  open: boolean;
  onClose: () => void;
}

export const BasesModal: React.FC<BasesModalProps> = ({open, onClose}) => {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/60 p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-t-3xl sm:rounded-2xl bg-white p-5 sm:p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-slate-300 sm:hidden" />
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-extrabold text-slate-900">
              Guía Oficial Bases CNPIE 2027 (RGE N° 0006-2026-FONDEP)
            </h2>
            <p className="text-sm text-slate-700 mt-1">
              Topes financieros, proporciones Anexo N° 5, bonificaciones y calibración de palabras.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex min-h-[42px] min-w-[42px] items-center justify-center rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50"
            aria-label="Cerrar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-4 space-y-4 text-base text-slate-800 leading-relaxed">
          <div>
            <h3 className="font-bold text-slate-900 mb-1.5">
              1. Topes de Subvención y Proporción Bienes / Servicios (Numeral 16)
            </h3>
            <ul className="list-disc pl-5 space-y-1.5 text-slate-700">
              <li>
                <strong>Categoría 1 (Anexo 2A Consolidación) y Categoría 2 (Anexo 2B Promisorio):</strong>{' '}
                Hasta <strong>S/ 18,000</strong> (70% Bienes / 30% Servicios). Para IIEE EIB de ámbito
                lingüístico amazónico: hasta <strong>S/ 21,600</strong> (70% Bienes / 30% Servicios).
              </li>
              <li>
                <strong>Categoría 3 (Anexo 2C Productivos MSE-SFT):</strong> Hasta{' '}
                <strong>S/ 70,000</strong> (80% Bienes / 20% Servicios).
              </li>
              <li>
                <strong>Categoría 4 (Anexo 2D IAPE):</strong> Hasta <strong>S/ 14,000</strong> (70%
                Bienes / 30% Servicios).
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-bold text-slate-900 mb-1.5">
              2. Bonificaciones Oficiales (Numeral 15.4.2.3)
            </h3>
            <ul className="list-disc pl-5 space-y-1.5 text-slate-700">
              <li>
                <strong>+10%:</strong> Rural 1, Zona VRAEM o Zona de Frontera.
              </li>
              <li>
                <strong>+5%:</strong> Rural 2, EIB, Multigrado, Unidocente o MSE-SFT.
              </li>
              <li>
                <strong>+2 puntos adicionales:</strong> Convenio vigente con CETPRO, IEST o entidad
                del sector productivo.
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-bold text-slate-900 mb-1.5">
              3. Regla de Extensión del Aplicativo (-100 palabras)
            </h3>
            <p className="text-slate-700">
              Cada rubro está calibrado automáticamente a <strong>-100 palabras</strong> respecto al
              tope equivalente de las Bases para asegurar precisión pedagógica de Nivel IV sin
              desbordar los campos oficiales en la plataforma RED FONDEP.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
