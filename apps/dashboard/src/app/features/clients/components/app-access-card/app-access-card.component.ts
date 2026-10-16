import { ChangeDetectionStrategy, Component, input, linkedSignal, output } from '@angular/core';
import { ToggleSwitchComponent } from '@shared/components/toggle-switch/toggle-switch.component';
import type { AppAccess } from '../../models/client.model';

/**
 * "التطبيق": whether the client may use the mobile app, and which SOW packages are switched on.
 * The switches keep their own state and report every change through `accessChange`; the page
 * will send that to the API once it exists.
 */
@Component({
  selector: 'tf-app-access-card',
  imports: [ToggleSwitchComponent],
  templateUrl: './app-access-card.component.html',
  host: { class: 'block h-[241px] rounded-xl border border-white/7 bg-black-light p-[18px]' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppAccessCardComponent {
  readonly access = input.required<AppAccess>();
  readonly accessChange = output<AppAccess>();

  /** Starts from the input and follows it whenever a different client is loaded. */
  protected readonly state = linkedSignal(() => this.access());

  protected setAppAccess(enabled: boolean): void {
    this.update({ ...this.state(), enabled });
  }

  protected setSow(index: number, enabled: boolean): void {
    const sow = this.state().sow.map((option, i) =>
      i === index ? { ...option, enabled } : option,
    );
    this.update({ ...this.state(), sow });
  }

  private update(next: AppAccess): void {
    this.state.set(next);
    this.accessChange.emit(next);
  }
}
