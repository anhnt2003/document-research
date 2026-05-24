import { Routes } from '@angular/router';

const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'profile' },
  { path: 'profile', loadComponent: () => import('./account-profile.page').then((m) => m.AccountProfilePage) },
  { path: 'security', loadComponent: () => import('./account-security.page').then((m) => m.AccountSecurityPage) },
  { path: 'activity', loadComponent: () => import('./account-activity.page').then((m) => m.AccountActivityPage) },
];

export default routes;
