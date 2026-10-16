import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { AppAccess } from '../../models/client.model';
import { AppAccessCardComponent } from './app-access-card.component';

const access = (enabled: boolean): AppAccess => ({
  enabled,
  rating: 8.9,
  sow: [
    { label: 'SOW 1.0', enabled: false },
    { label: 'SOW 2.0', enabled: true },
  ],
});

@Component({
  imports: [AppAccessCardComponent],
  template: `<tf-app-access-card [access]="value()" (accessChange)="changes.push($event)" />`,
})
class Host {
  value = signal(access(true));
  changes: AppAccess[] = [];
}

describe('AppAccessCardComponent', () => {
  const setup = () => {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    const switches = () => [...el.querySelectorAll<HTMLButtonElement>('button[role="switch"]')];
    return { fixture, el, switches };
  };

  it('shows App Access first, then one switch per SOW, with their current state', () => {
    const { switches } = setup();
    expect(switches().map((s) => s.getAttribute('aria-label'))).toEqual([
      'App Access',
      'SOW 1.0',
      'SOW 2.0',
    ]);
    expect(switches().map((s) => s.getAttribute('aria-checked'))).toEqual([
      'true',
      'false',
      'true',
    ]);
  });

  it('reports each change with the whole new state', () => {
    const { fixture, switches } = setup();
    switches()[1].click(); // SOW 1.0 on
    switches()[0].click(); // App Access off
    fixture.detectChanges();

    expect(fixture.componentInstance.changes).toHaveLength(2);
    expect(fixture.componentInstance.changes[0].sow[0].enabled).toBe(true);
    expect(fixture.componentInstance.changes[1]).toMatchObject({ enabled: false });
    expect(switches().map((s) => s.getAttribute('aria-checked'))).toEqual([
      'false',
      'true',
      'true',
    ]);
  });

  it('starts again from the new data when a different client is loaded', () => {
    const { fixture, switches } = setup();
    switches()[0].click();
    fixture.detectChanges();
    expect(switches()[0].getAttribute('aria-checked')).toBe('false');

    fixture.componentInstance.value.set(access(true));
    fixture.detectChanges();
    expect(switches()[0].getAttribute('aria-checked')).toBe('true');
  });
});
