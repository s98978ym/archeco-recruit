export interface DriveFolder {
  id: string;
  name: string;
  modifiedTime: string;
}

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size: string;
  thumbnailLink?: string;
  webContentLink?: string;
  modifiedTime: string;
}

export type FileCategory = 'minutes' | 'transcript' | 'photo' | 'other';

export interface CategorizedFiles {
  minutes: DriveFile[];
  transcripts: DriveFile[];
  photos: DriveFile[];
  others: DriveFile[];
}

export type TargetAudience =
  | 'job_seekers'
  | 'new_graduates'
  | 'engineers'
  | 'business'
  | 'general';

export const TARGET_LABELS: Record<TargetAudience, string> = {
  job_seekers: '転職希望者',
  new_graduates: '新卒学生',
  engineers: 'エンジニア',
  business: 'ビジネスパーソン',
  general: '一般読者',
};

export type ArticleTaste =
  | 'professional'
  | 'casual'
  | 'friendly'
  | 'storytelling'
  | 'interview';

export const TASTE_LABELS: Record<ArticleTaste, string> = {
  professional: 'プロフェッショナル',
  casual: 'カジュアル',
  friendly: 'フレンドリー',
  storytelling: 'ストーリーテリング',
  interview: 'インタビュー形式',
};

export interface GenerateRequest {
  folderId: string;
  folderName: string;
  target: TargetAudience;
  taste: ArticleTaste;
  wordCount: number;
  eyecatchInstructions?: string;
}

export interface GeneratedArticle {
  title: string;
  lead: string;
  content: string;
  eyecatchUrl?: string;
  insertImages: string[];
  category?: string;
}

export interface AnalysisResult {
  summary: string;
  keyTopics: string[];
  suggestedTitle: string;
  suggestedCategory: string;
  photoDescriptions: string[];
}
