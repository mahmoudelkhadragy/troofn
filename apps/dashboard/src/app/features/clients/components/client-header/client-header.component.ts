import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { avatarLetter } from '../../client-avatar';
import type { ClientOverview } from '../../models/client.model';

/** The company name, status and the page actions (edit, add contract). */
@Component({
  selector: 'tf-client-header',
  templateUrl: './client-header.component.html',
  host: { class: 'block' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClientHeaderComponent {
  readonly client = input.required<ClientOverview>();
  protected readonly letter = computed(() => avatarLetter(this.client().name));
  protected readonly active = computed(() => this.client().status === 'ACTIVE');
}
