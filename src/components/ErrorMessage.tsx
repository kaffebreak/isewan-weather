import React from 'react';
import { AlertCircle } from 'lucide-react';

interface ErrorMessageProps {
  message: string;
  title?: string;
  variant?: 'error' | 'warning' | 'info';
}

export const ErrorMessage: React.FC<ErrorMessageProps> = ({ 
  message, 
  title = 'エラーが発生しました', 
  variant = 'error' 
}) => {
  const getVariantStyles = () => {
    switch (variant) {
      case 'warning':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'info':
        return 'bg-blue-50 border-blue-200 text-blue-800';
      default:
        return 'bg-red-50 border-red-200 text-red-800';
    }
  };

  const getIconColor = () => {
    switch (variant) {
      case 'warning':
        return 'text-yellow-400';
      case 'info':
        return 'text-blue-400';
      default:
        return 'text-red-400';
    }
  };

  return (
    <div className={`border rounded-lg p-4 ${getVariantStyles()}`}>
      <div className="flex items-start gap-3">
        <AlertCircle className={`w-5 h-5 mt-0.5 ${getIconColor()}`} />
        <div>
          <h3 className="font-medium">{title}</h3>
          <p className="text-sm mt-1">{message}</p>
        </div>
      </div>
    </div>
  );
};
