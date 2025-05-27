import { BehaviorSubject, Subject } from 'rxjs';

export class LoginFormAbstract {
  readonly error$ = new Subject<string>();

  readonly firstInputText$ = new BehaviorSubject<string>('MAIL');
}
