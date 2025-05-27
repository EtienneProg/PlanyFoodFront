import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppComponent } from './app.component';
import {RouteReuseStrategy} from "@angular/router";
import {AppRoutingModule} from "./app-routing.module";
import {HTTP_INTERCEPTORS, HttpClientModule} from "@angular/common/http";
import {RouteInterceptor} from "./core/interceptors/route.interceptor";
import {JwtInterceptor} from "./core/interceptors";
import {CommonModule} from "@angular/common";

@NgModule({
  declarations: [
    AppComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    HttpClientModule,
    CommonModule,
  ],
  providers: [
    {
      provide: HTTP_INTERCEPTORS,
      useClass: JwtInterceptor,
      multi: true,
    },
    {
      provide: RouteReuseStrategy,
      useClass: RouteInterceptor,
    },
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
