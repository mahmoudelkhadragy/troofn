import { ChangeDetectionStrategy, Component } from '@angular/core';

interface ClientTab {
  label: string;
  /** Red count bubble next to the label. */
  badge?: number;
}

/** The section tabs of a client. Only "نظرة عامة" has a page so far; the rest are placeholders. */
@Component({
  selector: 'tf-client-tabs',
  templateUrl: './client-tabs.component.html',
  host: { class: 'block' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClientTabsComponent {
  protected readonly tabs: ClientTab[] = [
    { label: 'نظرة عامة' },
    { label: 'العقود' },
    { label: 'خطط العمل' },
    { label: 'T-360' },
    { label: 'الخطة الاستراتيجية' },
    { label: 'SOW', badge: 3 },
    { label: 'المستندات' },
    { label: 'الحسابات' },
    { label: 'الدعم' },
    { label: 'النشاط' },
  ];
  protected readonly activeTab = 'نظرة عامة';
}
