import { TestBed } from '@angular/core/testing';
import { provideRouter, Router, type UrlTree } from '@angular/router';
import { firstValueFrom, type Observable, of, throwError } from 'rxjs';
import { avatarLetter } from './client-avatar';
import { ClientsApi } from './clients.api';
import { firstClientGuard } from './first-client.guard';
import { CLIENT_SUMMARIES, fakeClientsApi } from './testing/clients.fixtures';

describe('avatarLetter', () => {
  it('skips "شركة" (company) and the article "ال"', () => {
    expect(avatarLetter('شركة وجناد العقارية')).toBe('و');
    expect(avatarLetter('شركة الجبر للسيارات')).toBe('ج');
    expect(avatarLetter('شركة النخبة للاستشارات')).toBe('ن');
  });

  it('uses the first letter when there is no such prefix', () => {
    expect(avatarLetter('Troofn Admin')).toBe('T');
    expect(avatarLetter('فهد')).toBe('ف');
  });

  it('keeps a short word that merely starts with "ال"', () => {
    expect(avatarLetter('ال')).toBe('ا');
  });

  it('is empty for an empty name', () => {
    expect(avatarLetter('')).toBe('');
  });
});

describe('firstClientGuard', () => {
  const run = () =>
    TestBed.runInInjectionContext(() => firstClientGuard({} as never, {} as never)) as Observable<
      boolean | UrlTree
    >;

  const setup = (api: unknown) =>
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: ClientsApi, useValue: api }],
    });

  it('sends /dashboard to the first client of the list', async () => {
    setup(fakeClientsApi());
    const result = await firstValueFrom(run());
    expect(TestBed.inject(Router).serializeUrl(result as UrlTree)).toBe(
      `/dashboard/clients/${CLIENT_SUMMARIES[0].id}`,
    );
  });

  it('lets the empty page show when there are no clients', async () => {
    setup(fakeClientsApi({ list: () => of([]) }));
    expect(await firstValueFrom(run())).toBe(true);
  });

  it('lets the page show its error when the list cannot be loaded', async () => {
    setup(fakeClientsApi({ list: () => throwError(() => new Error('offline')) }));
    expect(await firstValueFrom(run())).toBe(true);
  });
});
