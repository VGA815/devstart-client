export type CollaborationType = 'Advisor' | 'Consultant' | 'Mentor' | 'ProjectBased';

export type CollaborationRequestStatus =
  | 'Pending' | 'Accepted' | 'Rejected' | 'Withdrawn' | 'Expired';

/** Which side opened the request. The other side is the one that owes an answer. */
export type CollaborationRequestInitiator = 'Expert' | 'Startup';

/** Which side of the request the current screen is showing it from. */
export type CollabRequestViewerSide = 'expert' | 'startup';

export interface ExpertCollaborationRequest {
  id: string;
  expertProfileId: string;
  expertDisplayName: string;
  startupId: string;
  startupName: string;
  initiator: CollaborationRequestInitiator;
  collaborationType: CollaborationType;
  message: string | null;
  proposedHoursPerWeek: number | null;
  proposedRate: number | null;
  status: CollaborationRequestStatus;
  createdAt: string;
  updatedAt: string;
}
