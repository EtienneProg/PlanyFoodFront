import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Router, UrlTree } from '@angular/router';
import { of, switchMap } from 'rxjs';
import { filter, map, share, shareReplay, take, tap } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import { UserAPI } from '../../models';
import { BaseAuthService } from '../base-auth.service';

interface ServerAuthOutput {
  jwt: string;

  user: UserAPI;
}

@Injectable({
  providedIn: 'root',
})
export class AuthServiceAPI extends BaseAuthService {
  private readonly apiURI: string;

  readonly user$ = this._jwt$.pipe(
    switchMap((jwt) => {
      if (jwt) {
        return this.http.get<UserAPI>(environment.apiURI + '/users/me')
      }

      return of(null);
    }),
    share(),
    shareReplay(1),
  );

  constructor(
    private http: HttpClient,
    private router: Router,
  ) {
    super();
    this.apiURI = environment.apiURI + '/auth';
    this.getJwt();
  }

  /**
   * Send a password forgotten request
   * @param username
   */
  forgotPassword(username: string) {
    return this.http.post(this.apiURI + '/forgot-password', {
      username: username,
    });
  }

  /**
   * Login using the provided email and password
   * @param username
   * @param password
   * @param redirectUri
   * @return When user is successfully authenticated
   * @throws When user isn't authenticated
   */
  login(username: string, password: string, redirectUri?: string | UrlTree) {
    return this.http
      .post<ServerAuthOutput>(this.apiURI + '/login', {
        username: username,
        password: password,
      })
      .pipe(
        // Store JWT
        tap((output) => {
          this.setJwt(output.jwt);
          if (redirectUri) {
            void this.router.navigateByUrl(redirectUri);
          } else {
            console.log('la 3')
            this.navigateToHome();
          }
        }),
        // If everything went smoothly, return true
        map(() => true),
      );
  }

  navigateToHome() {
    this.router.navigate(['/dashboard/home']).then();
  }

  logout() {
    this.removeJwt();
  }

  protected get storage() {
    return localStorage;
  }

  protected get jwtStoreKey(): string {
    return 'jwt';
  }
}
