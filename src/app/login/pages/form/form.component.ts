import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { AuthServiceAPI } from '../../../core/services';
import { ActivatedRoute } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { LoginFormAbstract } from '../form.abstract';
import { FormControl, FormGroup, Validators } from '@angular/forms';

@Component({
  templateUrl: './form.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginFormComponent extends LoginFormAbstract implements OnInit {
  form = new FormGroup({
    email: new FormControl('', Validators.required),
    password: new FormControl('', Validators.required),
  });

  passwordChanged = false;

  constructor(private authSrv: AuthServiceAPI, private route: ActivatedRoute) {
    super();
  }

  ngOnInit() {
    if (this.authSrv.authenticated) {
      console.log('la 2')
      this.authSrv.navigateToHome();
    }

    this.route.fragment.subscribe((v) => {
      if (v === 'passwordChanged') {
        this.passwordChanged = true;
      }
    });
  }

  async submit() {
    if (!this.form.valid) {
      return;
    }

    const redirect = this.route.snapshot.queryParams['redirect_to'];
    const redirectUrl = redirect ? decodeURIComponent(redirect) : undefined;

    this.authSrv.login(this.form.value.email!, this.form.value.password!, redirectUrl).subscribe({
      error: (e: HttpErrorResponse) => this.error$.next('WRONG_LOGIN_OR_PASSWORD'),
    });
  }
}
