import {
  ExpertCollaborationRequest, CollaborationType, CollaborationRequestStatus,
} from '../expert-collaboration-request.model';

const TYPE_MAP: Record<number, CollaborationType> = {
  0: 'Advisor',
  1: 'Consultant',
  2: 'Mentor',
  3: 'ProjectBased',
};

export const TYPE_NUM: Record<CollaborationType, number> = {
  Advisor:      0,
  Consultant:   1,
  Mentor:       2,
  ProjectBased: 3,
};

const STATUS_MAP: Record<number, CollaborationRequestStatus> = {
  0: 'Pending',
  1: 'Accepted',
  2: 'Rejected',
  3: 'Withdrawn',
};


export interface ExpertCollaborationRequestDto {
  id: string;
  expertProfileId: string;
  expertDisplayName: string;
  startupId: string;
  startupName: string;
  collaborationType: number;
  message: string | null;
  proposedHoursPerWeek: number | null;
  proposedRate: number | null;
  status: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateExpertCollaborationRequestDto {
  startup_id:               string;
  collaboration_type:       number;
  message?:                 string;
  proposed_hours_per_week?: number;
  proposed_rate?:           number;
}

export function mapExpertCollaborationRequestDto(dto: ExpertCollaborationRequestDto): ExpertCollaborationRequest {
  return {
    id:                   dto.id,
    expertProfileId:      dto.expertProfileId,
    expertDisplayName:    dto.expertDisplayName,
    startupId:            dto.startupId,
    startupName:          dto.startupName,
    collaborationType:    TYPE_MAP[dto.collaborationType] ?? 'Advisor',
    message:              dto.message,
    proposedHoursPerWeek: dto.proposedHoursPerWeek,
    proposedRate:         dto.proposedRate,
    status:               STATUS_MAP[dto.status] ?? 'Pending',
    createdAt:            dto.createdAt,
    updatedAt:            dto.updatedAt,
  };
}
