import {Component, Input} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {combineLatest} from 'rxjs/internal/observable/combineLatest';
import {delay} from 'rxjs/operators';

@Component({
  selector: 'app-navbar',
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.css']
})
export class NavbarComponent {
  @Input() status: string;
}
