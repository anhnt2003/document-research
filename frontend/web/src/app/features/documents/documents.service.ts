import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, firstValueFrom } from 'rxjs';

import { API_CONFIG } from '../../core/api/api.config';
import {
  CreateTagInput,
  DocumentDto,
  DocumentItem,
  IngestionStatusEvent,
  Page,
  Tag,
  UpdateTagInput,
} from '../../core/models';

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

  async createTag(input: CreateTagInput): Promise<Tag> {
    return firstValueFrom(
      this.http.post<Tag>(`${this.config.baseUrl}/tags`, input)
    );
  }

  async updateTag(id: string, input: UpdateTagInput): Promise<Tag> {
    return firstValueFrom(
      this.http.put<Tag>(`${this.config.baseUrl}/tags/${id}`, input)
    );
  }

  async deleteTag(id: string): Promise<void> {
    await firstValueFrom(
      this.http.delete<void>(`${this.config.baseUrl}/tags/${id}`)
    );
  }

  async documentTags(documentId: string): Promise<Tag[]> {
    return firstValueFrom(
      this.http.get<Tag[]>(`${this.config.baseUrl}/documents/${documentId}/tags`)
    );
  }

  async attachTags(documentId: string, tagIds: string[]): Promise<void> {
    await firstValueFrom(
      this.http.post<void>(
        `${this.config.baseUrl}/documents/${documentId}/tags`,
        { tagIds }
      )
    );
  }

  async detachTag(documentId: string, tagId: string): Promise<void> {
    await firstValueFrom(
      this.http.delete<void>(
        `${this.config.baseUrl}/documents/${documentId}/tags/${tagId}`
      )
    );
  }

  async create(input: { file: File; title?: string }): Promise<DocumentDto> {
    const form = new FormData();
    form.append('file', input.file, input.file.name);
    if (input.title) {
      form.append('title', input.title);
    }
    return firstValueFrom(
      this.http.post<DocumentDto>(`${this.config.baseUrl}/documents`, form)
    );
  }

  streamIngestionStatus(documentId: string): Observable<IngestionStatusEvent> {
    return new Observable<IngestionStatusEvent>((subscriber) => {
      const url = `${this.config.baseUrl}/documents/${documentId}/ingestion/stream`;
      const source = new EventSource(url, { withCredentials: true });
      source.addEventListener('status', (e) => {
        try {
          subscriber.next(JSON.parse((e as MessageEvent).data) as IngestionStatusEvent);
        } catch (err) {
          subscriber.error(err);
        }
      });
      source.onerror = () => {
        source.close();
        subscriber.complete();
      };
      return () => source.close();
    });
  }
}
