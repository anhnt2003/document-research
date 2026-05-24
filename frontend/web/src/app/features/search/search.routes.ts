import { Routes } from '@angular/router';

const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./search-home.page').then((m) => m.SearchHomePage),
  },
  {
    path: 'results',
    loadComponent: () => import('./search-results.page').then((m) => m.SearchResultsPage),
  },
  {
    path: 'history',
    loadComponent: () => import('./search-history.page').then((m) => m.SearchHistoryPage),
  },
];

export default routes;
