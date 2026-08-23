import { Route } from '@angular/router';
import { StudioRouteComponent } from './studio-route.component';

export const appRoutes: Route[] = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'reels/1/overview',
  },
  {
    path: 'reels/:episodeId',
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'overview' },
      { path: 'overview', component: StudioRouteComponent },
      { path: 'script', component: StudioRouteComponent },
      { path: 'shots', component: StudioRouteComponent },
      { path: 'direction', component: StudioRouteComponent },
      { path: 'audio', component: StudioRouteComponent },
      { path: 'publishing', component: StudioRouteComponent },
      { path: 'assets', component: StudioRouteComponent },
      { path: 'jobs', component: StudioRouteComponent },
      { path: '**', redirectTo: 'overview' },
    ],
  },
  { path: '**', redirectTo: 'reels/1/overview' },
];
