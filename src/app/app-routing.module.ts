import {RouterModule, Routes} from "@angular/router";
import {AuthGuard} from "./core/guards/auth.guard";
import {NgModule} from "@angular/core";

export const routes: Routes = [
  {
    path:"",
    children:[
      {
        canActivate: [AuthGuard],
        path: 'dashboard',
        loadChildren: () => import('./dashboard/dashboard.module').then((m) => m.DashboardModule),
      },
      {
        canActivate: [AuthGuard],
        path: 'login',
        loadChildren: () => import('./login/login.module').then((m) => m.LoginModule),
      },
      { path: '**', redirectTo: '/login' },
    ]
  }
]
@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}
