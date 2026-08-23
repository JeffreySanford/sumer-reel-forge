import { Route } from '@angular/router';
import { ChapterOverviewComponent } from './chapter-overview.component';
import { ProjectOverviewComponent } from './project-overview.component';
import { StudioHomeComponent } from './studio-home.component';
import { StudioRouteComponent } from './studio-route.component';
import { SystemCapabilitiesComponent } from './system-capabilities.component';

export const appRoutes: Route[] = [
  {
    path: '',
    pathMatch: 'full',
    component: StudioHomeComponent,
  },
  {
    path: 'projects/:projectSlug/chapters/:chapterNumber',
    component: ChapterOverviewComponent,
  },
  {
    path: 'projects/:projectSlug',
    component: ProjectOverviewComponent,
  },
  {
    path: 'system',
    component: SystemCapabilitiesComponent,
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
  { path: '**', redirectTo: '' },
];
