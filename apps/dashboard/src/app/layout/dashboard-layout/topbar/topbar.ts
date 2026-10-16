import { ChangeDetectionStrategy, Component } from '@angular/core';

interface TopTab {
  label: string;
  active: boolean;
}

@Component({
  selector: 'tf-topbar',
  templateUrl: './topbar.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TopbarComponent {
  /** Only the central management section exists so far; the others are placeholders. */
  protected readonly tabs: TopTab[] = [
    { label: 'الادارة المركزية', active: true },
    { label: 'ادارة الموارد البشرية', active: false },
    { label: 'وارد الاعلانات', active: false },
  ];
  /** Sample count until notifications come from the API. */
  protected readonly notifications = 7;
}
