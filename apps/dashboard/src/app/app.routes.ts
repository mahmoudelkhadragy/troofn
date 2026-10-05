import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', loadComponent: () => import('@features/home/home').then((m) => m.HomePage) },
  // Feature routes are added per roadmap phase, e.g.:
  // { path: 'clients', loadChildren: () => import('@features/clients/clients.routes') },
  { path: '**', redirectTo: '' },
];
