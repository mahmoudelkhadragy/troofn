import { DatePipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import type { ContractInfo } from '../../models/client.model';

/** "معلومات العقد": code, dates and yearly value of the current contract. */
@Component({
  selector: 'tf-contract-card',
  imports: [DatePipe, DecimalPipe],
  templateUrl: './contract-card.component.html',
  host: { class: 'block h-[241px] rounded-xl border border-white/7 bg-black-light p-[18px]' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ContractCardComponent {
  readonly contract = input.required<ContractInfo>();
}
