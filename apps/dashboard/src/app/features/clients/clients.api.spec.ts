import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '@env/environment';
import { firstValueFrom } from 'rxjs';
import { ClientsApi } from './clients.api';
import { JABR_SUMMARY, NUKHBA_SUMMARY, WEJNAD_DETAIL } from './testing/clients.fixtures';

describe('ClientsApi', () => {
  let api: ClientsApi;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    api = TestBed.inject(ClientsApi);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  const envelope = <T>(data: T) => ({ success: true, data });

  describe('list', () => {
    it('asks for one full page of clients and maps them for the sidebar', async () => {
      const result = firstValueFrom(api.list());
      const req = http.expectOne((r) => r.url === `${environment.apiUrl}/clients`);
      expect(req.request.method).toBe('GET');
      expect(req.request.params.get('limit')).toBe('100');
      req.flush({
        ...envelope([JABR_SUMMARY, NUKHBA_SUMMARY]),
        meta: { page: 1, limit: 100, total: 2, totalPages: 1 },
      });

      expect(await result).toEqual([
        {
          id: JABR_SUMMARY.id,
          name: 'شركة الجبر للسيارات',
          sector: 'سيارات',
          status: 'ACTIVE',
          unreadCount: 0,
        },
        {
          id: NUKHBA_SUMMARY.id,
          name: 'شركة النخبة للاستشارات',
          sector: 'استشارات',
          status: 'INACTIVE',
          unreadCount: 0,
        },
      ]);
    });

    it('passes a failure on to the caller', async () => {
      const result = firstValueFrom(api.list());
      http
        .expectOne((r) => r.url === `${environment.apiUrl}/clients`)
        .flush({}, { status: 403, statusText: 'Forbidden' });
      await expect(result).rejects.toBeInstanceOf(HttpErrorResponse);
    });
  });

  describe('overview', () => {
    const url = `${environment.apiUrl}/clients/${WEJNAD_DETAIL.id}`;

    it('loads one client and maps it to the page model', async () => {
      const result = firstValueFrom(api.overview(WEJNAD_DETAIL.id));
      http.expectOne(url).flush(envelope(WEJNAD_DETAIL));

      const overview = await result;
      expect(overview).toMatchObject({ id: WEJNAD_DETAIL.id, name: 'شركة وجناد العقارية' });
      expect(overview!.team).toHaveLength(2);
      expect(overview!.contract.startDate).toBe('2025-06-01');
    });

    it.each([404, 400])(
      'is null when the API answers %i (no such client, or not an id)',
      async (status) => {
        const result = firstValueFrom(api.overview(WEJNAD_DETAIL.id));
        http.expectOne(url).flush({}, { status, statusText: 'x' });
        expect(await result).toBeNull();
      },
    );

    it.each([500, 0])(
      'is an error, not "no such client", when the API answers %i',
      async (status) => {
        const result = firstValueFrom(api.overview(WEJNAD_DETAIL.id));
        http.expectOne(url).flush({}, { status, statusText: 'x' });
        await expect(result).rejects.toBeInstanceOf(HttpErrorResponse);
      },
    );

    it('encodes the id, so it cannot change the path', async () => {
      const result = firstValueFrom(api.overview('../users'));
      http
        .expectOne(`${environment.apiUrl}/clients/..%2Fusers`)
        .flush({}, { status: 400, statusText: 'x' });
      expect(await result).toBeNull();
    });
  });
});
