import { Component } from '@angular/core';
import {AuthServiceAPI} from "./core/services";

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  title = 'PlanyFoodFront';
  constructor(private authSrv: AuthServiceAPI) {
    authSrv.user$.subscribe()
  }
}
 
