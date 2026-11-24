import React, {useEffect, useState} from 'react';
import {
  CheckCircle2,
  Clock,
  Copy,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  LogOut,
  ShieldCheck,
  Trash2,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import type {AuthState, TeacherAccount} from '../types/cnpie';
import {
  authenticateUser,
  FREE_TRIAL_MS,
  generateTeacherPassword,
  getTrialStatus,
  isAdminSession,
  isLicensedUser,
} from '../utils/cnpieAuth';

interface AuthLicenseModalProps {
  open: boolean;
  initialTab?: 'login' | 'admin';
  auth: AuthState;
  projectCount: number;
  onClose: () => void;
  onUpdateAuth: (next: AuthState) => void;
  onCopyText: (text: string, msg: string) => void;
  onNotify: (msg: string) => void;
}

export const AuthLicenseModal: React.FC<AuthLicenseModalProps> = ({
  open,
  initialTab,
  auth,
  projectCount,
  onClose,
  onUpdateAuth,
  onCopyText,
  onNotify,
}) => {
  const adminLoggedIn = isAdminSession(auth);
  const [tab, setTab] = useState<'login' | 'admin'>(
    initialTab || (adminLoggedIn ? 'admin' : 'login')
  );
  const [loginUser, setLoginUser] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [showLoginPass, setShowLoginPass] = useState(false);
  const [loginError, setLoginError] = useState('');

  const [masterInput, setMasterInput] = useState('');
  const [manualAdminUnlock, setManualAdminUnlock] = useState(false);

  const [teacherName, setTeacherName] = useState('');
  const [teacherUser, setTeacherUser] = useState('');
  const [teacherPass, setTeacherPass] = useState('');
  const [revealedIds, setRevealedIds] = useState<Record<string, boolean>>({});
  const [lastRegistered, setLastRegistered] = useState<TeacherAccount | null>(null);
  const [newMasterKey, setNewMasterKey] = useState('');

  useEffect(() => {
    if (open) {
      if (initialTab) {
        setTab(initialTab);
      } else if (adminLoggedIn) {
        setTab('admin');
      }
      setLoginError('');
    }
  }, [open, initialTab, adminLoggedIn]);

  if (!open) return null;

  const licensed = isLicensedUser(auth);
  const trial = getTrialStatus(auth);
  const adminUnlocked = adminLoggedIn || manualAdminUnlock;
  const teachers = auth.registeredTeachers || [];

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const res = authenticateUser(auth, loginUser, loginPass);
    if (res.ok === true) {
      setLoginError('');
      onUpdateAuth(res.nextAuth);
      setLoginUser('');
      setLoginPass('');
      if (res.role === 'admin') {
        setTab('admin');
        onNotify('Sesión de Administrador iniciada. Ya puedes registrar docentes.');
      } else {
        onNotify(`Bienvenido(a), ${res.displayName}. Sesión docente activa.`);
        onClose();
      }
    } else {
      setLoginError(res.error);
    }
  };

  const handleLogout = () => {
    onUpdateAuth({
      ...auth,
      activeUser: null,
      activeKey: null,
      activeRole: 'none',
      activeDisplayName: null,
    });
    setManualAdminUnlock(false);
    setTab('login');
    onNotify('Sesión cerrada correctamente.');
  };

  const handleUnlockAdmin = () => {
    if (masterInput.trim() === auth.masterKey) {
      setManualAdminUnlock(true);
      setMasterInput('');
      onNotify('Panel de Administrador desbloqueado.');
    } else {
      onNotify('Clave maestra de administrador incorrecta.');
    }
  };

  const handleRegisterTeacher = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = teacherName.trim();
    const cleanUser = teacherUser.trim();
    const cleanPass = teacherPass.trim();

    if (!cleanUser || !cleanPass) {
      onNotify('Ingresa un usuario y contraseña para registrar al docente.');
      return;
    }
    if (cleanUser.toUpperCase() === 'ADMIN' || cleanUser.toUpperCase() === 'ADMINISTRADOR') {
      onNotify('El usuario ADMIN está reservado para el Administrador.');
      return;
    }
    const duplicate = teachers.some(
      (t) => t.username.trim().toLowerCase() === cleanUser.toLowerCase()
    );
    if (duplicate) {
      onNotify(`El usuario "${cleanUser}" ya está registrado. Elige otro nombre de usuario.`);
      return;
    }

    const created: TeacherAccount = {
      id: `doc_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      fullName: cleanName || cleanUser,
      username: cleanUser,
      password: cleanPass,
      active: true,
      createdAt: new Date().toLocaleDateString('es-PE'),
    };

    onUpdateAuth({
      ...auth,
      registeredTeachers: [created, ...teachers],
    });
    setLastRegistered(created);
    setTeacherName('');
    setTeacherUser('');
    setTeacherPass('');
    onNotify(`Docente "${created.fullName}" registrado con usuario y contraseña.`);
  };

  const handleToggleTeacherActive = (id: string) => {
    const nextList = teachers.map((t) => (t.id === id ? {...t, active: !t.active} : t));
    onUpdateAuth({...auth, registeredTeachers: nextList});
    onNotify('Estado del docente actualizado.');
  };

  const handleDeleteTeacher = (id: string) => {
    const target = teachers.find((t) => t.id === id);
    const nextList = teachers.filter((t) => t.id !== id);
    const isCurrent =
      target && auth.activeUser && auth.activeUser.toLowerCase() === target.username.toLowerCase();
    onUpdateAuth({
      ...auth,
      registeredTeachers: nextList,
      ...(isCurrent
        ? {activeUser: null, activeKey: null, activeRole: 'none', activeDisplayName: null}
        : {}),
    });
    onNotify('Docente eliminado del registro.');
  };

  const handleResetTrial2Days = () => {
    onUpdateAuth({...auth, trialStartedAt: Date.now()});
    onNotify('Periodo de ingreso libre reiniciado a 2 días (48 horas).');
  };

  const handleExpireTrialNow = () => {
    onUpdateAuth({...auth, trialStartedAt: Date.now() - FREE_TRIAL_MS - 60_000});
    onNotify('Periodo libre marcado como finalizado. Se exigirá usuario y contraseña al salir.');
  };

  const handleChangeMaster = () => {
    const nk = newMasterKey.trim();
    if (nk.length < 4) {
      onNotify('La nueva clave maestra debe tener al menos 4 caracteres.');
      return;
    }
    const nextAuth: AuthState = {
      ...auth,
      masterKey: nk,
      ...(adminLoggedIn ? {activeKey: nk} : {}),
    };
    onUpdateAuth(nextAuth);
    setNewMasterKey('');
    onNotify('Clave maestra de administrador actualizada.');
  };

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
            <h2 className="text-lg sm:text-xl font-extrabold text-slate-900">
              Control de Acceso y Gestión de Docentes
            </h2>
            <p className="mt-1 text-xs sm:text-sm text-slate-600">
              {licensed
                ? `Sesión activa: ${auth.activeDisplayName || auth.activeUser} (${
                    adminLoggedIn ? 'Administrador' : 'Docente'
                  }) · ${projectCount} proyecto(s).`
                : trial.status === 'active'
                ? `Ingreso libre de 2 días activo · Tiempo restante: ${trial.remainingLabel}.`
                : 'El periodo libre de 2 días requiere iniciar sesión con usuario y contraseña.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex min-h-[40px] min-w-[40px] items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 cursor-pointer"
            aria-label="Cerrar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 flex gap-2 border-b border-slate-200 pb-3">
          <button
            type="button"
            onClick={() => setTab('login')}
            className={`min-h-[42px] flex-1 rounded-lg px-3 py-2 text-xs sm:text-sm font-bold transition-colors cursor-pointer ${
              tab === 'login'
                ? 'bg-blue-800 text-white'
                : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
            }`}
          >
            Ingresar / Cambiar Usuario
          </button>
          <button
            type="button"
            onClick={() => setTab('admin')}
            className={`min-h-[42px] flex-1 rounded-lg px-3 py-2 text-xs sm:text-sm font-bold transition-colors cursor-pointer ${
              tab === 'admin'
                ? 'bg-red-800 text-white'
                : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
            }`}
          >
            Administrador · Registrar Docentes ({teachers.length})
          </button>
        </div>

        {tab === 'login' ? (
          <div className="mt-4 space-y-4">
            {licensed ? (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 text-xs sm:text-sm text-emerald-950">
                <div className="flex items-start gap-2.5">
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-700 mt-0.5" />
                  <div>
                    <div className="font-extrabold">
                      Sesión activa: {auth.activeDisplayName || auth.activeUser}
                    </div>
                    <div className="text-xs text-emerald-800">
                      Rol: {adminLoggedIn ? 'Administrador (Acceso total)' : 'Docente registrado'} ·
                      Usuario: <code className="font-mono-tabular font-bold">{auth.activeUser}</code>
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border border-red-300 bg-white px-3 py-1.5 text-xs font-bold text-red-700 hover:bg-red-50 shrink-0 cursor-pointer"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span>Cerrar Sesión</span>
                </button>
              </div>
            ) : (
              <div className="rounded-xl border border-blue-200 bg-blue-50/70 p-3 text-xs sm:text-sm text-blue-950">
                {trial.status === 'active'
                  ? `Estás navegando en el modo de ingreso libre de 2 días (quedan ${trial.remainingLabel}). Puedes iniciar sesión abajo como Docente o Administrador.`
                  : 'Ingresa tu usuario y contraseña asignados por el Administrador para continuar.'}
              </div>
            )}

            <form onSubmit={handleLoginSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1" htmlFor="login_u">
                  Usuario (Docente o ADMIN)
                </label>
                <input
                  id="login_u"
                  type="text"
                  value={loginUser}
                  onChange={(e) => setLoginUser(e.target.value)}
                  placeholder="Ej. prof_quispe o ADMIN"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-base sm:text-sm text-slate-900 focus:border-blue-700 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1" htmlFor="login_k">
                  Contraseña / Clave
                </label>
                <div className="relative">
                  <input
                    id="login_k"
                    type={showLoginPass ? 'text' : 'password'}
                    value={loginPass}
                    onChange={(e) => setLoginPass(e.target.value)}
                    placeholder="Ingresa tu contraseña..."
                    className="w-full rounded-lg border border-slate-300 pl-3 pr-10 py-2.5 text-base sm:text-sm text-slate-900 focus:border-blue-700 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowLoginPass((v) => !v)}
                    aria-label={showLoginPass ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1 text-slate-500 hover:text-slate-800 cursor-pointer"
                  >
                    {showLoginPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {loginError && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-medium text-red-800">
                  {loginError}
                </div>
              )}

              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button
                  type="submit"
                  className="inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-blue-700 px-4 py-2 text-sm font-bold text-white hover:bg-blue-800 cursor-pointer"
                >
                  <KeyRound className="h-4 w-4" />
                  <span>Validar e Ingresar</span>
                </button>
              </div>
            </form>
          </div>
        ) : (
          <div className="mt-4 space-y-5">
            {!adminUnlocked ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
                <div className="text-sm font-bold text-slate-900">
                  Acceso de Administrador requerido
                </div>
                <p className="text-xs text-slate-600">
                  Ingresa la clave maestra de Administrador (por defecto:{' '}
                  <code className="font-mono-tabular font-bold">ADMIN2027</code>) para registrar
                  docentes y gestionar credenciales.
                </p>
                <input
                  id="admin_mk"
                  type="password"
                  value={masterInput}
                  onChange={(e) => setMasterInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleUnlockAdmin();
                    }
                  }}
                  placeholder="Clave maestra de administrador..."
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-base sm:text-sm text-slate-900 focus:border-red-700 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleUnlockAdmin}
                  className="inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 cursor-pointer"
                >
                  <Lock className="h-4 w-4" />
                  <span>Desbloquear Panel Administrador</span>
                </button>
              </div>
            ) : (
              <div className="space-y-5">
                {/* Formulario de registro de docentes */}
                <form
                  onSubmit={handleRegisterTeacher}
                  className="rounded-2xl border-2 border-teal-200 bg-teal-50/50 p-4 space-y-3.5"
                >
                  <div className="flex items-center gap-2 text-sm font-extrabold text-teal-950">
                    <UserPlus className="h-4 w-4 text-teal-700" />
                    <span>Registrar Docente con Usuario y Contraseña</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="sm:col-span-2">
                      <label
                        htmlFor="doc_fullname"
                        className="block text-xs font-bold text-slate-700 mb-1"
                      >
                        Nombre completo del Docente / IE
                      </label>
                      <input
                        id="doc_fullname"
                        type="text"
                        value={teacherName}
                        onChange={(e) => setTeacherName(e.target.value)}
                        placeholder="Ej. Prof. María Elena Quispe Huamán"
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-teal-700 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="doc_username"
                        className="block text-xs font-bold text-slate-700 mb-1"
                      >
                        Usuario de ingreso *
                      </label>
                      <input
                        id="doc_username"
                        type="text"
                        value={teacherUser}
                        onChange={(e) => setTeacherUser(e.target.value)}
                        placeholder="Ej. mquispe2027"
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-teal-700 focus:outline-none"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label
                          htmlFor="doc_password"
                          className="text-xs font-bold text-slate-700"
                        >
                          Contraseña / Clave *
                        </label>
                        <button
                          type="button"
                          onClick={() => setTeacherPass(generateTeacherPassword())}
                          className="text-[11px] font-bold text-teal-800 hover:underline cursor-pointer"
                        >
                          Sugerir clave
                        </button>
                      </div>
                      <input
                        id="doc_password"
                        type="text"
                        value={teacherPass}
                        onChange={(e) => setTeacherPass(e.target.value)}
                        placeholder="Ej. Kipu2027"
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-mono-tabular text-slate-900 focus:border-teal-700 focus:outline-none"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="inline-flex min-h-[42px] items-center gap-2 rounded-lg bg-teal-700 px-4 py-2 text-sm font-bold text-white hover:bg-teal-800 cursor-pointer"
                  >
                    <ShieldCheck className="h-4 w-4" />
                    <span>Registrar Docente</span>
                  </button>

                  {lastRegistered && (
                    <div className="rounded-xl border border-teal-300 bg-white p-3 text-xs space-y-1.5">
                      <div className="font-bold text-emerald-800">
                        Docente registrado correctamente: {lastRegistered.fullName}
                      </div>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                        <span>
                          <strong>Usuario:</strong>{' '}
                          <code className="font-mono-tabular font-bold">
                            {lastRegistered.username}
                          </code>
                        </span>
                        <span className="text-red-800">
                          <strong>Contraseña:</strong>{' '}
                          <code className="font-mono-tabular font-bold">
                            {lastRegistered.password}
                          </code>
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          onCopyText(
                            `Acceso KipuIA CNPIE 2027\nDocente: ${lastRegistered.fullName}\nUsuario: ${lastRegistered.username}\nContraseña: ${lastRegistered.password}`,
                            'Credenciales del docente copiadas.'
                          )
                        }
                        className="inline-flex min-h-[34px] items-center gap-1.5 rounded-md border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-800 hover:bg-slate-50 cursor-pointer"
                      >
                        <Copy className="h-3.5 w-3.5" />
                        <span>Copiar Usuario y Contraseña</span>
                      </button>
                    </div>
                  )}
                </form>

                {/* Lista de docentes registrados */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-extrabold text-slate-900">
                      <Users className="h-4 w-4 text-blue-700" />
                      <span>Docentes Registrados ({teachers.length})</span>
                    </div>
                  </div>

                  <div className="max-h-52 overflow-y-auto rounded-xl border border-slate-200 divide-y divide-slate-100">
                    {teachers.length === 0 ? (
                      <div className="p-4 text-xs sm:text-sm text-slate-500 text-center">
                        Aún no hay docentes registrados. Usa el formulario superior para crear su
                        usuario y contraseña.
                      </div>
                    ) : (
                      teachers.map((t) => {
                        const isRevealed = Boolean(revealedIds[t.id]);
                        return (
                          <div
                            key={t.id}
                            className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-3.5 py-2.5 text-xs bg-white"
                          >
                            <div className="min-w-0 space-y-0.5">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <span className="font-bold text-slate-900 truncate">
                                  {t.fullName}
                                </span>
                                <span
                                  className={`font-bold ${
                                    t.active ? 'text-emerald-700' : 'text-red-700'
                                  }`}
                                >
                                  · {t.active ? 'Activo' : 'Suspendido'}
                                </span>
                              </div>
                              <div className="text-slate-600 font-mono-tabular">
                                Usuario: <strong className="text-slate-900">{t.username}</strong> ·
                                Clave:{' '}
                                <strong className="text-red-800">
                                  {isRevealed ? t.password : '••••••••'}
                                </strong>
                              </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                              <button
                                type="button"
                                onClick={() =>
                                  setRevealedIds((prev) => ({...prev, [t.id]: !prev[t.id]}))
                                }
                                className="rounded-md border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                              >
                                {isRevealed ? 'Ocultar' : 'Ver clave'}
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  onCopyText(
                                    `Docente: ${t.fullName}\nUsuario: ${t.username}\nContraseña: ${t.password}`,
                                    'Usuario y contraseña copiados.'
                                  )
                                }
                                className="rounded-md border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                              >
                                Copiar
                              </button>
                              <button
                                type="button"
                                onClick={() => handleToggleTeacherActive(t.id)}
                                className="rounded-md border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                              >
                                {t.active ? 'Suspender' : 'Activar'}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteTeacher(t.id)}
                                aria-label={`Eliminar a ${t.fullName}`}
                                className="rounded-md border border-red-200 p-1.5 text-red-700 hover:bg-red-50 cursor-pointer"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Gestión del Periodo Libre de 2 Días */}
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 space-y-2.5">
                  <div className="flex items-center gap-1.5 text-xs font-extrabold text-slate-900">
                    <Clock className="h-4 w-4 text-blue-700" />
                    <span>Control de Ingreso Libre por 2 Días (48 horas)</span>
                  </div>
                  <p className="text-xs text-slate-700">
                    Estado en este dispositivo: <strong>{trial.remainingLabel}</strong>. Al vencer
                    las 48 horas, la aplicación exige usuario y contraseña.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={handleResetTrial2Days}
                      className="min-h-[36px] rounded-lg border border-slate-300 bg-white px-3 py-1 text-xs font-bold text-slate-800 hover:bg-slate-100 cursor-pointer"
                    >
                      Reiniciar 2 días libres
                    </button>
                    <button
                      type="button"
                      onClick={handleExpireTrialNow}
                      className="min-h-[36px] rounded-lg border border-amber-300 bg-amber-50 px-3 py-1 text-xs font-bold text-amber-950 hover:bg-amber-100 cursor-pointer"
                    >
                      Finalizar prueba ahora (exigir login)
                    </button>
                  </div>
                </div>

                {/* Cambio de Clave Maestra */}
                <div className="border-t border-slate-200 pt-3 space-y-2">
                  <label className="block text-xs font-bold text-slate-700" htmlFor="new_mk">
                    Cambiar Contraseña del Administrador (Actual: {auth.masterKey})
                  </label>
                  <div className="flex gap-2">
                    <input
                      id="new_mk"
                      type="text"
                      value={newMasterKey}
                      onChange={(e) => setNewMasterKey(e.target.value)}
                      placeholder="Nueva clave de administrador..."
                      className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-base sm:text-sm"
                    />
                    <button
                      type="button"
                      onClick={handleChangeMaster}
                      className="min-h-[40px] rounded-lg border border-slate-300 px-3.5 py-2 text-xs font-bold text-slate-800 hover:bg-slate-50 cursor-pointer"
                    >
                      Guardar
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
