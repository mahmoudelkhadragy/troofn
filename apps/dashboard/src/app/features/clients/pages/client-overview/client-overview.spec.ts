import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';
import { ClientsApi } from '../../clients.api';
import { toClientOverview } from '../../clients.mapper';
import type { ClientOverview } from '../../models/client.model';
import { WEJNAD_DETAIL, WEJNAD_OVERVIEW, fakeClientsApi } from '../../testing/clients.fixtures';
import { ClientOverviewPage } from './client-overview';

describe('ClientOverviewPage', () => {
  let fixture: ComponentFixture<ClientOverviewPage>;
  const el = () => fixture.nativeElement as HTMLElement;
  const text = () => el().textContent ?? '';
  const status = () => el().querySelector('[role="status"], [role="alert"]')?.textContent?.trim();

  const open = (id: string | undefined, api: unknown = fakeClientsApi()) => {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: ClientsApi, useValue: api }],
    });
    fixture = TestBed.createComponent(ClientOverviewPage);
    if (id !== undefined) fixture.componentRef.setInput('id', id);
    fixture.detectChanges();
  };

  it('shows the client header, the figures, the four cards and the timeline', () => {
    open(WEJNAD_DETAIL.id);
    expect(el().querySelector('h1')?.textContent).toContain('شركة وجناد العقارية');
    expect(text()).toContain('نظرة عامة');
    expect(el().querySelectorAll('tf-stat-cards li')).toHaveLength(5);
    for (const title of ['التطبيق', 'معلومات العقد', 'فريق العمل', 'بيانات العميل']) {
      expect(text()).toContain(title);
    }
    expect(el().querySelectorAll('tf-project-timeline ol li')).toHaveLength(21); // 20 steps + the line
  });

  it("shows the client's real details from the API next to the sample figures", () => {
    open(WEJNAD_DETAIL.id);
    expect(text()).toContain('+966558500024'); // real
    expect(text()).toContain('wejnad.sa'); // real, without "https://"
    expect(text()).toContain('01/06/2025'); // real contract start
    expect(text()).toContain('فهد القحطاني'); // real team
    expect(text()).toContain('مدير التسويق');
    expect(text()).toContain('21,400'); // sample figure
  });

  it('says it is loading until the client arrives', () => {
    const pending = new Subject<ClientOverview | null>();
    open(WEJNAD_DETAIL.id, fakeClientsApi({ overview: () => pending }));
    expect(status()).toBe('جارٍ التحميل…');

    pending.next(WEJNAD_OVERVIEW);
    fixture.detectChanges();
    expect(status()).toBeUndefined();
    expect(el().querySelector('h1')).not.toBeNull();
  });

  it('shows another client when the route parameter changes', () => {
    const other = toClientOverview({
      ...WEJNAD_DETAIL,
      id: 'other',
      companyName: 'شركة الجبر للسيارات',
    });
    open(
      WEJNAD_DETAIL.id,
      fakeClientsApi({ overview: (id: string) => of(id === 'other' ? other : WEJNAD_OVERVIEW) }),
    );
    fixture.componentRef.setInput('id', 'other');
    fixture.detectChanges();
    expect(el().querySelector('h1')?.textContent).toContain('شركة الجبر للسيارات');
  });

  it('says so when there is no such client', () => {
    open('missing');
    expect(status()).toBe('لا يوجد عميل بهذا الرقم.');
    expect(el().querySelector('tf-client-header')).toBeNull();
  });

  it('says there are no clients when there is no id at all', () => {
    open(undefined);
    expect(status()).toBe('لا يوجد عملاء بعد.');
  });

  describe('when loading fails', () => {
    it('shows an error with a retry button, and the retry loads the client again', () => {
      const overview = vi
        .fn()
        .mockReturnValueOnce(throwError(() => new Error('offline')))
        .mockReturnValue(of(WEJNAD_OVERVIEW));
      open(WEJNAD_DETAIL.id, fakeClientsApi({ overview }));

      expect(status()).toContain('تعذّر تحميل بيانات العميل');
      el().querySelector<HTMLButtonElement>('[role="alert"] button')!.click();
      fixture.detectChanges();

      expect(overview).toHaveBeenCalledTimes(2);
      expect(status()).toBeUndefined();
      expect(el().querySelector('h1')?.textContent).toContain('شركة وجناد العقارية');
    });
  });
});
