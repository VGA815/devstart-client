/** Вид объекта ИС. Значения зеркалят `IntellectualPropertyKind` на бэке (append-only). */
export enum IpKind {
  Invention = 0,
  UtilityModel = 1,
  IndustrialDesign = 2,
  ComputerProgram = 3,
  Database = 4,
  Trademark = 5,
}

/**
 * Как запись стоит против локальной копии реестра. Три состояния, и все три показываются:
 * «не найдена» — про запись, «сверка недоступна» — про платформу, и склеивать их нельзя.
 */
export enum PatentResolutionState {
  RegistryUnavailable = 0,
  Found = 1,
  NotFoundInRegistry = 2,
}

/**
 * Сравнение ИНН правообладателя с ИНН, который заявил стартап. Именно сравнение: совпадение
 * означает, что реестр называет правообладателем то самое юрлицо, — но не что стартап им управляет.
 */
export enum PatentOwnership {
  NotComparable = 0,
  MatchesDeclaredInn = 1,
  DiffersFromDeclaredInn = 2,
}

/** Правовой статус охраны по реестру. */
export enum PatentProtectionStatus {
  Unknown = 0,
  Active = 1,
  Terminated = 2,
  EarlyTerminated = 3,
}

/** Ответ ЕГРЮЛ-справки: 0 — проверка недоступна (источник не подключён), 1 — найдено, 2 — нет такого. */
export enum LegalEntityState {
  Unavailable = 0,
  Found = 1,
  NotFound = 2,
}

export interface StartupPatent {
  id: string;
  kind: IpKind;
  /** Номер как ввёл основатель. */
  number: string;
  /** Только цифры — по ним искали в реестре. */
  numberNormalized: string;
  state: PatentResolutionState;
  ownership: PatentOwnership;
  title: string | null;
  holderName: string | null;
  holderInn: string | null;
  registeredOn: string | null;
  protectionStatus: PatentProtectionStatus | null;
  createdAt: string;
}

export interface LegalEntityInfo {
  state: LegalEntityState;
  inn: string | null;
  name: string | null;
  isActive: boolean | null;
  statusText: string | null;
  asOf: string | null;
}

export interface StartupPatents {
  startupId: string;
  /** Чекбокс «есть патенты» — самостоятельное заявление рядом с записями, а не производное от них. */
  hasPatentsDeclared: boolean;
  declaredInn: string | null;
  legalEntity: LegalEntityInfo | null;
  records: StartupPatent[];
}

export interface StartupPatentSuggestion {
  kind: IpKind;
  number: string;
  title: string | null;
  holderName: string | null;
  registeredOn: string | null;
  status: PatentProtectionStatus;
}

export interface StartupPatentSuggestions {
  declaredInn: string | null;
  suggestions: StartupPatentSuggestion[];
}
