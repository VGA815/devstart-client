import { StartupStage } from './startup.model';

export type RoadmapItemStatus = 'Planned' | 'InProgress' | 'Done';

export interface StartupRoadmapItem {
  id: string;
  startupId: string;
  startupStage: StartupStage;
  title: string;
  description: string | null;
  status: RoadmapItemStatus;
  createdAt: string;
  targetDate: string;
  targetAmount: number | null;
}
