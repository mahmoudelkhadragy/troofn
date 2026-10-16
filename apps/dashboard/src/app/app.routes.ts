import { Routes } from '@angular/router';
import { authGuard } from '@core/guards/auth.guard';
import { guestGuard } from '@core/guards/guest.guard';
import { firstClientGuard } from '@features/clients/first-client.guard';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () => import('@features/auth/login/login').then((m) => m.LoginPage),
  },
  {
    path: 'dashboard',
    canActivate: [authGuard],
    canActivateChild: [authGuard],
    loadComponent: () =>
      import('@layout/dashboard-layout/dashboard-layout').then((m) => m.DashboardLayout),
    children: [
      {
        path: '',
        pathMatch: 'full',
        canActivate: [firstClientGuard],
        loadComponent: () =>
          import('@features/clients/pages/client-overview/client-overview').then(
            (m) => m.ClientOverviewPage,
          ),
      },
      {
        path: 'clients/:id',
        loadComponent: () =>
          import('@features/clients/pages/client-overview/client-overview').then(
            (m) => m.ClientOverviewPage,
          ),
      },
      { path: '**', redirectTo: '' },
    ],
  },
  { path: '**', redirectTo: 'dashboard' },
];
