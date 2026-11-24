export type CategoryId = '2A' | '2B' | '2C' | '2D';
export type ModalityId = 'EB' | 'EIB_AMAZ' | 'MSE_SFT';
export type DensityId = 'optimo' | 'sintetico' | 'extenso';
export type ViewId = 'home' | 'step1' | 'step2' | 'step3';

export interface TeamPerson {
  nombre: string;
  dni: string;
  celular?: string;
  correo?: string;
  exp?: string;
  cargo?: string;
}

export interface IEData {
  nombre: string;
  codigo: string;
  nivel: string;
  estudiantes: number;
  dre: string;
  ugel: string;
  region: string;
  provincia: string;
  distrito: string;
  area: string;
  zona_especial: string;
  eib_tipo: string;
  lengua: string;
  especialidad: string;
  modulo: string;
}

export interface SeedData {
  titulo: string;
  tematicas: string[];
  competencias: string[];
  problema: string;
  solucion: string;
}

export interface ArbolProblemas {
  efectoFinal: string;
  efectosDirectos: [string, string, string];
  problemaCentral: string;
  causasDirectas: [string, string, string];
  causasIndirectas: [string, string, string];
}

export interface ArbolObjetivos {
  finPrincipal: string;
  finesDirectos: [string, string, string];
  objetivoGeneral: string;
  objetivosEspecificos: [string, string, string];
  mediosAccion: [string, string, string];
}

export interface CuadroARow {
  fase: string;
  actividad: string;
  evidencia: string;
  responsable: string;
  plazo: string;
}

export interface CuadroBRow {
  rubro: 'Bienes' | 'Servicios';
  desc: string;
  unidad: string;
  cant: number;
  unit: number;
  just: string;
}

export interface ProjectModel {
  id: string;
  updatedAt: string;
  category: CategoryId;
  modalidad: ModalityId;
  densidad: DensityId;
  ie: IEData;
  equipo: {
    director: TeamPerson;
    coordinador: TeamPerson;
    integrantes: TeamPerson[];
  };
  seed: SeedData;
  beneficiarios?: {
    directos: string;
    indirectos: string;
  };
  fields: Record<string, string>;
  arbolProblemas: ArbolProblemas | null;
  arbolObjetivos?: ArbolObjetivos | null;
  cuadroA: CuadroARow[];
  cuadroB: CuadroBRow[];
  instruments: Record<string, string>;
  instrumentsChecked: Record<string, boolean>;
  videoUrl: string;
}

export interface SchemaField {
  key: string;
  code: string;
  label: string;
  maxChars: number;
  evidence: string | null;
}

export interface SchemaSection {
  id: string;
  tab: string;
  hasTables?: boolean;
  hasLegal?: boolean;
  hasInstruments?: boolean;
  fields: SchemaField[];
}

export interface FichaSchema {
  code: string;
  linea: string;
  categoria: string;
  montoBase: number;
  bienesPct: number;
  serviciosPct: number;
  sections: SchemaSection[];
}

export interface PedagogicalLogic {
  focus: string;
  sequence: string;
  rubricCriteria: string;
  suggestions: string[];
}

export interface CategoryExplanation {
  shortName: string;
  fullTitle: string;
  linea: string;
  trayectoria: string;
  dirigidoA: string;
  financiamiento: string;
  explicacion: string;
  requisitosClave: string[];
}

export interface RequiredInstrument {
  id: string;
  badge: string;
  badgeType: 'obligatorio' | 'modalidad' | 'audiovisual';
  title: string;
  desc: string;
  format: string;
}

export interface FinancialRules {
  maxMonto: number;
  bienesPct: number;
  serviciosPct: number;
  maxBienes: number;
  maxServicios: number;
}

export interface BonusInfo {
  pct: number;
  pctReason: string;
  points: number;
  pointsReason: string;
}

export interface RubroStatusInfo {
  state: 'missing' | 'partial' | 'over' | 'complete';
  label: string;
  words: number;
  metaPalabras: number;
  maxWordsBases: number;
}

export interface StepProgressData {
  s1Done: number;
  s1Total: number;
  s1Pct: number;
  s2Done: number;
  s2Total: number;
  s2Pct: number;
  missingNarrativeCount: number;
  s3Score: number;
}

export type AuthRole = 'none' | 'admin' | 'teacher';

export interface GeneratedCredential {
  user: string;
  key: string;
  createdAt: string;
}

export interface TeacherAccount {
  id: string;
  fullName: string;
  username: string;
  password: string;
  active: boolean;
  createdAt: string;
}

export interface AuthState {
  activeUser: string | null;
  activeKey: string | null;
  activeRole?: AuthRole;
  activeDisplayName?: string | null;
  masterKey: string;
  trialStartedAt: number | null;
  registeredTeachers: TeacherAccount[];
  generatedCredentials: GeneratedCredential[];
}

export type FichaPartKind =
  | 'rubro'
  | 'arbol'
  | 'cuadroA'
  | 'cuadroB'
  | 'anexos'
  | 'instrumento';

export interface FichaPartItem {
  id: string;
  sectionId: string;
  sectionTitle: string;
  kind: FichaPartKind;
  code: string;
  title: string;
  fieldKey?: string;
  maxChars?: number;
  instrumentId?: string;
  colorIdx: number;
  pct: number;
  completed: boolean;
  progressText: string;
}

