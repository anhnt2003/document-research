import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

import { API_CONFIG } from '../../core/api/api.config';
import { SearchAnswer, SearchMode, SearchQuery, SearchResult } from '../../core/models';

export interface SearchResponse {
  results: SearchResult[];
  answer: SearchAnswer | null;
  durationMs: number;
}

@Injectable({ providedIn: 'root' })
export class SearchService {
  private http = inject(HttpClient);
  private config = inject(API_CONFIG);

  async search(q: string, mode: SearchMode): Promise<SearchResponse> {
    return firstValueFrom(
      this.http.post<SearchResponse>(`${this.config.baseUrl}/search`, { q, mode })
    );
  }

  async history(): Promise<SearchQuery[]> {
    return firstValueFrom(
      this.http.get<SearchQuery[]>(`${this.config.baseUrl}/search/history`)
    );
  }

  async deleteHistoryItem(id: string): Promise<void> {
    await firstValueFrom(
      this.http.delete(`${this.config.baseUrl}/search/history/${id}`)
    );
  }

  async togglePin(id: string): Promise<SearchQuery> {
    return firstValueFrom(
      this.http.post<SearchQuery>(`${this.config.baseUrl}/search/history/${id}/pin`, {})
    );
  }
}
