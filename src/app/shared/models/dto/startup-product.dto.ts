import { StartupProduct } from '../startup-product.model';


export interface StartupProductDto {
  startupId: string;
  problem: string | null;
  solution: string;
  stack: string[] | null;
  valueProposition: string | null;
  differentiators: string | null;
}

export interface UpdateStartupProductRequestDto {
  startup_id: string;
  problem?: string;
  solution: string;
  stack: string[];
  value_proposition?: string;
  differentiators?: string;
}

export function mapStartupProductDto(dto: StartupProductDto): StartupProduct {
  return {
    startupId: dto.startupId,
    problem: dto.problem,
    solution: dto.solution,
    stack: dto.stack ?? [],
    valueProposition: dto.valueProposition,
    differentiators: dto.differentiators,
  };
}
