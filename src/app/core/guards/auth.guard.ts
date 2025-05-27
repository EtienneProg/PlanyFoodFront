import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, Router, RouterStateSnapshot } from '@angular/router';
import { AuthServiceAPI } from '../services';

@Injectable({
  providedIn: 'root',
})
export class AuthGuard implements CanActivate {
  constructor(private authSrv: AuthServiceAPI, private router: Router) {}

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean {
    if (state.url.startsWith('/login')) {
      if (this.authSrv.authenticated) {
        void this.authSrv.navigateToHome();
        return false;
      }

      return true;
    }

    if (this.authSrv.authenticated) {
      return true;
    }

    void this.router.navigateByUrl('/login?redirect_to=' + encodeURIComponent(state.url));
    return false;
  }
}
