import React from 'react';
import { SendStatus } from '../types';
import { Loader2 } from 'lucide-react';

interface Props {
  status: SendStatus;
}

export const StatusBadge: React.FC<Props> = ({ status }) => {
  const baseClasses = "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border";

  switch (status) {
    case SendStatus.SUCCESS:
      return (
        <span className={`${baseClasses} bg-emerald-50 text-emerald-700 border-emerald-100`}>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5"></span>
          Enviado
        </span>
      );
    case SendStatus.ERROR:
      return (
        <span className={`${baseClasses} bg-rose-50 text-rose-700 border-rose-100`}>
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 mr-1.5"></span>
          Erro
        </span>
      );
    case SendStatus.SENDING:
      return (
        <span className={`${baseClasses} bg-blue-50 text-blue-700 border-blue-100`}>
          <Loader2 className="w-3 h-3 mr-1.5 animate-spin text-blue-500" />
          Enviando...
        </span>
      );
    default:
      return (
        <span className={`${baseClasses} bg-gray-50 text-gray-600 border-gray-200`}>
          <span className="w-1.5 h-1.5 rounded-full bg-gray-400 mr-1.5"></span>
          Pendente
        </span>
      );
  }
};