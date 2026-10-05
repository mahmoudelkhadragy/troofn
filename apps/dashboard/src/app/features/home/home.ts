import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { LanguageService } from '@core/i18n/language.service';
import { TranslocoPipe } from '@jsverse/transloco';

/** Temporary landing page — confirms the app, theme and i18n/RTL wiring work. */
@Component({
  selector: 'tf-home-page',
  imports: [MatButton, TranslocoPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="flex min-h-screen flex-col items-center justify-center gap-4 p-4 text-center">
      <h1 class="m-0 text-3xl font-semibold text-primary">{{ 'app.title' | transloco }}</h1>
      <button mat-stroked-button type="button" (click)="language.toggle()">
        {{ 'app.switchLanguage' | transloco }}
      </button>
    </main>
  `,
})
export class HomePage {
  protected readonly language = inject(LanguageService);
}
