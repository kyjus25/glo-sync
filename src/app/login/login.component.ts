import { Component } from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {Router} from '@angular/router';
const config = require('../../fe_config.json');

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  constructor(
    private http: HttpClient,
    private router: Router
  ) {
    const auth_token = this.getCookie('auth_token');
    if (auth_token !== undefined && auth_token !== null) {
      this.router.navigate(['/dashboard']);
    } else {
      window.location.replace('https://app.gitkraken.com/oauth/authorize?response_type=code&client_id=' + config.CLIENT_ID +
        '&scope=board:write board:read user:write user:read&state=' + config.STATE);
    }
  }

  private getCookie(name) {
    const value = '; ' + document.cookie;
    const parts = value.split('; ' + name + '=');
    if (parts.length === 2) { return parts.pop().split(';').shift()};
  }
}
