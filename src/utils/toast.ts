import { toast } from 'react-toastify';
import { CheckCircleIcon, ExclamationTriangleIcon, InformationCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';
import React from 'react';

interface ToastOptions {
  autoClose?: number;
  hideProgressBar?: boolean;
  closeOnClick?: boolean;
  pauseOnHover?: boolean;
  draggable?: boolean;
}

const createToastContent = (message: string, IconComponent: React.ComponentType<{ className?: string }>) => {
  return React.createElement('div', {
    className: 'flex items-center space-x-3'
  }, [
    React.createElement(IconComponent, {
      key: 'icon',
      className: 'h-5 w-5 flex-shrink-0'
    }),
    React.createElement('span', {
      key: 'message',
      className: 'text-sm font-medium'
    }, message)
  ]);
};

export const showSuccessToast = (message: string, options?: ToastOptions) => {
  toast.success(createToastContent(message, CheckCircleIcon), {
    className: '!bg-green-50 !text-green-800 !border-green-200',
    progressClassName: '!bg-green-500',
    autoClose: 4000,
    ...options
  });
};

export const showErrorToast = (message: string, options?: ToastOptions) => {
  toast.error(createToastContent(message, XCircleIcon), {
    className: '!bg-red-50 !text-red-800 !border-red-200',
    progressClassName: '!bg-red-500',
    autoClose: 5000,
    ...options
  });
};

export const showWarningToast = (message: string, options?: ToastOptions) => {
  toast.warning(createToastContent(message, ExclamationTriangleIcon), {
    className: '!bg-yellow-50 !text-yellow-800 !border-yellow-200',
    progressClassName: '!bg-yellow-500',
    autoClose: 4000,
    ...options
  });
};

export const showInfoToast = (message: string, options?: ToastOptions) => {
  toast.info(createToastContent(message, InformationCircleIcon), {
    className: '!bg-blue-50 !text-blue-800 !border-blue-200',
    progressClassName: '!bg-blue-500',
    autoClose: 4000,
    ...options
  });
};