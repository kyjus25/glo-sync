import {Routes} from '@angular/router';
import {HomeComponent} from './home/home.component';
import {DashboardComponent} from './dashboard/dashboard.component';
import {LoginComponent} from './login/login.component';

export const appRoutes
: Routes = [
    {path: 'login', component: LoginComponent},
    {path: 'dashboard', component: DashboardComponent},
    {path: '', component: HomeComponent, pathMatch: 'full'},
    {path: '**', component: HomeComponent, pathMatch: 'full'},
];
