/** Maps to DevStart.Domain.StartupCommunityStandards.CommunityDocumentType */
export type CommunityDocumentType =
  | 'CodeOfConduct' | 'Contributing' | 'Support' | 'SecurityPolicy' | 'Legal';

/** Maps to DevStart.Domain.StartupCommunityStandards.CommunityStandardsLevel */
export type CommunityStandardsLevel = 'Incomplete' | 'Developing' | 'Complete';

/**
 * Строка чек-листа. Бэк отдаёт только машинную форму: подписи, иконки и CTA рисует клиент —
 * см. `shared/utils/community-standards.utils.ts`.
 */
export interface CommunityStandardsCheck {
  key: string;
  isSatisfied: boolean;
  /** true — пункт закрывается публикацией документа, false — полем профиля стартапа. */
  isDocument: boolean;
  documentType: CommunityDocumentType | null;
  /** Заполнен, когда документ уже опубликован — ссылка ведёт прямо на него. */
  documentId: string | null;
}

export interface CommunityStandards {
  completedCount: number;
  totalCount: number;
  /** 0–100, округлено бэком до целого. */
  percent: number;
  level: CommunityStandardsLevel;
  checks: CommunityStandardsCheck[];
  evaluatedAt: string;
}

/** Метаданные документа без markdown-тела — тело отдаётся отдельным запросом. */
export interface CommunityDocumentSummary {
  id: string;
  type: CommunityDocumentType;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export interface CommunityDocument {
  id: string;
  startupId: string;
  type: CommunityDocumentType;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

/** Стартовый текст от платформы — аналог «Contributor Covenant» в GitHub. */
export interface CommunityDocumentTemplate {
  type: CommunityDocumentType;
  title: string;
  content: string;
}
