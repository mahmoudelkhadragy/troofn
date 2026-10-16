import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { ContactInfo } from '../../models/client.model';

interface ContactRow {
  icon: string;
  label: string;
  value: string;
  /** null when the client has no such detail: the row then shows a dash and is not a link. */
  href: string | null;
  external: boolean;
}

const MISSING = '—';

/** "بيانات العميل": phone, email and website of the client. */
@Component({
  selector: 'tf-contact-card',
  templateUrl: './contact-card.component.html',
  host: { class: 'block h-[241px] rounded-xl border border-white/7 bg-black-light p-[18px]' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ContactCardComponent {
  readonly contact = input.required<ContactInfo>();

  protected readonly rows = computed<ContactRow[]>(() => {
    const { phone, email, website } = this.contact();
    return [
      {
        icon: 'call',
        label: 'رقم الجوال',
        value: phone ?? MISSING,
        href: phone ? `tel:${phone.replace(/\s/g, '')}` : null,
        external: false,
      },
      {
        icon: 'mail',
        label: 'البريد الإلكتروني',
        value: email ?? MISSING,
        href: email ? `mailto:${email}` : null,
        external: false,
      },
      {
        icon: 'open_in_new',
        label: 'الموقع الإلكتروني',
        value: website ? website.replace(/^https?:\/\//, '').replace(/\/$/, '') : MISSING,
        href: website ? (/^https?:\/\//.test(website) ? website : `https://${website}`) : null,
        external: true,
      },
    ];
  });
}
