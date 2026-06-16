import { Routes } from '@angular/router';
import { ShellComponent } from './layout/shell/shell.component';
import { HomeComponent } from './pages/home/home.component';
import { IntelligenceComponent } from './pages/intelligence/intelligence.component';
import { ReportComponent } from './pages/report/report.component';

export const routes: Routes = [
  {
    path: '',
    component: ShellComponent,
    children: [
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'home',
      },
      {
        path: 'home',
        component: HomeComponent,
        title: 'Accueil | Attijari BI Premium Shell',
      },
      {
        path: 'dashboards/:reportId',
        component: ReportComponent,
        title: 'Dashboard | Attijari BI Premium Shell',
      },
      {
        path: 'intelligence/:pageId',
        component: IntelligenceComponent,
        title: 'Intelligence | Attijari BI Premium Shell',
      },
    ],
  },
  {
    path: '**',
    redirectTo: 'home',
  },
];
