export enum SendStatus {
  IDLE = 'IDLE',
  PENDING = 'PENDING',
  SENDING = 'SENDING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR',
}

export interface Contact {
  id: string; // Unique ID for React keys
  Nome: string;
  Telefone: string;
  Nome_Campanha: string;
  Nome_template: string;
  status: SendStatus;
  errorMessage?: string;
}

export interface Stats {
  total: number;
  pending: number;
  success: number;
  error: number;
}