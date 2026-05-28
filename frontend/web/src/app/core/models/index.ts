export type Iso = string;

export type UserStatus = 'active' | 'locked' | 'invited';
export type DocumentType = 'pdf' | 'docx' | 'md' | 'link' | 'image';
export type Visibility = 'private' | 'team' | 'public';
export type SearchMode = 'keyword' | 'semantic' | 'hybrid';

export interface User {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  status: UserStatus;
  roleIds: string[];
  createdAt: Iso;
  lastLoginAt: Iso | null;
}

export interface Role {
  id: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  permissionKeys: string[];
}

export interface Permission {
  key: string;
  group: 'document' | 'user' | 'role' | 'search' | 'system';
  label: string;
  description: string;
}

export type TagColor = 'oxblood' | 'amber' | 'moss' | 'rust' | 'ink';

export const TAG_COLORS: TagColor[] = ['oxblood', 'amber', 'moss', 'rust', 'ink'];

export interface Tag {
  id: string;
  label: string;
  color: TagColor;
  parentId?: string | null;
  documentCount: number;
}

export interface CreateTagInput {
  label: string;
  color: TagColor;
  parentId?: string | null;
}

export type UpdateTagInput = CreateTagInput;

export interface DocumentItem {
  id: string;
  signature: string;
  title: string;
  summary: string;
  body?: string;
  type: DocumentType;
  authorIds: string[];
  tagIds: string[];
  sizeBytes: number;
  pageCount?: number;
  uploadedAt: Iso;
  updatedAt: Iso;
  ownerId: string;
  visibility: Visibility;
  citations?: { label: string; source: string }[];
  language?: 'vi' | 'en';
}

export type IngestionStatus =
  | 'None'
  | 'Pending'
  | 'Extracting'
  | 'Embedding'
  | 'Ready'
  | 'Failed';

export interface DocumentDto {
  id: string;
  title: string;
  body: string;
  createdAt: Iso;
  fileName: string | null;
  mimeType: string | null;
  sizeBytes: number | null;
  ingestionStatus: IngestionStatus;
}

export interface IngestionStatusEvent {
  status: IngestionStatus;
  error: string | null;
}

export interface SearchHighlight {
  field: 'title' | 'summary' | 'body';
  snippet: string;
}

export interface SearchResult {
  documentId: string;
  score: number;
  highlights: SearchHighlight[];
}

export interface SearchFilters {
  types?: DocumentType[];
  tagIds?: string[];
  ownerIds?: string[];
  from?: Iso;
  to?: Iso;
}

export interface SearchQuery {
  id: string;
  userId: string;
  q: string;
  mode: SearchMode;
  filters: SearchFilters;
  executedAt: Iso;
  resultCount: number;
  durationMs: number;
  pinned: boolean;
}

export interface SearchAnswer {
  text: string;
  citations: { index: number; documentId: string; quote: string }[];
}

export interface ActivityEvent {
  id: string;
  userId: string;
  action: string;
  target?: string;
  at: Iso;
}

export interface SignInResponse {
  token: string;
  expiresAt: Iso;
  user: User;
  roles: Role[];
}

export interface MeResponse {
  user: User;
  roles: Role[];
  permissionKeys: string[];
}

export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}
