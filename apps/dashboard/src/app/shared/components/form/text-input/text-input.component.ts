import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  computed,
  forwardRef,
  inject,
  input,
  signal,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

@Component({
  selector: 'tf-text-input',
  templateUrl: './text-input.component.html',
  providers: [
    { provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => TextInputComponent), multi: true },
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  // `id="x"` on <tf-text-input> is passed to the inner <input>; drop it from the host so the
  // page has one element with that id and <label for> points at the input.
  host: { '[attr.id]': 'null' },
})
export class TextInputComponent implements ControlValueAccessor {
  private readonly changeDetector = inject(ChangeDetectorRef);
  readonly id = input.required<string>();
  readonly label = input.required<string>();
  readonly placeholder = input('');
  readonly type = input<'text' | 'email' | 'password'>('text');
  readonly error = input('');
  readonly required = input(false);
  readonly isRequiredIcon = input(false);
  readonly autocomplete = input('off');

  /** Password fields get a show/hide button; this is whether the text is currently visible. */
  protected readonly revealed = signal(false);
  protected readonly isPassword = computed(() => this.type() === 'password');
  protected readonly inputType = computed(() =>
    this.isPassword() && this.revealed() ? 'text' : this.type(),
  );

  value = '';
  disabled = false;
  private onChange: (value: string) => void = () => undefined;
  private onTouched: () => void = () => undefined;

  writeValue(value: string | null): void {
    this.value = value ?? '';
    this.changeDetector.markForCheck();
  }
  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }
  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }
  setDisabledState(disabled: boolean): void {
    this.disabled = disabled;
    this.changeDetector.markForCheck();
  }
  update(value: string): void {
    this.value = value;
    this.onChange(value);
  }
  updateFromEvent(event: Event): void {
    this.update((event.target as HTMLInputElement).value);
  }
  touched(): void {
    this.onTouched();
  }
  toggleReveal(): void {
    this.revealed.update((shown) => !shown);
  }
}
