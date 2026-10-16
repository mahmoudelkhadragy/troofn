import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/** Vertical padding per size; `small` is the original look, `medium` is the 48px login button. */
const SIZE_CLASS = { small: 'py-2', medium: 'py-3', large: 'py-4' } as const;

@Component({
  selector: 'tf-button',
  templateUrl: './button.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ButtonComponent {
  readonly label = input.required<string>();
  readonly variant = input<'primary' | 'secondary' | 'outline'>('primary');
  readonly size = input<'small' | 'medium' | 'large'>('medium');
  readonly type = input<'button' | 'submit' | 'reset'>('button');
  readonly disabled = input(false);
  readonly loading = input(false);
  readonly icon = input<string | null>(null);
  readonly background = input<string | null>(null);
  readonly color = input<string | null>(null);

  protected readonly classes = computed(() =>
    [SIZE_CLASS[this.size()], this.background(), this.color()].filter(Boolean).join(' '),
  );
}
