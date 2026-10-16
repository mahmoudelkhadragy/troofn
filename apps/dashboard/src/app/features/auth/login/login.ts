import { finalize } from 'rxjs';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { loginErrorMessage } from '@core/auth/auth-errors';
import { AuthService } from '@core/auth/auth.service';
import { ButtonComponent } from '@shared/components/button/button.component';
import { TextInputComponent } from '@shared/components/form/text-input/text-input.component';

@Component({
  selector: 'tf-login-page',
  imports: [ReactiveFormsModule, ButtonComponent, TextInputComponent],
  templateUrl: './login.html',
  styleUrl: './login.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginPage {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly auth = inject(AuthService);
  protected readonly submitted = signal(false);
  protected readonly loading = signal(false);
  protected readonly authError = signal('');
  protected readonly loginForm = new FormGroup({
    username: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    password: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(6)],
    }),
  });

  constructor() {
    // Editing a field dismisses the previous login error, so it never sits next to a field error.
    this.loginForm.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => this.authError.set(''));
  }

  protected errorFor(name: 'username' | 'password'): string {
    const control = this.loginForm.controls[name];
    if (!(control.touched || this.submitted()) || !control.invalid) return '';
    if (control.hasError('required'))
      return name === 'username' ? 'User name is required' : 'Password is required';
    return 'Password must be at least 6 characters';
  }

  protected submit(): void {
    this.submitted.set(true);
    this.authError.set('');
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    // Who may use the dashboard is decided by the API (403 APP_NOT_ALLOWED), not here.
    this.auth
      .login(this.loginForm.getRawValue())
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: () => {
          const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
          const destination =
            returnUrl?.startsWith('/') && !returnUrl.startsWith('//') ? returnUrl : '/dashboard';
          void this.router.navigateByUrl(destination);
        },
        error: (error: unknown) => this.authError.set(loginErrorMessage(error)),
      });
  }
}
