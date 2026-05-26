import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

import { API_CONFIG } from '../../core/api/api.config';
import { DocumentDto, DocumentItem, Page, Tag } from '../../core/models';

export interface DocumentQuery {
  q?: string;
  type?: string;
  tag?: string;
  sort?: 'updatedAt' | 'uploadedAt' | 'title';
  page?: number;
  pageSize?: number;
}

@Injectable({ providedIn: 'root' })
export class DocumentsService {
  private http = inject(HttpClient);
  private config = inject(API_CONFIG);

  async list(query: DocumentQuery = {}): Promise<Page<DocumentItem>> {
    let params = new HttpParams();
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== null && v !== '') {
        params = params.set(k, String(v));
      }
    }
    return firstValueFrom(
      this.http.get<Page<DocumentItem>>(`${this.config.baseUrl}/documents`, { params })
    );
  }

  async get(id: string): Promise<DocumentDto> {
    return firstValueFrom(
      this.http.get<DocumentDto>(`${this.config.baseUrl}/documents/${id}`)
    );
  }

  async tags(): Promise<Tag[]> {
    return firstValueFrom(this.http.get<Tag[]>(`${this.config.baseUrl}/tags`));
  }

  async create(payload: Partial<DocumentItem>): Promise<DocumentItem> {
    return firstValueFrom(
      this.http.post<DocumentItem>(`${this.config.baseUrl}/documents`, payload)
    );
  }
}
