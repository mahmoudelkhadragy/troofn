import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import type { TeamMember } from '../../models/client.model';

/** "فريق العمل": the Troofn people working on this client, with a message button each. */
@Component({
  selector: 'tf-team-card',
  templateUrl: './team-card.component.html',
  host: { class: 'block h-[241px] rounded-xl border border-white/7 bg-black-light p-[18px]' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TeamCardComponent {
  readonly team = input.required<TeamMember[]>();
}
