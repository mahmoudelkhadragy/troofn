import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { catchError, map, type Observable, of, startWith, switchMap } from 'rxjs';
import { ClientsApi } from '../../clients.api';
import { AppAccessCardComponent } from '../../components/app-access-card/app-access-card.component';
import { ClientHeaderComponent } from '../../components/client-header/client-header.component';
import { ClientTabsComponent } from '../../components/client-tabs/client-tabs.component';
import { ContactCardComponent } from '../../components/contact-card/contact-card.component';
import { ContractCardComponent } from '../../components/contract-card/contract-card.component';
import { ProjectTimelineComponent } from '../../components/project-timeline/project-timeline.component';
import { StatCardsComponent } from '../../components/stat-cards/stat-cards.component';
import { TeamCardComponent } from '../../components/team-card/team-card.component';
import type { ClientOverview } from '../../models/client.model';

type OverviewState =
  | { status: 'loading' }
  | { status: 'ready'; client: ClientOverview }
  | { status: 'not-found' }
  | { status: 'empty' }
  | { status: 'error' };

/** "نظرة عامة" for one client; the first page after sign-in. Route: /dashboard/clients/:id */
@Component({
  selector: 'tf-client-overview',
  imports: [
    AppAccessCardComponent,
    ClientHeaderComponent,
    ClientTabsComponent,
    ContactCardComponent,
    ContractCardComponent,
    ProjectTimelineComponent,
    StatCardsComponent,
    TeamCardComponent,
  ],
  templateUrl: './client-overview.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClientOverviewPage {
  private readonly api = inject(ClientsApi);

  /** Bound from the `:id` route parameter. Missing only when there are no clients at all. */
  readonly id = input<string>();

  /** Bumped by the retry button so the same id is loaded again. */
  private readonly attempt = signal(0);

  protected readonly state = toSignal(
    toObservable(computed(() => ({ id: this.id(), attempt: this.attempt() }))).pipe(
      switchMap(({ id }) => this.load(id)),
    ),
    { initialValue: { status: 'loading' } as OverviewState },
  );

  /** The loaded client, or null in every other state. */
  protected readonly client = computed(() => {
    const state = this.state();
    return state.status === 'ready' ? state.client : null;
  });

  protected retry(): void {
    this.attempt.update((n) => n + 1);
  }

  private load(id: string | undefined): Observable<OverviewState> {
    if (!id) return of({ status: 'empty' });
    return this.api.overview(id).pipe(
      map((client): OverviewState =>
        client ? { status: 'ready', client } : { status: 'not-found' },
      ),
      catchError(() => of<OverviewState>({ status: 'error' })),
      startWith<OverviewState>({ status: 'loading' }),
    );
  }
}
