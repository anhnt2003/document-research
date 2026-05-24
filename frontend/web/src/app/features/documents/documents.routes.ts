import { Routes } from '@angular/router';

const routes: Routes = [
  { path: '', loadComponent: () => import('./document-list.page').then((m) => m.DocumentListPage) },
  { path: 'upload', loadComponent: () => import('./document-upload.page').then((m) => m.DocumentUploadPage) },
  { path: 'tags', loadComponent: () => import('./document-tags.page').then((m) => m.DocumentTagsPage) },
  { path: ':id', loadComponent: () => import('./document-detail.page').then((m) => m.DocumentDetailPage) },
];

export default routes;
