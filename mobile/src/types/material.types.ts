import type {SubjectResponse} from './student.types';

export type MaterialType =
  | 'DOCUMENT'
  | 'VIDEO'
  | 'LINK'
  | 'NOTES'
  | 'PAST_PAPER'
  | 'SYLLABUS'
  | 'OTHER';

export interface MaterialResponse {
  id: string;
  subject?: SubjectResponse;
  title: string;
  fileName?: string;
  fileUrl: string;
  fileType?: string;
  materialType?: MaterialType;
  fileSizeBytes?: number;
  aiSummary?: string;
  aiCategorizedSubject?: string;
  uploadedAt: string;
}

export interface MaterialUploadRequest {
  subjectId?: string;
  title: string;
  fileName?: string;
  textPreview?: string;
  materialType?: MaterialType;
}

export interface StorageUploadUrlResponse {
  uploadUrl: string;
  publicUrl: string;
  path: string;
}
