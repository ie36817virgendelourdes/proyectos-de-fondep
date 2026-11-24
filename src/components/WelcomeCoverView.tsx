import React from 'react';
import {motion} from 'motion/react';
import {
  ArrowRight,
  Clock,
  FolderOpen,
  KeyRound,
  Lock,
  Mic,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import type {AuthState} from '../types/cnpie';
import {getTrialStatus, isAdminSession, isLicensedUser} from '../utils/cnpieAuth';

interface WelcomeCoverViewProps {
  projectCount: number;
  auth: AuthState;
  onEnterApp: () => void;
  onStartFreeTrialAndEnter: () => void;
  onOpenLoginGate: () => void;
  onQuickStartDemo: () => void;
}

export const WelcomeCoverView: React.FC<WelcomeCoverViewProps> = ({
  projectCount,
  auth,
  onEnterApp,
  onStartFreeTrialAndEnter,
  onOpenLoginGate,
  onQuickStartDemo,
}) => {
  const licensed = isLicensedUser(auth);
  const admin = isAdminSession(auth);
  const trial = getTrialStatus(auth);
  const canEnterDirectly = licensed || trial.status === 'active';

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50/70 via-white to-blue-50/60 flex flex-col justify-center px-4 py-6 sm:py-10">
      <motion.section
        initial={{opacity: 0, y: 16}}
        animate={{opacity: 1, y: 0}}
        transition={{duration: 0.35, ease: 'easeOut'}}
        aria-label="Portada de inicio KipuIA"
        className="mx-auto w-full max-w-5xl rounded-3xl border-2 border-amber-300/90 bg-white p-4 sm:p-7 shadow-xl space-y-6"
      >
        {/* Imagen de portada oficial personalizada (chaleco guindo FONDEP + logo JAM) */}
        <div className="overflow-hidden rounded-2xl border-2 border-blue-200 bg-sky-50/50 p-1.5 sm:p-2 shadow-sm">
          <img
            src="/src/assets/images/kipuia_portada_guindo_1795554752583.jpg"
            alt="KipuIA - Tejiendo proyectos educativos con inteligencia"
            referrerPolicy="no-referrer"
            className="w-full h-auto max-h-[60vh] object-contain mx-auto rounded-xl"
          />
        </div>

        {/* Propuesta de valor + Botones de Ingreso (Libre 2 días o Usuario/Contraseña) */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5 pt-1">
          <div className="space-y-2 max-w-2xl">
            <h1 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
              ¡Tus ideas transforman aulas: construye hoy tu proyecto de innovación pedagógica 2027!
            </h1>
            <p className="text-sm sm:text-base text-slate-700 leading-relaxed">
              Formula proyectos de innovación e investigación educativa (Anexos 2A, 2B, 2C y 2D)
              sin internet, dicta tus justificaciones por voz, controla el avance con indicadores
              visuales y exporta tu expediente completo en Word o PDF.
            </p>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 pt-1 text-xs sm:text-sm font-semibold text-slate-700">
              <span className="inline-flex items-center gap-1.5 text-blue-900">
                <Mic className="h-4 w-4 text-red-700" aria-hidden="true" />
                Dictado por voz integrado
              </span>
              <span className="inline-flex items-center gap-1.5 text-teal-900">
                <ShieldCheck className="h-4 w-4 text-teal-700" aria-hidden="true" />
                Auditoría FONDEP (-100 pal.)
              </span>
              <span className="inline-flex items-center gap-1.5 text-amber-900">
                <Sparkles className="h-4 w-4 text-amber-700" aria-hidden="true" />
                100% Offline
              </span>
            </div>

            {/* Estado claro del acceso (Sesión activa / Prueba de 2 días / Expirado) */}
            {licensed ? (
              <div className="pt-1 text-xs sm:text-sm font-semibold text-emerald-800">
                Sesión activa: {auth.activeDisplayName || auth.activeUser} (
                {admin ? 'Administrador' : 'Docente registrado'})
              </div>
            ) : trial.status === 'active' ? (
              <div className="pt-1 inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-teal-900">
                <Clock className="h-4 w-4 text-teal-700 shrink-0" aria-hidden="true" />
                <span>Ingreso libre activo · Tiempo restante: {trial.remainingLabel}</span>
              </div>
            ) : trial.status === 'expired' ? (
              <div className="pt-1 inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-red-800">
                <Lock className="h-4 w-4 text-red-700 shrink-0" aria-hidden="true" />
                <span>
                  Prueba libre de 2 días finalizada. Ingresa con tu usuario y contraseña para continuar.
                </span>
              </div>
            ) : (
              <div className="pt-1 inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-blue-900">
                <Clock className="h-4 w-4 text-blue-700 shrink-0" aria-hidden="true" />
                <span>Incluye opción de ingreso libre por 2 días o acceso con usuario y clave.</span>
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row lg:flex-col gap-2.5 shrink-0">
            {canEnterDirectly ? (
              <>
                <motion.button
                  type="button"
                  onClick={onEnterApp}
                  whileHover={{scale: 1.03, y: -1}}
                  whileTap={{scale: 0.97}}
                  transition={{type: 'spring', stiffness: 400, damping: 24}}
                  className="group inline-flex min-h-[54px] items-center justify-center gap-2.5 rounded-2xl bg-gradient-to-r from-blue-700 via-blue-800 to-indigo-800 px-7 py-3.5 text-base sm:text-lg font-extrabold text-white shadow-lg shadow-blue-900/25 hover:from-blue-800 hover:to-indigo-900 focus:outline-none focus:ring-4 focus:ring-blue-300 cursor-pointer"
                >
                  <span>{projectCount > 0 ? 'Ingresar e Iniciar' : 'Iniciar Taller'}</span>
                  <ArrowRight
                    className="h-5 w-5 transition-transform duration-200 group-hover:translate-x-1"
                    aria-hidden="true"
                  />
                </motion.button>

                <button
                  type="button"
                  onClick={onOpenLoginGate}
                  className="inline-flex min-h-[42px] items-center justify-center gap-1.5 rounded-xl border border-slate-300 bg-slate-50 px-4 py-2 text-xs sm:text-sm font-bold text-slate-800 hover:bg-slate-100 cursor-pointer"
                >
                  <KeyRound className="h-4 w-4 text-blue-700" aria-hidden="true" />
                  <span>
                    {licensed ? 'Cambiar Usuario / Admin' : 'Ingresar con Usuario y Clave'}
                  </span>
                </button>

                {projectCount === 0 && (
                  <button
                    type="button"
                    onClick={onQuickStartDemo}
                    className="inline-flex min-h-[40px] items-center justify-center gap-1.5 rounded-xl border border-teal-300 bg-teal-50 px-4 py-2 text-xs font-bold text-teal-900 hover:bg-teal-100 cursor-pointer"
                  >
                    <Sparkles className="h-4 w-4 text-teal-700" aria-hidden="true" />
                    <span>Ingresar con Proyecto de Ejemplo</span>
                  </button>
                )}
              </>
            ) : trial.status === 'not_started' ? (
              <>
                <motion.button
                  type="button"
                  onClick={onStartFreeTrialAndEnter}
                  whileHover={{scale: 1.03, y: -1}}
                  whileTap={{scale: 0.97}}
                  transition={{type: 'spring', stiffness: 400, damping: 24}}
                  className="group inline-flex min-h-[54px] items-center justify-center gap-2.5 rounded-2xl bg-gradient-to-r from-blue-700 via-blue-800 to-indigo-800 px-7 py-3.5 text-base sm:text-lg font-extrabold text-white shadow-lg shadow-blue-900/25 hover:from-blue-800 hover:to-indigo-900 focus:outline-none focus:ring-4 focus:ring-blue-300 cursor-pointer"
                >
                  <span>Ingreso Libre (2 Días)</span>
                  <ArrowRight
                    className="h-5 w-5 transition-transform duration-200 group-hover:translate-x-1"
                    aria-hidden="true"
                  />
                </motion.button>

                <button
                  type="button"
                  onClick={onOpenLoginGate}
                  className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl border border-slate-300 bg-slate-50 px-4 py-2.5 text-xs sm:text-sm font-bold text-slate-900 hover:bg-slate-100 cursor-pointer"
                >
                  <KeyRound className="h-4 w-4 text-blue-700" aria-hidden="true" />
                  <span>Ingresar con Usuario y Contraseña</span>
                </button>
              </>
            ) : (
              <>
                <motion.button
                  type="button"
                  onClick={onOpenLoginGate}
                  whileHover={{scale: 1.03, y: -1}}
                  whileTap={{scale: 0.97}}
                  transition={{type: 'spring', stiffness: 400, damping: 24}}
                  className="group inline-flex min-h-[54px] items-center justify-center gap-2.5 rounded-2xl bg-gradient-to-r from-red-700 via-red-800 to-rose-800 px-7 py-3.5 text-base sm:text-lg font-extrabold text-white shadow-lg shadow-red-900/25 hover:from-red-800 hover:to-rose-900 focus:outline-none focus:ring-4 focus:ring-red-300 cursor-pointer"
                >
                  <KeyRound className="h-5 w-5" aria-hidden="true" />
                  <span>Ingresar con Usuario y Clave</span>
                </motion.button>
                {projectCount > 0 && (
                  <div className="inline-flex items-center justify-center gap-1.5 text-xs font-semibold text-slate-600">
                    <FolderOpen className="h-3.5 w-3.5 text-slate-500" aria-hidden="true" />
                    <span>{projectCount} proyecto(s) respaldados localmente</span>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </motion.section>
    </div>
  );
};
