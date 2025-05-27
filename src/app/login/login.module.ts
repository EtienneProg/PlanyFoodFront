import { NgModule } from '@angular/core';
import { LoginComponent } from './pages/login.component';
import { ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { LoginRoutingModule } from './login.routing';
import { LoginFormComponent } from './pages/form/form.component';
import {TuiInputModule} from "@taiga-ui/legacy";
import {TuiButton, TuiLabel, TuiTextfieldComponent, TuiTextfieldDirective} from "@taiga-ui/core";
import {TuiLet} from "@taiga-ui/cdk";
import {TuiPassword} from "@taiga-ui/kit";

@NgModule({
  declarations: [
    LoginComponent,
    // ForgotPasswordComponent,
    // ResetPasswordComponent,
    LoginFormComponent,
  ],
  exports: [LoginComponent],
  imports: [
    LoginRoutingModule,
    ReactiveFormsModule,
    TuiInputModule,
    CommonModule,
    TuiButton,
    TuiLet,
    TuiTextfieldComponent,
    TuiLabel,
    TuiTextfieldDirective,
    TuiPassword,
  ],
})
export class LoginModule {}
