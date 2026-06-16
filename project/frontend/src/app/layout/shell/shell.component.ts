import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, HostListener, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter, take } from 'rxjs/operators';
import { APP_NAVIGATION_GROUPS, getBreadcrumbs, resolveSearchTarget } from '../../core/config/navigation.config';
import { DashboardApiService } from '../../core/services/dashboard-api.service';
import type { BreadcrumbItem, NavigationItem, NavigationModule } from '../../core/models/dashboard.models';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './shell.component.html',
  styleUrl: './shell.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ShellComponent {
  private readonly dashboardApi = inject(DashboardApiService);
  private readonly router = inject(Router);

  readonly navigationModules = signal<NavigationModule[]>(APP_NAVIGATION_GROUPS);
  readonly isSidebarOpen = signal(false);
  readonly isSidebarCollapsed = signal(false);
  readonly isLoading = signal(true);
  readonly isProfileOpen = signal(false);
  readonly isDarkMode = signal(false);
  readonly breadcrumbs = signal<BreadcrumbItem[]>([]);
  readonly currentDate = signal(this.formatLongDate());
  readonly currentTime = signal(this.formatTime());
  readonly searchQuery = signal('');

  readonly user = {
    initials: 'AT',
    firstName: 'Lina',
    fullName: 'Lina Attijari',
    email: 'lina.attijari@decision-hub.local',
    role: 'Admin BI',
  };

  constructor() {
    this.dashboardApi
      .getNavigationModules()
      .pipe(take(1))
      .subscribe({
        next: (modules) => {
          this.navigationModules.set(modules.length ? modules : APP_NAVIGATION_GROUPS);
          this.isLoading.set(false);
        },
        error: () => {
          this.navigationModules.set(APP_NAVIGATION_GROUPS);
          this.isLoading.set(false);
        },
      });

    this.handleRouteChange(this.router.url);

    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe((event) => {
        this.handleRouteChange(event.urlAfterRedirects);
      });
  }

  @HostListener('document:mousedown', ['$event'])
  handleDocumentClick(event: MouseEvent) {
    const target = event.target;
    if (!(target instanceof HTMLElement) || target.closest('[data-profile-shell]')) {
      return;
    }

    this.isProfileOpen.set(false);
  }

  toggleSidebar() {
    this.isSidebarOpen.update((value) => !value);
  }

  toggleSidebarCollapse() {
    this.isSidebarCollapsed.update((value) => !value);
  }

  closeSidebar() {
    this.isSidebarOpen.set(false);
  }

  toggleTheme() {
    this.isDarkMode.update((value) => {
      const next = !value;
      document.documentElement.classList.toggle('dark-theme', next);
      return next;
    });
  }

  toggleProfile() {
    this.isProfileOpen.update((value) => !value);
  }

  updateSearchQuery(event: Event) {
    const target = event.target;
    if (target instanceof HTMLInputElement) {
      this.searchQuery.set(target.value);
    }
  }

  submitSearch(event: Event) {
    event.preventDefault();
    const query = this.searchQuery().trim();
    if (!query) {
      return;
    }

    this.router.navigateByUrl(resolveSearchTarget(query));
    this.searchQuery.set('');
  }

  goToAlerts() {
    this.router.navigate(['/home'], { fragment: 'home-alerts' });
  }

  getNavBadge(label: string) {
    return label
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((chunk) => chunk[0]?.toUpperCase() ?? '')
      .join('');
  }

  iconFor(label: string) {
    const normalized = label.toLowerCase();
    if (normalized.includes('accueil')) return '⌂';
    if (normalized.includes('globale')) return '◇';
    if (normalized.includes('churn')) return '!';
    if (normalized.includes('campagne')) return '↗';
    if (normalized.includes('reclamation')) return '◆';
    if (normalized.includes('agence')) return '▦';
    if (normalized.includes('social')) return '#';
    if (normalized.includes('risque')) return '!';
    if (normalized.includes('simulateur')) return '∑';
    if (normalized.includes('explic')) return '?';
    if (normalized.includes('recommand')) return '★';
    return this.getNavBadge(label);
  }

  primaryBottomItems(): NavigationItem[] {
    return this.navigationModules()
      .flatMap((module) => module.items)
      .filter((item) =>
        ['/home', '/dashboards/clients-churn', '/dashboards/campagnes', '/intelligence/clients-risque'].includes(
          item.path,
        ),
      );
  }

  private handleRouteChange(url: string) {
    const pathname = url.split('?')[0]?.split('#')[0] ?? '/home';
    this.breadcrumbs.set(getBreadcrumbs(pathname));
    this.isSidebarOpen.set(false);
    this.isProfileOpen.set(false);
  }

  private formatLongDate() {
    return new Intl.DateTimeFormat('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(new Date());
  }

  private formatTime() {
    return new Intl.DateTimeFormat('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date());
  }
}
