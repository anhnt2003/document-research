export type Iso = string;

export type UserStatus = 'active' | 'locked' | 'invited';
export type DocumentType = 'pdf' | 'docx' | 'md' | 'link' | 'image';
export type Visibility = 'private' | 'team' | 'public';
export type SearchMode = 'keyword' | 'semantic' | 'hybrid';

export interface User {
  id: string;
  email: string;
  displayName: string;
  avatarColor: string; // deterministic accent for avatar
  initials: string;
  locale: 'vi' | 'en';
  status: UserStatus;
  roleIds: string[];
  title?: string;
  department?: string;
  createdAt: Iso;
  lastLoginAt?: Iso;
}

export interface Role {
  id: string;
  name: string;
  description: string;
  permissionKeys: string[];
  isSystem: boolean;
  memberCount: number;
}

export interface Permission {
  key: string;
  group: 'document' | 'user' | 'role' | 'search' | 'system';
  label: string;
  description: string;
}

export interface Tag {
  id: string;
  label: string;
  color: 'oxblood' | 'amber' | 'moss' | 'rust' | 'ink';
  parentId?: string;
  documentCount: number;
}

export interface DocumentItem {
  id: string;
  signature: string; // DOC-XXXX
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

export interface SearchHighlight {
  field: 'title' | 'summary' | 'body';
  snippet: string; // contains <mark> tags
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

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: User;
  roles: Role[];
}

export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}
