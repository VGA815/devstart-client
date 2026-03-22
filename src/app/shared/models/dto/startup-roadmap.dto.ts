import { StartupRoadmapItem, RoadmapItemStatus } from '../startup-roadmap.model';
import { StartupStage } from '../startup.model';

const STAGE_MAP: Record<number, StartupStage> = {
  0: 'Idea', 1: 'PreSeed', 2: 'Mvp', 3: 'Seed', 4: 'SeriesA',
};
const STATUS_MAP: Record<number, RoadmapItemStatus> = {
  0: 'Planned', 1: 'InProgress', 2: 'Done',
};

export const STAGE_NUM: Record<StartupStage, number> = {
  Idea: 0, PreSeed: 1, Mvp: 2, Seed: 3, SeriesA: 4,
};
export const ROADMAP_STATUS_NUM: Record<RoadmapItemStatus, number> = {
  Planned: 0, InProgress: 1, Done: 2,
};


export interface StartupRoadmapItemDto {
  id: string;
  startupId: string;
  startupStage: number;
  title: string;
  desription: string | null;
  status: number;
  createdAt: string;
  targetDate: string;
  targetAmount: number | null;
}

export function mapStartupRoadmapItemDto(dto: StartupRoadmapItemDto): StartupRoadmapItem {
  return {
    id: dto.id,
    startupId: dto.startupId,
    startupStage: STAGE_MAP[dto.startupStage] ?? 'Idea',
    title: dto.title,
    description: dto.desription,
    status: STATUS_MAP[dto.status] ?? 'Planned',
    createdAt: dto.createdAt,
    targetDate: dto.targetDate,
    targetAmount: dto.targetAmount ?? null,
  };
}
