import { ExpertSpecialization } from '../models/expert-profile.model';
import { CollaborationRequestStatus, CollaborationType } from '../models/expert-collaboration-request.model';

const SPEC_LABELS: Record<ExpertSpecialization, string> = {
  Marketing:      'Маркетинг',
  Product:        'Продукт',
  Engineering:    'Разработка',
  Finance:        'Финансы',
  Legal:          'Юриспруденция',
  Operations:     'Операции',
  Sales:          'Продажи',
  HumanResources: 'HR',
  Design:         'Дизайн',
};

export function getSpecializationLabel(spec: ExpertSpecialization): string {
  return SPEC_LABELS[spec] ?? spec;
}

export const ALL_SPECIALIZATIONS: ExpertSpecialization[] = [
  'Marketing', 'Product', 'Engineering', 'Finance', 'Legal',
  'Operations', 'Sales', 'HumanResources', 'Design',
];

export function formatExperienceRange(startDate: string, endDate: string | null): string {
  const start = formatMonthYear(startDate);
  const end = endDate ? formatMonthYear(endDate) : 'наст. время';
  return `${start} — ${end}`;
}

function formatMonthYear(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('ru', { month: 'short', year: 'numeric' });
}

const COLLAB_TYPE_LABELS: Record<CollaborationType, string> = {
  Advisor:      'Эдвайзер',
  Consultant:   'Консультант',
  Mentor:       'Ментор',
  ProjectBased: 'Проектная работа',
};

export function getCollaborationTypeLabel(type: CollaborationType): string {
  return COLLAB_TYPE_LABELS[type] ?? type;
}

export const ALL_COLLABORATION_TYPES: CollaborationType[] = [
  'Advisor', 'Consultant', 'Mentor', 'ProjectBased',
];

const COLLAB_STATUS_LABELS: Record<CollaborationRequestStatus, string> = {
  Pending:   'Ожидает',
  Accepted:  'Принято',
  Rejected:  'Отклонено',
  Withdrawn: 'Отозвано',
};

export function getCollaborationStatusLabel(status: CollaborationRequestStatus): string {
  return COLLAB_STATUS_LABELS[status] ?? status;
}
