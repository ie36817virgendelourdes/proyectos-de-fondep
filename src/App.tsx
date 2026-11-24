import React, {useCallback, useEffect, useState} from 'react';
import {
  BookOpen,
  ClipboardCheck,
  Download,
  FileEdit,
  FileSpreadsheet,
  Home,
  KeyRound,
  Wifi,
  WifiOff,
} from 'lucide-react';
import {AccessGateScreen} from './components/AccessGateScreen';
import {AuthLicenseModal} from './components/AuthLicenseModal';
import {BasesModal} from './components/BasesModal';
import {DownloadSheetModal} from './components/DownloadSheetModal';
import {HomeProjectsView} from './components/HomeProjectsView';
import {PWAInstallButton} from './components/PWAInstallButton';
import {ProjectReadingMode} from './components/ProjectReadingMode';
import {Step1SeedView} from './components/Step1SeedView';
import {Step2RubrosView} from './components/Step2RubrosView';
import {Step3AuditView} from './components/Step3AuditView';
import {StepTracker} from './components/StepTracker';
import {WelcomeCoverView} from './components/WelcomeCoverView';
import {SCHEMA_FICHAS} from './data/cnpieSchemas';
import {useOnlineStatus} from './hooks/useOnlineStatus';
import type {AuthState, ProjectModel, ViewId} from './types/cnpie';
import {
  getTrialStatus,
  hasAppAccess,
  isAdminSession,
  isLicensedUser,
  loadAuthState,
  MAX_FREE_PROJECTS,
  safeStorage,
  saveAuthState,
  STORAGE_KEY,
} from './utils/cnpieAuth';
import {
  createDemoProjectData,
  createEmptyProjectModel,
  generateCompleteProjectData,
  generateProjectId,
  generateSelectedParts,
  getFichaPartsCatalog,
} from './utils/cnpieEngine';
import {
  exportProjectJSON,
  exportToNativePDF,
  exportToWebHTML,
  exportToWordDoc,
} from './utils/cnpieExporters';

function loadInitialProjects(): {projects: ProjectModel[]; activeProjectId: string | null} {
  try {
    const raw = safeStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      const list = Array.isArray(parsed.projects) ? (parsed.projects as ProjectModel[]) : [];
      return {
        projects: list,
        activeProjectId: parsed.activeProjectId || list[0]?.id || null,
      };
    }
  } catch {
    // ignore corrupted storage
  }
  return {projects: [], activeProjectId: null};
}

export default function App() {
  const initial = loadInitialProjects();
  const [projects, setProjects] = useState<ProjectModel[]>(initial.projects);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(initial.activeProjectId);
  const [activeView, setActiveView] = useState<ViewId>('home');
  const [showCover, setShowCover] = useState<boolean>(true);
  const [readingMode, setReadingMode] = useState<boolean>(false);
  const [activeSectionTab, setActiveSectionTab] = useState<string>('sec1');
  const [auth, setAuth] = useState<AuthState>(() => loadAuthState());
  const [lastSavedText, setLastSavedText] = useState<string>('Guardado local');

  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalTab, setAuthModalTab] = useState<'login' | 'admin'>('login');
  const [showLoginGate, setShowLoginGate] = useState(false);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [basesModalOpen, setBasesModalOpen] = useState(false);
  const [downloadModalOpen, setDownloadModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const isOnline = useOnlineStatus();

  const notify = useCallback((msg: string) => {
    setToastMessage(msg);
  }, []);

  useEffect(() => {
    if (!toastMessage) return;
    const t = setTimeout(() => setToastMessage(null), 3200);
    return () => clearTimeout(t);
  }, [toastMessage]);

  useEffect(() => {
    safeStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        projects,
        activeProjectId,
      })
    );
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    const ss = String(now.getSeconds()).padStart(2, '0');
    setLastSavedText(`Guardado ${hh}:${mm}:${ss}`);
  }, [projects, activeProjectId]);

  useEffect(() => {
    const interval = setInterval(() => setNowMs(Date.now()), 30_000);
    return () => clearInterval(interval);
  }, []);

  const handleUpdateAuth = (next: AuthState) => {
    setAuth(next);
    saveAuthState(next);
    setNowMs(Date.now());
  };

  const licensed = isLicensedUser(auth);
  const adminUser = isAdminSession(auth);
  const trialStatus = getTrialStatus(auth, nowMs);
  const appAccessAllowed = hasAppAccess(auth, nowMs);

  const activeProject = projects.find((p) => p.id === activeProjectId) || null;
  const canCreateMore =
    licensed || trialStatus.status === 'active' || projects.length < MAX_FREE_PROJECTS;

  const updateActiveProject = useCallback(
    (updater: (prev: ProjectModel) => ProjectModel) => {
      setProjects((prevList) =>
        prevList.map((p) =>
          p.id === activeProjectId ? {...updater(p), updatedAt: new Date().toISOString()} : p
        )
      );
    },
    [activeProjectId]
  );

  const switchView = (view: ViewId) => {
    if (view !== 'home' && !activeProject) {
      if (projects.length > 0) {
        setActiveProjectId(projects[0].id);
        setActiveSectionTab(SCHEMA_FICHAS[projects[0].category].sections[0].id);
        setActiveView(view);
      } else {
        handleCreateNew();
      }
      return;
    }
    setActiveView(view);
    window.scrollTo({top: 0, behavior: 'smooth'});
  };

  const handleCreateNew = () => {
    if (!canCreateMore) {
      setAuthModalOpen(true);
      notify('Límite de 3 proyectos gratuitos alcanzado. Ingresa Usuario y Clave.');
      return;
    }
    const proj = createEmptyProjectModel();
    setProjects((prev) => [proj, ...prev]);
    setActiveProjectId(proj.id);
    setActiveSectionTab(SCHEMA_FICHAS[proj.category].sections[0].id);
    setActiveView('step1');
    notify('Nuevo proyecto creado. Completa o autocompleta el Paso 1.');
  };

  const handleCreateDemo = () => {
    if (!canCreateMore) {
      setAuthModalOpen(true);
      notify('Límite de 3 proyectos gratuitos alcanzado. Ingresa Usuario y Clave.');
      return;
    }
    const demo = createDemoProjectData();
    setProjects((prev) => [demo, ...prev]);
    setActiveProjectId(demo.id);
    setActiveSectionTab(SCHEMA_FICHAS[demo.category].sections[0].id);
    setActiveView('step2');
    notify('Proyecto de ejemplo cargado con rubros, Árbol de Problemas e instrumentos.');
  };

  const handleOpenProject = (id: string) => {
    const found = projects.find((p) => p.id === id);
    if (!found) return;
    setActiveProjectId(id);
    setActiveSectionTab(SCHEMA_FICHAS[found.category].sections[0].id);
    setActiveView('step2');
    window.scrollTo({top: 0, behavior: 'smooth'});
  };

  const handleDuplicateProject = (id: string) => {
    if (!canCreateMore) {
      setAuthModalOpen(true);
      notify('Límite de 3 proyectos gratuitos alcanzado. Ingresa Usuario y Clave.');
      return;
    }
    const orig = projects.find((p) => p.id === id);
    if (!orig) return;
    const copy: ProjectModel = JSON.parse(JSON.stringify(orig));
    copy.id = generateProjectId();
    copy.seed.titulo = `${copy.seed.titulo || 'Proyecto'} (Copia)`;
    copy.updatedAt = new Date().toISOString();
    setProjects((prev) => [copy, ...prev]);
    setActiveProjectId(copy.id);
    notify('Proyecto duplicado correctamente.');
  };

  const handleDeleteProject = (id: string) => {
    setProjects((prev) => {
      const next = prev.filter((p) => p.id !== id);
      if (activeProjectId === id) {
        setActiveProjectId(next[0]?.id || null);
      }
      return next;
    });
    notify('Proyecto eliminado del almacenamiento local.');
  };

  const handleImportJSON = (file: File) => {
    if (!canCreateMore) {
      setAuthModalOpen(true);
      notify('Límite de 3 proyectos gratuitos alcanzado. Ingresa Usuario y Clave.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const imported = JSON.parse(String(e.target?.result || '')) as ProjectModel;
        if (!imported || !imported.category || !SCHEMA_FICHAS[imported.category]) {
          notify('El archivo JSON no corresponde a un proyecto CNPIE 2027 válido.');
          return;
        }
        imported.id = generateProjectId();
        imported.updatedAt = new Date().toISOString();
        setProjects((prev) => [imported, ...prev]);
        setActiveProjectId(imported.id);
        setActiveSectionTab(SCHEMA_FICHAS[imported.category].sections[0].id);
        notify('Proyecto importado correctamente.');
      } catch {
        notify('No se pudo leer el archivo JSON.');
      }
    };
    reader.readAsText(file);
  };

  const handleGenerateFullProject = () => {
    if (!activeProject) return;
    const generated = generateCompleteProjectData(activeProject);
    setProjects((prev) =>
      prev.map((p) =>
        p.id === activeProject.id ? {...generated, updatedAt: new Date().toISOString()} : p
      )
    );
    setActiveSectionTab(SCHEMA_FICHAS[generated.category].sections[0].id);
    setActiveView('step2');
    window.scrollTo({top: 0, behavior: 'smooth'});
    notify('Todos los rubros (-100 pal.), Árbol de Problemas, Tablas e Instrumentos generados.');
  };

  const handleGenerateSelectedParts = (partIds: string[]) => {
    if (!activeProject || partIds.length === 0) return;
    const generated = generateSelectedParts(activeProject, partIds);
    setProjects((prev) =>
      prev.map((p) =>
        p.id === activeProject.id ? {...generated, updatedAt: new Date().toISOString()} : p
      )
    );
    const catalog = getFichaPartsCatalog(generated);
    const firstMatched = catalog.find((item) => partIds.includes(item.id));
    if (firstMatched) {
      setActiveSectionTab(firstMatched.sectionId);
    }
    setActiveView('step2');
    window.scrollTo({top: 0, behavior: 'smooth'});
    notify(`Se redactaron ${partIds.length} parte(s) seleccionadas según la ficha y modalidad.`);
  };

  const copyText = (text: string, msg: string) => {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard
        .writeText(text)
        .then(() => notify(msg))
        .catch(() => fallbackCopy(text, msg));
    } else {
      fallbackCopy(text, msg);
    }
  };

  const fallbackCopy = (text: string, msg: string) => {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand('copy');
      notify(msg);
    } catch {
      notify('No se pudo copiar automáticamente.');
    }
    document.body.removeChild(ta);
  };

  const handleExportWord = () => {
    if (!activeProject) {
      notify('Abre o crea un proyecto primero.');
      return;
    }
    exportToWordDoc(activeProject);
    notify('Descargando expediente ordenado en Word (.doc)...');
  };

  const handleExportPDF = () => {
    if (!activeProject) {
      notify('Abre o crea un proyecto primero.');
      return;
    }
    const pages = exportToNativePDF(activeProject);
    notify(`Descargando PDF nativo (${pages} páginas)...`);
  };

  const handleExportWeb = () => {
    if (!activeProject) {
      notify('Abre o crea un proyecto primero.');
      return;
    }
    exportToWebHTML(activeProject);
    notify('Descargando página web autónoma (.html)...');
  };

  const handleExportJSON = () => {
    if (!activeProject) {
      notify('Abre o crea un proyecto primero.');
      return;
    }
    exportProjectJSON(activeProject);
    notify('Respaldo JSON descargado.');
  };

  const handleNavigateAlert = useCallback(
    (targetView: 'step1' | 'step2', sectionId: string, fieldKey?: string) => {
      if (!activeProject) return;
      if (targetView === 'step1') {
        setActiveView('step1');
        window.scrollTo({top: 0, behavior: 'smooth'});
        return;
      }
      setActiveSectionTab(sectionId);
      setActiveView('step2');
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
        if (el) {
          el.scrollIntoView({behavior: 'smooth', block: 'center'});
        } else {
          window.scrollTo({top: 0, behavior: 'smooth'});
        }
      }, 90);
    },
    [activeProject]
  );

  if (showCover) {
    return (
      <WelcomeCoverView
        projectCount={projects.length}
        auth={auth}
        onEnterApp={() => {
          setShowCover(false);
          if (!hasAppAccess(auth)) {
            setShowLoginGate(true);
          } else {
            setShowLoginGate(false);
            setActiveView('home');
          }
          window.scrollTo({top: 0, behavior: 'smooth'});
        }}
        onStartFreeTrialAndEnter={() => {
          const next = {...auth, trialStartedAt: auth.trialStartedAt ?? Date.now()};
          handleUpdateAuth(next);
          setShowCover(false);
          setShowLoginGate(false);
          setActiveView('home');
          window.scrollTo({top: 0, behavior: 'smooth'});
          notify('Ingreso libre por 2 días (48 horas) activado.');
        }}
        onOpenLoginGate={() => {
          setShowCover(false);
          setShowLoginGate(true);
          window.scrollTo({top: 0, behavior: 'smooth'});
        }}
        onQuickStartDemo={() => {
          if (auth.trialStartedAt === null && !licensed) {
            handleUpdateAuth({...auth, trialStartedAt: Date.now()});
          }
          setShowCover(false);
          setShowLoginGate(false);
          handleCreateDemo();
        }}
      />
    );
  }

  if (showLoginGate || !appAccessAllowed) {
    return (
      <AccessGateScreen
        auth={auth}
        onSuccessLogin={(nextAuth, role, displayName) => {
          handleUpdateAuth(nextAuth);
          setShowLoginGate(false);
          setShowCover(false);
          setActiveView('home');
          window.scrollTo({top: 0, behavior: 'smooth'});
          if (role === 'admin') {
            setAuthModalTab('admin');
            setAuthModalOpen(true);
            notify('Bienvenido Administrador. Registra docentes con su usuario y clave.');
          } else {
            notify(`Bienvenido(a), ${displayName}.`);
          }
        }}
        onStartFreeTrial={
          trialStatus.status === 'not_started'
            ? () => {
                handleUpdateAuth({...auth, trialStartedAt: Date.now()});
                setShowLoginGate(false);
                setShowCover(false);
                setActiveView('home');
                window.scrollTo({top: 0, behavior: 'smooth'});
                notify('Ingreso libre por 2 días (48 horas) activado.');
              }
            : undefined
        }
        onBackToCover={() => {
          setShowLoginGate(false);
          setShowCover(true);
          window.scrollTo({top: 0, behavior: 'smooth'});
        }}
      />
    );
  }

  if (readingMode && activeProject) {
    return (
      <ProjectReadingMode
        project={activeProject}
        onExit={() => {
          setReadingMode(false);
          window.scrollTo({top: 0, behavior: 'smooth'});
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-20 md:pb-12">
      {/* Top Bar Contract: 3 zonas limpias en una sola fila (≤ 56px) */}
      <header className="no-print sticky top-0 z-30 h-14 border-b border-slate-200 bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex h-full max-w-6xl items-center justify-between gap-4 sm:gap-8 px-4">
          {/* Zona 1: Wordmark de una sola línea */}
          <button
            type="button"
            onClick={() => switchView('home')}
            className="font-display text-base sm:text-lg font-extrabold tracking-tight text-blue-800 whitespace-nowrap shrink-0 cursor-pointer"
          >
            CNPIE 2027 · FONDEP
          </button>

          {/* Zona 2: Enlaces de navegación en una sola línea (desktop) */}
          <nav
            aria-label="Navegación principal"
            className="hidden md:flex items-center gap-6 text-base font-medium text-slate-700"
          >
            {(
              [
                {id: 'home', label: 'Inicio'},
                {id: 'step1', label: '1. Contexto'},
                {id: 'step2', label: '2. Misiones'},
                {id: 'step3', label: '3. Auditoría'},
              ] as const
            ).map((item) => {
              const active = activeView === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => switchView(item.id)}
                  className={`whitespace-nowrap shrink-0 py-1 transition-colors cursor-pointer ${
                    active
                      ? 'font-bold text-blue-800 underline decoration-2 underline-offset-4'
                      : 'hover:text-slate-900 hover:underline underline-offset-4'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* Zona 3: Acción primaria + botón instalar PWA */}
          <div className="flex items-center gap-2 shrink-0">
            <PWAInstallButton />
            <button
              type="button"
              onClick={() => setDownloadModalOpen(true)}
              className="inline-flex min-h-[42px] items-center gap-1.5 rounded-lg bg-blue-700 px-3.5 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-800 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Download className="h-4 w-4" aria-hidden="true" />
              <span>Descargar</span>
            </button>
          </div>
        </div>
      </header>

      {/* Contenido principal */}
      <main className="mx-auto max-w-6xl px-4 pt-5 space-y-5">
        {activeProject && activeView !== 'home' && (
          <StepTracker
            project={activeProject}
            activeView={activeView}
            onNavigate={switchView}
          />
        )}

        {activeView === 'home' && (
          <HomeProjectsView
            projects={projects}
            activeProjectId={activeProjectId}
            auth={auth}
            onCreateNew={handleCreateNew}
            onCreateDemo={handleCreateDemo}
            onOpenProject={handleOpenProject}
            onDuplicateProject={handleDuplicateProject}
            onDeleteProject={handleDeleteProject}
            onImportJSON={handleImportJSON}
            onOpenAuth={() => {
              setAuthModalTab('login');
              setAuthModalOpen(true);
            }}
            onOpenAdminTeachers={() => {
              setAuthModalTab('admin');
              setAuthModalOpen(true);
            }}
            onShowCover={() => {
              setShowCover(true);
              window.scrollTo({top: 0, behavior: 'smooth'});
            }}
            onReadProject={(id) => {
              setActiveProjectId(id);
              setReadingMode(true);
            }}
          />
        )}

        {activeView === 'step1' && activeProject && (
          <Step1SeedView
            project={activeProject}
            onUpdateProject={updateActiveProject}
            onGenerateFullProject={handleGenerateFullProject}
            onGenerateSelectedParts={handleGenerateSelectedParts}
            onBackHome={() => switchView('home')}
            onNextStep={() => {
              setActiveSectionTab(SCHEMA_FICHAS[activeProject.category].sections[0].id);
              switchView('step2');
            }}
            onNotify={notify}
          />
        )}

        {activeView === 'step2' && activeProject && (
          <Step2RubrosView
            project={activeProject}
            activeSectionTab={activeSectionTab}
            onChangeSectionTab={setActiveSectionTab}
            onUpdateProject={updateActiveProject}
            onGenerateFullProject={handleGenerateFullProject}
            onGenerateSelectedParts={handleGenerateSelectedParts}
            onCopyText={copyText}
            onNotify={notify}
            onBackStep1={() => switchView('step1')}
            onNextStep3={() => switchView('step3')}
            onEnterReadingMode={() => setReadingMode(true)}
          />
        )}

        {activeView === 'step3' && activeProject && (
          <Step3AuditView
            project={activeProject}
            onExportWord={handleExportWord}
            onExportPDF={handleExportPDF}
            onExportWeb={handleExportWeb}
            onExportJSON={handleExportJSON}
            onBackToRubros={() => {
              const secs = SCHEMA_FICHAS[activeProject.category].sections;
              setActiveSectionTab(secs[secs.length - 1].id);
              switchView('step2');
            }}
            onBackHome={() => switchView('home')}
            onNavigateAlert={handleNavigateAlert}
            onEnterReadingMode={() => setReadingMode(true)}
            onNotify={notify}
          />
        )}
      </main>

      <footer className="no-print mx-auto mt-6 flex max-w-6xl flex-wrap items-center justify-between gap-2 border-t border-slate-200 px-4 py-4 text-xs sm:text-sm text-slate-600">
        <div className="flex items-center gap-2">
          {isOnline ? (
            <Wifi className="h-4 w-4 text-emerald-700" aria-hidden="true" />
          ) : (
            <WifiOff className="h-4 w-4 text-amber-700" aria-hidden="true" />
          )}
          <span>{isOnline ? 'Modo Offline Listo' : 'Sin conexión · Local'}</span>
          <span aria-hidden="true">·</span>
          <span className="font-mono-tabular">{lastSavedText}</span>
        </div>

        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => {
              setAuthModalTab(adminUser ? 'admin' : 'login');
              setAuthModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 font-semibold text-slate-700 hover:text-red-800 cursor-pointer"
          >
            <KeyRound className="h-4 w-4" aria-hidden="true" />
            <span>
              {adminUser
                ? 'Admin: ADMIN'
                : licensed
                ? `Docente: ${auth.activeUser}`
                : trialStatus.status === 'active'
                ? `Libre: ${trialStatus.remainingLabel}`
                : 'Iniciar sesión'}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setBasesModalOpen(true)}
            className="inline-flex items-center gap-1.5 font-semibold text-slate-700 hover:text-red-800 cursor-pointer"
          >
            <BookOpen className="h-4 w-4" aria-hidden="true" />
            <span>Bases 2027</span>
          </button>
        </div>
      </footer>

      {/* Navegación móvil fija en zona natural del pulgar (≤ 60px, total sticky < 15%) */}
      <nav
        aria-label="Navegación móvil"
        className="no-print md:hidden fixed bottom-0 left-0 right-0 z-40 h-15 border-t border-slate-200 bg-white/95 backdrop-blur-md pb-safe"
      >
        <div className="grid h-full grid-cols-4 items-center">
          {(
            [
              {id: 'home', label: 'Inicio', Icon: Home},
              {id: 'step1', label: '1. Contexto', Icon: FileSpreadsheet},
              {id: 'step2', label: '2. Misiones', Icon: FileEdit},
              {id: 'step3', label: '3. Auditoría', Icon: ClipboardCheck},
            ] as const
          ).map(({id, label, Icon}) => {
            const active = activeView === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => switchView(id)}
                className={`flex h-full min-h-[44px] flex-col items-center justify-center gap-0.5 text-xs font-bold cursor-pointer ${
                  active ? 'text-blue-800' : 'text-slate-700'
                }`}
              >
                <Icon className="h-5 w-5" aria-hidden="true" />
                <span>{label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Modales */}
      <AuthLicenseModal
        open={authModalOpen}
        initialTab={authModalTab}
        auth={auth}
        projectCount={projects.length}
        onClose={() => setAuthModalOpen(false)}
        onUpdateAuth={handleUpdateAuth}
        onCopyText={copyText}
        onNotify={notify}
      />

      <BasesModal open={basesModalOpen} onClose={() => setBasesModalOpen(false)} />

      <DownloadSheetModal
        open={downloadModalOpen}
        project={activeProject}
        onClose={() => setDownloadModalOpen(false)}
        onExportWord={handleExportWord}
        onExportPDF={handleExportPDF}
        onExportWeb={handleExportWeb}
        onExportJSON={handleExportJSON}
      />

      {/* Toast */}
      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className="no-print fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-50 max-w-[92vw] rounded-full bg-slate-900 px-5 py-3 text-center text-sm font-semibold text-white shadow-lg"
        >
          {toastMessage}
        </div>
      )}
    </div>
  );
}
