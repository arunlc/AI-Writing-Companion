// frontend/src/components/ui/Button.jsx - UPDATED WITH WARNING VARIANT
import React from 'react';
import clsx from 'clsx';

const Button = ({
  children,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  className,
  ...props
}) => {
  const baseClasses = 'inline-flex items-center justify-center font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors duration-200';
  
  const variants = {
    primary: 'bg-primary-600 text-white hover:bg-primary-700 focus:ring-primary-500 disabled:bg-gray-400',
    secondary: 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 focus:ring-primary-500 disabled:bg-gray-100',
    success: 'bg-success-600 text-white hover:bg-success-700 focus:ring-success-500 disabled:bg-gray-400',
    danger: 'bg-error-600 text-white hover:bg-error-700 focus:ring-error-500 disabled:bg-gray-400',
    warning: 'bg-warning-600 text-white hover:bg-warning-700 focus:ring-warning-500 disabled:bg-gray-400', // ✅ ADDED
    ghost: 'text-gray-700 hover:bg-gray-100 focus:ring-primary-500 disabled:text-gray-400'
  };

  const sizes = {
    sm: 'px-3 py-2 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base'
  };

  return (
    <button
      disabled={disabled || loading}
      className={clsx(
        baseClasses,
        variants[variant],
        sizes[size],
        disabled && 'cursor-not-allowed opacity-60',
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
};

export default Button;
