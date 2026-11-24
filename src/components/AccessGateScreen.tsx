import React, {useState} from 'react';
import {
  ArrowLeft,
  Clock,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  ShieldCheck,
  UserCheck,
} from 'lucide-react';
import type {AuthRole, AuthState} from '../types/cnpie';
import {authenticateUser, getTrialStatus} from '../utils/cnpieAuth';

interface AccessGateScreenProps {
  auth: AuthState;
  onSuccessLogin: (nextAuth: AuthState, role: Exclude<AuthRole, 'none'>, displayName: string) => void;
  onStartFreeTrial?: () => void;
  onBackToCover: () => void;
}

export const AccessGateScreen: React.FC<AccessGateScreenProps> = ({
  auth,
  onSuccessLogin,
  onStartFreeTrial,
  onBackToCover,
}) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const trial = getTrialStatus(auth);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const res = authenticateUser(auth, username, password);
    if (res.ok === true) {
      setErrorMsg('');
      onSuccessLogin(res.nextAuth, res.role, res.displayName);
    } else {
      setErrorMsg(res.error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-100 via-white to-blue-50/50 flex flex-col justify-center px-4 py-8">
      <div className="mx-auto w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xl space-y-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-wider text-blue-800">
              Control de Acceso · KipuIA 2027
            </p>
            <h1 className="mt-1 font-display text-2xl font-extrabold text-slate-900">
              Iniciar Sesión
            </h1>
          </div>
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-800">
            <Lock className="h-5 w-5" aria-hidden="true" />
          </div>
        </div>

        {trial.status === 'expired' ? (
          <div className="rounded-xl border border-amber-300 bg-amber-50 p-3.5 text-xs sm:text-sm text-amber-950 space-y-1">
            <div className="flex items-center gap-1.5 font-extrabold">
              <Clock className="h-4 w-4 text-amber-700 shrink-0" aria-hidden="true" />
              <span>Periodo libre de 2 días finalizado</span>
            </div>
            <p className="leading-relaxed">
              Para continuar usando la aplicación web y móvil, ingresa con el usuario y contraseña
              asignados por el Administrador.
            </p>
          </div>
        ) : (
          <p className="text-sm text-slate-600 leading-relaxed">
            Ingresa con tu usuario y contraseña de <strong>Docente</strong> o accede como{' '}
            <strong>Administrador</strong> para registrar nuevos docentes.
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="gate_user" className="block text-xs font-bold text-slate-800 mb-1.5">
              Usuario
            </label>
            <div className="relative">
              <UserCheck
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400"
                aria-hidden="true"
              />
              <input
                id="gate_user"
                type="text"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Ej. prof_quispe o ADMIN"
                className="w-full rounded-xl border border-slate-300 bg-white pl-9 pr-3 py-2.5 text-base sm:text-sm text-slate-900 focus:border-blue-700 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label htmlFor="gate_pass" className="block text-xs font-bold text-slate-800 mb-1.5">
              Contraseña
            </label>
            <div className="relative">
              <KeyRound
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400"
                aria-hidden="true"
              />
              <input
                id="gate_pass"
                type={showPass ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Ingresa tu contraseña..."
                className="w-full rounded-xl border border-slate-300 bg-white pl-9 pr-10 py-2.5 text-base sm:text-sm text-slate-900 focus:border-blue-700 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setShowPass((v) => !v)}
                aria-label={showPass ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-500 hover:text-slate-800 cursor-pointer"
              >
                {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {errorMsg && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs sm:text-sm font-medium text-red-800">
              {errorMsg}
            </div>
          )}

          <button
            type="submit"
            className="w-full inline-flex min-h-[46px] items-center justify-center gap-2 rounded-xl bg-blue-700 px-4 py-2.5 text-sm sm:text-base font-bold text-white hover:bg-blue-800 transition-colors cursor-pointer"
          >
            <ShieldCheck className="h-4 w-4" aria-hidden="true" />
            <span>Ingresar al Aplicativo</span>
          </button>
        </form>

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700 leading-relaxed">
          <strong>¿Eres Administrador?</strong> Ingresa con usuario{' '}
          <code className="font-mono-tabular font-bold text-blue-900">ADMIN</code> y tu clave
          maestra (por defecto <code className="font-mono-tabular font-bold">ADMIN2027</code>) para
          registrar docentes con su usuario y contraseña.
        </div>

        <div className="flex flex-col gap-2 pt-1 border-t border-slate-100">
          {trial.status === 'not_started' && onStartFreeTrial && (
            <button
              type="button"
              onClick={onStartFreeTrial}
              className="w-full inline-flex min-h-[42px] items-center justify-center gap-1.5 rounded-xl border border-teal-300 bg-teal-50 px-4 py-2 text-xs sm:text-sm font-bold text-teal-900 hover:bg-teal-100 cursor-pointer"
            >
              <Clock className="h-4 w-4 text-teal-700" aria-hidden="true" />
              <span>Activar Ingreso Libre por 2 Días (48h)</span>
            </button>
          )}
          <button
            type="button"
            onClick={onBackToCover}
            className="w-full inline-flex min-h-[40px] items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs sm:text-sm font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            <span>Volver a la Portada</span>
          </button>
        </div>
      </div>
    </div>
  );
};
