import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '@core/auth/auth.service';
import { avatarLetter } from '@features/clients/client-avatar';
import { ClientsApi } from '@features/clients/clients.api';
import { catchError, of } from 'rxjs';

@Component({
  selector: 'tf-sidebar',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './sidebar.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SidebarComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  /** Empty while loading and when the list cannot be loaded. */
  protected readonly clients = toSignal(
    inject(ClientsApi)
      .list()
      .pipe(catchError(() => of([]))),
    { initialValue: [] },
  );
  protected readonly user = this.auth.user;
  protected readonly userLetter = computed(() => avatarLetter(this.user()?.displayName ?? ''));
  protected readonly loggingOut = signal(false);
  protected readonly letterOf = avatarLetter;

  protected logout(): void {
    if (this.loggingOut()) return;
    this.loggingOut.set(true);
    this.auth.logout().subscribe({
      next: () => undefined,
      error: () => undefined,
      complete: () => this.loggingOut.set(false),
    });
    void this.router.navigate(['/login']);
  }
}
