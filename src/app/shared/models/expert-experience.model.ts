export interface ExpertExperience {
  id: string;
  expertProfileId: string;
  company: string;
  position: string;
  startDate: string;          // ISO date (YYYY-MM-DD)
  endDate: string | null;     // null = present
  description: string | null;
  createdAt: string;
  updatedAt: string;
}
