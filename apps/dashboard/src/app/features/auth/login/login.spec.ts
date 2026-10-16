import { HttpErrorResponse } from '@angular/common/http';
import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { AuthService } from '@core/auth/auth.service';
import { NEVER, of, Subject, throwError } from 'rxjs';
import { LoginPage } from './login';

describe('LoginPage', () => {
  let fixture: ComponentFixture<LoginPage>;
  let el: HTMLElement;
  let login: ReturnType<typeof vi.fn>;
  let navigateByUrl: ReturnType<typeof vi.spyOn>;

  const setup = (returnUrl: string | null = null) => {
    login = vi.fn();
    TestBed.configureTestingModule({
      imports: [LoginPage],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: { login } },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              queryParamMap: convertToParamMap(returnUrl === null ? {} : { returnUrl }),
            },
          },
        },
      ],
    });
    navigateByUrl = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    fixture = TestBed.createComponent(LoginPage);
    fixture.detectChanges();
    el = fixture.nativeElement;
  };

  const type = (id: 'username' | 'password', value: string) => {
    const input = el.querySelector<HTMLInputElement>(`#${id}`)!;
    input.value = value;
    input.dispatchEvent(new Event('input'));
  };
  const submit = () => {
    el.querySelector('form')!.dispatchEvent(new Event('submit'));
    fixture.detectChanges();
  };
  const fillAndSubmit = () => {
    type('username', 'owner');
    type('password', 'Secret-123');
    submit();
  };
  const alertText = () => el.querySelector('[role="alert"]')?.textContent?.trim();
  const apiError = (status: number, details?: unknown) =>
    new HttpErrorResponse({
      status,
      error: { success: false, error: { statusCode: status, message: 'x', details } },
    });

  describe('validation', () => {
    beforeEach(() => setup());

    it('does not call the API for an empty form and says what is missing', () => {
      submit();
      expect(login).not.toHaveBeenCalled();
      expect(el.textContent).toContain('User name is required');
      expect(el.textContent).toContain('Password is required');
    });

    it('rejects a password shorter than 6 characters', () => {
      type('username', 'owner');
      type('password', '123');
      submit();
      expect(login).not.toHaveBeenCalled();
      expect(el.textContent).toContain('Password must be at least 6 characters');
    });
  });

  describe('signing in', () => {
    it('sends only what the user typed (AuthService adds the app) and goes to the dashboard', () => {
      setup();
      login.mockReturnValue(of({}));
      fillAndSubmit();
      expect(login).toHaveBeenCalledWith({ username: 'owner', password: 'Secret-123' });
      expect(navigateByUrl).toHaveBeenCalledWith('/dashboard');
    });

    it('goes back to the page the user was trying to open (returnUrl)', () => {
      setup('/dashboard/clients');
      login.mockReturnValue(of({}));
      fillAndSubmit();
      expect(navigateByUrl).toHaveBeenCalledWith('/dashboard/clients');
    });

    it.each(['//evil.example.com', 'https://evil.example.com', 'javascript:alert(1)', 'dashboard'])(
      'ignores a returnUrl that is not an in-app path (%s)',
      (returnUrl) => {
        setup(returnUrl);
        login.mockReturnValue(of({}));
        fillAndSubmit();
        expect(navigateByUrl).toHaveBeenCalledWith('/dashboard');
      },
    );

    it('disables the button while the request is running, then enables it again', () => {
      setup();
      const pending = new Subject<object>();
      login.mockReturnValue(pending);
      fillAndSubmit();

      const button = () => el.querySelector<HTMLButtonElement>('tf-button button')!;
      expect(button().disabled).toBe(true);
      expect(button().getAttribute('aria-busy')).toBe('true');

      pending.error(apiError(401));
      fixture.detectChanges();
      expect(button().disabled).toBe(false);
    });

    it('stays on the page while waiting', () => {
      setup();
      login.mockReturnValue(NEVER);
      fillAndSubmit();
      expect(navigateByUrl).not.toHaveBeenCalled();
    });
  });

  describe('when the API refuses', () => {
    beforeEach(() => setup());

    it('401: shows a wrong-credentials message and does not navigate', () => {
      login.mockReturnValue(throwError(() => apiError(401)));
      fillAndSubmit();
      expect(alertText()).toBe('Incorrect username or password.');
      expect(navigateByUrl).not.toHaveBeenCalled();
    });

    it('403 APP_NOT_ALLOWED: tells the user to use the mobile app', () => {
      login.mockReturnValue(throwError(() => apiError(403, { code: 'APP_NOT_ALLOWED' })));
      fillAndSubmit();
      expect(alertText()).toMatch(/owner and admin.*mobile app/i);
    });

    it('clears the login error as soon as the user edits a field', () => {
      login.mockReturnValue(throwError(() => apiError(401)));
      fillAndSubmit();
      expect(alertText()).toBeDefined();

      type('password', 'Another-123');
      fixture.detectChanges();
      expect(alertText()).toBeUndefined();
    });

    it('clears the previous error when the user tries again', () => {
      login.mockReturnValueOnce(throwError(() => apiError(401)));
      fillAndSubmit();
      expect(alertText()).toBeDefined();

      login.mockReturnValueOnce(NEVER);
      submit();
      expect(alertText()).toBeUndefined();
    });
  });
});
