import {NgModule} from "@angular/core";
import {DashboardComponent} from "./pages";
import {HomeComponent} from "./pages/home/home.component";
import {CommonModule} from "@angular/common";
import {DashboardRoutingModule} from "./dashboard.routing";
import {CalendarComponent} from "../core/component/calendar/calendar.component";
import {FontAwesomeModule} from "@fortawesome/angular-fontawesome";



@NgModule({
  declarations: [
    DashboardComponent,
    HomeComponent,
    CalendarComponent
  ],
  imports: [
    CommonModule,
    DashboardRoutingModule,
    FontAwesomeModule,
  ],
})
export class DashboardModule {}
