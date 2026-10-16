import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import type { StatCard } from '../../models/client.model';

/** The row of five figure cards under the tabs. */
@Component({
  selector: 'tf-stat-cards',
  imports: [DecimalPipe],
  templateUrl: './stat-cards.component.html',
  host: { class: 'block' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StatCardsComponent {
  readonly stats = input.required<StatCard[]>();
}
