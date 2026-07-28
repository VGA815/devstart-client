import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { By } from '@angular/platform-browser';
import { NavComponent } from './nav.component';
import { AuthService } from '../../auth/auth.service';
import { ProfileService } from '../../../features/startups/profile.service';
import { UserPreferencesService } from '../../preferences/user-preferences.service';
import { THEME_STORAGE_KEY } from '../../preferences/theme.constants';
import { of } from 'rxjs';

describe('NavComponent — theme toggle', () => {
  let fixture: ComponentFixture<NavComponent>;

  function button(): HTMLButtonElement {
    return fixture.debugElement.query(By.css('.nav__theme')).nativeElement;
  }

  beforeEach(async () => {
    localStorage.removeItem(THEME_STORAGE_KEY);
    document.documentElement.removeAttribute('data-theme');

    // System resolves to dark, so the toggle starts from a known state.
    spyOn(window, 'matchMedia').and.returnValue({
      matches: false,
      addEventListener: () => {},
      removeEventListener: () => {},
    } as unknown as MediaQueryList);

    await TestBed.configureTestingModule({
      imports: [NavComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        // Anonymous visitor: the toggle must work without a session.
        { provide: AuthService, useValue: { user: signal(null), isAuthenticated: signal(false), role: signal(null) } },
        { provide: ProfileService, useValue: { getProfile: () => of({ avatarId: null }) } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(NavComponent);
    fixture.detectChanges();
  });

  afterEach(() => {
    localStorage.removeItem(THEME_STORAGE_KEY);
    document.documentElement.removeAttribute('data-theme');
  });

  it('renders for anonymous visitors', () => {
    expect(button()).toBeTruthy();
  });

  it('flips the painted theme on click', () => {
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');

    button().click();
    TestBed.flushEffects();
    fixture.detectChanges();

    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    expect(TestBed.inject(UserPreferencesService).theme()).toBe('Light');
  });

  it('describes the action it will perform, not the current state', () => {
    expect(button().getAttribute('aria-label')).toBe('Включить светлую тему');

    button().click();
    TestBed.flushEffects();
    fixture.detectChanges();

    expect(button().getAttribute('aria-label')).toBe('Включить тёмную тему');
  });
});
