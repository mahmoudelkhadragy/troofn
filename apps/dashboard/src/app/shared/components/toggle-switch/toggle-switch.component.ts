import { ChangeDetectionStrategy, Component, input, model } from '@angular/core';

/** An on/off switch. Two-way bindable: `<tf-toggle-switch label="..." [(checked)]="value" />`. */
@Component({
  selector: 'tf-toggle-switch',
  templateUrl: './toggle-switch.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ToggleSwitchComponent {
  readonly checked = model(false);
  /** What the switch controls, read out by screen readers. */
  readonly label = input.required<string>();

  protected toggle(): void {
    this.checked.update((on) => !on);
  }
}
