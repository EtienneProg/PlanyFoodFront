import { BaseContact } from '../base-contact';

export interface UserAPI extends BaseContact {
  email: string;

  username: string;

  nom: string;

  prenom: string;
}
