import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { TextInputComponent } from './text-input.component';

@Component({
  imports: [ReactiveFormsModule, TextInputComponent],
  template: `
    <tf-text-input id="name" label="Name" [formControl]="name" />
    <tf-text-input id="secret" label="Password" type="password" [formControl]="secret" />
  `,
})
class Host {
  name = new FormControl('', { nonNullable: true });
  secret = new FormControl('', { nonNullable: true });
}

@Component({
  imports: [ReactiveFormsModule, TextInputComponent],
  template: `<tf-text-input id="name" label="Name" error="Required" [formControl]="name" />`,
})
class ErrorHost {
  name = new FormControl('', { nonNullable: true });
}

describe('TextInputComponent', () => {
  let root: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [Host] }).compileComponents();
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    root = fixture.nativeElement;
  });

  const field = (id: string) => root.querySelector<HTMLInputElement>(`#${id}`)!;
  const toggle = () => root.querySelector<HTMLButtonElement>('button[aria-pressed]')!;

  it('only password fields get a show/hide button', () => {
    expect(root.querySelectorAll('button[aria-pressed]').length).toBe(1);
    expect(field('name').type).toBe('text');
  });

  it('hides the password until the button is pressed, then hides it again', () => {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    const input = el.querySelector<HTMLInputElement>('#secret')!;
    const button = el.querySelector<HTMLButtonElement>('button[aria-pressed]')!;

    expect(input.type).toBe('password');
    expect(button.getAttribute('aria-label')).toBe('Show password');

    button.click();
    fixture.detectChanges();
    expect(input.type).toBe('text');
    expect(button.getAttribute('aria-pressed')).toBe('true');
    expect(button.getAttribute('aria-label')).toBe('Hide password');

    button.click();
    fixture.detectChanges();
    expect(input.type).toBe('password');
  });

  it('the id lives on the input only, so the label points at it', () => {
    expect(root.querySelectorAll('#secret').length).toBe(1);
    expect(root.querySelector('#secret')!.tagName).toBe('INPUT');
    expect(root.querySelector('label[for="secret"]')).not.toBeNull();
  });

  it('shows an error without taking space: it is positioned, not part of the layout flow', () => {
    const fixture = TestBed.createComponent(ErrorHost);
    fixture.detectChanges();
    const message = (fixture.nativeElement as HTMLElement).querySelector('small')!;
    expect(message.textContent?.trim()).toBe('Required');
    expect(message.className).toContain('absolute');
    expect(message.id).toBe('name-error');
  });

  it('the button never submits the form', () => {
    expect(toggle().type).toBe('button');
  });
});
