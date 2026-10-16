import { HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { ApiService } from '@core/services/api.service';
import { MAX_PAGE_SIZE } from '@troofn/shared';
import { catchError, map, type Observable, of, throwError } from 'rxjs';
import { toClientOverview, toClientSummary } from './clients.mapper';
import type { ClientDetailResponse, ClientSummaryResponse } from './models/client-api.model';
import type { ClientOverview, ClientSummary } from './models/client.model';

/**
 * Where the clients screens get their data: GET /clients and GET /clients/:id, mapped to the
 * models in ./models. Which parts of the overview are real and which are still sample figures is
 * documented in clients.mapper.ts and data/sample-sections.ts.
 */
@Injectable({ providedIn: 'root' })
export class ClientsApi {
  private readonly api = inject(ApiService);

  /**
   * The clients the signed-in user may see (owner and admin: all). One page of up to
   * MAX_PAGE_SIZE: when lists outgrow that, add search and paging to the sidebar.
   */
  list(): Observable<ClientSummary[]> {
    return this.api
      .getPage<ClientSummaryResponse>('clients', { limit: MAX_PAGE_SIZE })
      .pipe(map((page) => page.items.map(toClientSummary)));
  }

  /**
   * The overview of one client. null when there is no such client: the API answers 404 for a
   * missing (or out of scope) id and 400 for something that is not even a UUID. Other failures
   * (network, 5xx) are errors for the caller to show.
   */
  overview(id: string): Observable<ClientOverview | null> {
    return this.api.get<ClientDetailResponse>(`clients/${encodeURIComponent(id)}`).pipe(
      map(toClientOverview),
      catchError((error: unknown) =>
        error instanceof HttpErrorResponse && (error.status === 404 || error.status === 400)
          ? of(null)
          : throwError(() => error),
      ),
    );
  }
}
