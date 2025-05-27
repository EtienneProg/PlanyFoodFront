import { BehaviorSubject } from 'rxjs';

export abstract class BaseAuthService {
  protected _jwt$ = new BehaviorSubject<string | null>(null);

  protected abstract get jwtStoreKey(): string;

  protected abstract get storage(): Storage;

  get authenticated() {
    return !!this._jwt$.value;
  }

  get jwt() {
    return this._jwt$.value;
  }

  protected getJwt() {
    const storedJWT = this.storage.getItem(this.jwtStoreKey);
    if (storedJWT) {
      this._jwt$.next(storedJWT);
    }
  }

  protected setJwt(jwt: string) {
    this._jwt$.next(jwt);

    this.storage.setItem(this.jwtStoreKey, jwt);
  }

  protected removeJwt() {
    this.storage.removeItem(this.jwtStoreKey);
    this._jwt$.next(null);
  }
}
