import { signal } from '@angular/core';
import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { AuthService } from '@core/auth/auth.service';
import { ClientsApi } from '@features/clients/clients.api';
import { CLIENT_SUMMARIES, fakeClientsApi } from '@features/clients/testing/clients.fixtures';
import { of, throwError } from 'rxjs';
import { SidebarComponent } from './sidebar';

describe('SidebarComponent', () => {
  let fixture: ComponentFixture<SidebarComponent>;
  let logout: ReturnType<typeof vi.fn>;
  let navigate: ReturnType<typeof vi.spyOn>;
  const el = () => fixture.nativeElement as HTMLElement;
  const links = () => [...el().querySelectorAll<HTMLAnchorElement>('nav a')];

  const setup = (api: unknown = fakeClientsApi()) => {
    logout = vi.fn(() => of(undefined));
    TestBed.configureTestingModule({
      imports: [SidebarComponent],
      providers: [
        provideRouter([]),
        { provide: ClientsApi, useValue: api },
        {
          provide: AuthService,
          useValue: {
            logout,
            user: signal({ displayName: 'System Owner', roleName: { ar: 'مالك النظام', en: 'x' } }),
          },
        },
      ],
    });
    navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    fixture = TestBed.createComponent(SidebarComponent);
    fixture.detectChanges();
  };

  describe('with clients', () => {
    beforeEach(() => setup());

    it('lists the clients from the API, each linking to its own overview', () => {
      expect(links()).toHaveLength(3);
      expect(links()[0].getAttribute('href')).toBe(`/dashboard/clients/${CLIENT_SUMMARIES[0].id}`);
      expect(links()[0].textContent).toContain('شركة الجبر للسيارات');
      expect(links()[0].textContent).toContain('سيارات');
    });

    it('marks an inactive client with a red dot and an active one with a green dot', () => {
      const dot = (i: number) => links()[i].querySelector('i')!.className;
      expect(dot(0)).toContain('bg-live');
      expect(dot(1)).toContain('bg-brand'); // the second fixture is inactive
    });

    it('shows who is signed in, from the real session', () => {
      const footer = el().querySelector('footer')!;
      expect(footer.textContent).toContain('System Owner');
      expect(footer.textContent).toContain('مالك النظام');
    });

    it('logs out and goes to the login page', () => {
      el().querySelector<HTMLButtonElement>('footer button')!.click();
      expect(logout).toHaveBeenCalledOnce();
      expect(navigate).toHaveBeenCalledWith(['/login']);
    });
  });

  it('shows the unread count only for clients that have unread items', () => {
    setup(
      fakeClientsApi({
        list: () => of(CLIENT_SUMMARIES.map((c, i) => ({ ...c, unreadCount: i === 0 ? 3 : 0 }))),
      }),
    );
    expect(links()[0].querySelector('i[aria-label]')?.textContent?.trim()).toBe('3');
    expect(links()[1].querySelector('i[aria-label]')).toBeNull();
  });

  it('shows an empty list, not a crash, when the clients cannot be loaded', () => {
    setup(fakeClientsApi({ list: () => throwError(() => new Error('offline')) }));
    expect(links()).toHaveLength(0);
    expect(el().querySelector('footer')?.textContent).toContain('System Owner');
  });
});
