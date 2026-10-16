import { TestBed } from '@angular/core/testing';
import type { ContactInfo } from '../../models/client.model';
import { ContactCardComponent } from './contact-card.component';

describe('ContactCardComponent', () => {
  const render = (contact: ContactInfo) => {
    const fixture = TestBed.createComponent(ContactCardComponent);
    fixture.componentRef.setInput('contact', contact);
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    return {
      links: [...el.querySelectorAll<HTMLAnchorElement>('a')],
      values: [...el.querySelectorAll('li')].map((li) =>
        li.textContent?.replace(/\s+/g, ' ').trim(),
      ),
    };
  };

  it('links the phone, the email and the website', () => {
    const { links } = render({
      phone: '+966 55 850 0024',
      email: 'info@wejnad.sa',
      website: 'https://wejnad.sa/',
    });
    expect(links.map((a) => a.getAttribute('href'))).toEqual([
      'tel:+966558500024',
      'mailto:info@wejnad.sa',
      'https://wejnad.sa/',
    ]);
    expect(links[2].getAttribute('target')).toBe('_blank');
    expect(links[0].getAttribute('target')).toBeNull();
  });

  it('shows the website without "https://" and the trailing slash', () => {
    const { values } = render({ phone: null, email: null, website: 'https://wejnad.sa/' });
    expect(values[2]).toContain('wejnad.sa');
    expect(values[2]).not.toContain('https');
  });

  it('adds https:// to a website stored without it', () => {
    const { links } = render({ phone: null, email: null, website: 'wejnad.sa' });
    expect(links[0].getAttribute('href')).toBe('https://wejnad.sa');
  });

  it('shows a dash, and no link, for a detail the client does not have', () => {
    const { links, values } = render({ phone: null, email: 'info@wejnad.sa', website: null });
    expect(values[0]).toContain('—');
    expect(values[2]).toContain('—');
    expect(links).toHaveLength(1);
    expect(links[0].getAttribute('href')).toBe('mailto:info@wejnad.sa');
  });
});
