import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ToggleSwitchComponent } from './toggle-switch.component';

@Component({
  imports: [ToggleSwitchComponent],
  template: `<tf-toggle-switch label="App Access" [(checked)]="on" />`,
})
class Host {
  on = signal(false);
}

describe('ToggleSwitchComponent', () => {
  it('is a switch that flips on click and updates the bound value both ways', () => {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const button = (fixture.nativeElement as HTMLElement).querySelector('button')!;

    expect(button.getAttribute('role')).toBe('switch');
    expect(button.getAttribute('aria-label')).toBe('App Access');
    expect(button.getAttribute('aria-checked')).toBe('false');

    button.click();
    fixture.detectChanges();
    expect(fixture.componentInstance.on()).toBe(true);
    expect(button.getAttribute('aria-checked')).toBe('true');

    fixture.componentInstance.on.set(false);
    fixture.detectChanges();
    expect(button.getAttribute('aria-checked')).toBe('false');
  });
});
