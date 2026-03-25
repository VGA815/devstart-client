export type ApplicationStatus = 'Pending' | 'Accepted' | 'Rejected';

export interface Application {
  id: string;
  startupId: string;
  startupName: string;
  applicantProfileId: string;
  applicantName: string;
  message: string | null;
  amount: number | null;
  status: ApplicationStatus;
  createdAt: string;
}
