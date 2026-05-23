export interface ConsentItemDto {
  type: number;
  document_version: string;
  accepted: boolean;
}

export interface ConsentVersionsDto {
  personal_data_processing: string;
  privacy_policy: string;
  terms_of_service: string;
  cookies: string;
  public_offer: string;
}

export interface UserConsentDto {
  type: number;
  documentVersion: string;
  acceptedAt: string;
  revokedAt: string | null;
  isActive: boolean;
}

export interface ConsentDocumentDto {
  id: string;
  type: number;
  version: string;
  title: string;
  content: string;
  createdAt: string;
  isActive: boolean;
}
