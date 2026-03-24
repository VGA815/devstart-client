export interface StartupCompetitor {
  id: string;
  startupId: string;
  name: string;
  website: string | null;
  description: string | null;
  strengthsVsUs: string | null;
  weaknessesVsUs: string | null;
  createdAt: string;
  updatedAt: string;
}
