import { Dir } from '@angular/cdk/bidi';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { LanguageService } from '@core/i18n/language.service';

/**
 * Root component. The `dir` wrapper re-provides Directionality so Material
 * components (sidenav, menus, form fields) flip live when the language changes.
 */
@Component({
  selector: 'tf-root',
  imports: [RouterOutlet, Dir],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div [dir]="language.dir()" class="contents">
      <router-outlet />
    </div>
  `,
})
export class App {
  protected readonly language = inject(LanguageService);
}
