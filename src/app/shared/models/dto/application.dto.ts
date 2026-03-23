import { Application, ApplicationStatus } from '../application.model';


export interface ApplicationDto {
  id: string;
  startupId: string;
  startupName: string;
  applicantProfileId: string;
  applicantName: string;
  message: string | null;
  amount: number | null;
  status: 0 | 1 | 2; // 0=Pending, 1=Accepted, 2=Rejected
  createdAt: string;
}

const STATUS_MAP: Record<0 | 1 | 2, ApplicationStatus> = {
  0: 'Pending',
  1: 'Accepted',
  2: 'Rejected',
};

export function mapApplicationDto(dto: ApplicationDto): Application {
  return {
    id: dto.id,
    startupId: dto.startupId,
    startupName: dto.startupName,
    applicantProfileId: dto.applicantProfileId,
    applicantName: dto.applicantName,
    message: dto.message,
    amount: dto.amount,
    status: STATUS_MAP[dto.status],
    createdAt: dto.createdAt,
  };
}
