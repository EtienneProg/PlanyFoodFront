import {
  HttpErrorResponse,
  HttpEvent,
  HttpHandler,
  HttpInterceptor,
  HttpRequest,
} from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthServiceAPI } from '../services';

@Injectable()
export class JwtInterceptor implements HttpInterceptor {
  constructor(private authSrv: AuthServiceAPI) {}
  intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    if (this.authSrv.jwt) {
      request = request.clone({
        setHeaders: {
          Authorization: `Bearer ${this.authSrv.jwt}`,
        },
      });
    }

    return next.handle(request).pipe(
      catchError((e) => {
        // If error is 401, we need to authenticatate
        if (e instanceof HttpErrorResponse && e.status === 401) {
          this.authSrv.logout();
        }

        return throwError(e);
      }),
    );
  }
}
