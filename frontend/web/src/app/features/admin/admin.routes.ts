import { Routes } from '@angular/router';

const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'users' },
  { path: 'users', loadComponent: () => import('./users/user-list.page').then((m) => m.UserListPage) },
  { path: 'users/new', loadComponent: () => import('./users/user-invite.page').then((m) => m.UserInvitePage) },
  { path: 'users/:id', loadComponent: () => import('./users/user-detail.page').then((m) => m.UserDetailPage) },
  { path: 'roles', loadComponent: () => import('./roles/role-list.page').then((m) => m.RoleListPage) },
  { path: 'roles/:id', loadComponent: () => import('./roles/role-detail.page').then((m) => m.RoleDetailPage) },
  { path: 'permissions', loadComponent: () => import('./permissions/permission-catalog.page').then((m) => m.PermissionCatalogPage) },
];

export default routes;
