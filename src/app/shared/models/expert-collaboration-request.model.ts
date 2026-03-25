export type CollaborationType = 'Advisor' | 'Consultant' | 'Mentor' | 'ProjectBased';

export type CollaborationRequestStatus = 'Pending' | 'Accepted' | 'Rejected' | 'Withdrawn';

export interface ExpertCollaborationRequest {
  id: string;
  expertProfileId: string;
  expertDisplayName: string;
  startupId: string;
  startupName: string;
  collaborationType: CollaborationType;
  message: string | null;
  proposedHoursPerWeek: number | null;
  proposedRate: number | null;
  status: CollaborationRequestStatus;
  createdAt: string;
  updatedAt: string;
}
