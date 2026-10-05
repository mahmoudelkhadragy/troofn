import { DOCUMENT } from '@angular/common';
import { computed, inject, Injectable, signal } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';
import { type Language, SUPPORTED_LANGUAGES } from '@troofn/shared';

const STORAGE_KEY = 'tf.lang';
export const DEFAULT_LANGUAGE: Language = 'ar';

/** Owns the active language and keeps <html lang/dir> in sync (RTL for Arabic). */
@Injectable({ providedIn: 'root' })
export class LanguageService {
  private readonly document = inject(DOCUMENT);
  private readonly transloco = inject(TranslocoService);

  private readonly _lang = signal<Language>(DEFAULT_LANGUAGE);
  readonly lang = this._lang.asReadonly();
  readonly dir = computed(() => (this._lang() === 'ar' ? 'rtl' : 'ltr'));
  readonly isRtl = computed(() => this.dir() === 'rtl');

  /** Called once at startup (see app.config.ts). */
  init(): void {
    this.use(this.readStoredLanguage() ?? DEFAULT_LANGUAGE);
  }

  use(lang: Language): void {
    this._lang.set(lang);
    this.transloco.setActiveLang(lang);
    const html = this.document.documentElement;
    html.lang = lang;
    html.dir = this.dir();
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      /* storage unavailable — language just won't persist */
    }
  }

  toggle(): void {
    this.use(this._lang() === 'ar' ? 'en' : 'ar');
  }

  private readStoredLanguage(): Language | null {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return SUPPORTED_LANGUAGES.includes(stored as Language) ? (stored as Language) : null;
    } catch {
      return null;
    }
  }
}
