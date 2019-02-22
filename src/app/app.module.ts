import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';

import { AppComponent } from './app.component';
import {RouterModule} from '@angular/router';
import {appRoutes} from './routes';
import {HomeComponent} from './home/home.component';
import {DashboardComponent} from './dashboard/dashboard.component';
import {LoginComponent} from './login/login.component';
import {HttpClientModule} from '@angular/common/http';
import {TableModule} from 'primeng/table';
import {DialogModule} from 'primeng/dialog';
import {DropdownModule, InputTextModule} from 'primeng/primeng';
import {FormsModule} from '@angular/forms';
import {BrowserAnimationsModule} from '@angular/platform-browser/animations';
import {NavbarComponent} from './shared/navbar/navbar.component';

@NgModule({
  declarations: [
    AppComponent,
    HomeComponent,
    DashboardComponent,
    LoginComponent,
    NavbarComponent
  ],
  imports: [
    BrowserModule,
    FormsModule,
    BrowserAnimationsModule,
    DropdownModule,
    TableModule,
    InputTextModule,
    DialogModule,
    HttpClientModule,
    RouterModule.forRoot(appRoutes, { useHash: true, paramsInheritanceStrategy: 'always' }),
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
