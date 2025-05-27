import { Civilite } from '../civilite';
import { BaseAPIModel } from './base';

export interface BaseContact extends BaseAPIModel {
  civilite: Civilite;

  nom: string;

  prenom: string;
}
