import { TestBed } from '@angular/core/testing';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { LanguageService } from './language.service';

describe('LanguageService', () => {
  let service: LanguageService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [
        TranslocoTestingModule.forRoot({
          langs: { ar: {}, en: {} },
          translocoConfig: { availableLangs: ['ar', 'en'], defaultLang: 'ar' },
        }),
      ],
    });
    service = TestBed.inject(LanguageService);
  });

  it('sets RTL on <html> for Arabic', () => {
    service.use('ar');
    expect(document.documentElement.dir).toBe('rtl');
    expect(document.documentElement.lang).toBe('ar');
  });

  it('toggles to English (LTR)', () => {
    service.use('ar');
    service.toggle();
    expect(service.lang()).toBe('en');
    expect(document.documentElement.dir).toBe('ltr');
  });
});
