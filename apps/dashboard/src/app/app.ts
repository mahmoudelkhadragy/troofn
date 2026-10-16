import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

/**
 * Root component. The `dir` wrapper re-provides Directionality so Material
 * components (sidenav, menus, form fields) flip live when the language changes.
 */
@Component({
  selector: 'tf-root',
  imports: [RouterOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: ` <router-outlet /> `,
})
export class App {}
