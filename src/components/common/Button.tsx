import React, { ReactNode, forwardRef } from 'react';
import LoadingSpinner from './LoadingSpinner';

interface ButtonProps {
  children: ReactNode;
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  type?: 'button' | 'submit' | 'reset';
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  className?: string;
  'aria-label'?: string;
  'aria-describedby'?: string;
  id?: string;
  form?: string;
  name?: string;
  value?: string;
  tabIndex?: number;
  autoFocus?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(({
  children,
  onClick,
  type = 'button',
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  fullWidth = false,
  className = '',
  'aria-label': ariaLabel,
  'aria-describedby': ariaDescribedby,
  id,
  form,
  name,
  value,
  tabIndex,
  autoFocus = false,
  ...restProps
}, ref) => {
  // Base classes - mobile first approach
  const baseClasses = [
    'inline-flex',
    'items-center',
    'justify-center',
    'font-medium',
    'text-center',
    'border',
    'rounded-lg',
    'transition-all',
    'duration-200',
    'ease-in-out',
    'focus:outline-none',
    'focus:ring-2',
    'focus:ring-offset-2',
    'focus:ring-offset-white',
    'active:transform',
    'active:scale-[0.98]',
    'disabled:opacity-50',
    'disabled:cursor-not-allowed',
    'disabled:pointer-events-none',
    'disabled:transform-none',
    // Mobile touch improvements
    'touch-manipulation',
    'select-none',
    // High contrast mode support
    'forced-colors:border-solid',
  ].join(' ');
  
  const variantClasses = {
    primary: [
      'bg-red-600',
      'text-white',
      'border-red-600',
      'hover:bg-red-700',
      'hover:border-red-700',
      'focus:ring-red-500',
      'active:bg-red-800',
      'disabled:bg-red-300',
      'disabled:border-red-300',
    ].join(' '),
    
    secondary: [
      'bg-gray-600',
      'text-white',
      'border-gray-600',
      'hover:bg-gray-700',
      'hover:border-gray-700',
      'focus:ring-gray-500',
      'active:bg-gray-800',
      'disabled:bg-gray-300',
      'disabled:border-gray-300',
    ].join(' '),
    
    outline: [
      'bg-transparent',
      'text-red-600',
      'border-red-600',
      'hover:bg-red-50',
      'hover:border-red-700',
      'hover:text-red-700',
      'focus:ring-red-500',
      'active:bg-red-100',
      'disabled:text-red-300',
      'disabled:border-red-300',
      'disabled:bg-transparent',
    ].join(' '),
    
    ghost: [
      'bg-transparent',
      'text-red-600',
      'border-transparent',
      'hover:bg-red-50',
      'hover:border-red-100',
      'focus:ring-red-500',
      'active:bg-red-100',
      'disabled:text-red-300',
      'disabled:bg-transparent',
    ].join(' '),
  };

  // Mobile first sizing
  const sizeClasses = {
    small: [
      'px-3',
      'py-2',
      'text-sm',
      'min-h-[36px]', // Minimum touch target
      'gap-1.5',
      'sm:px-2.5',
      'sm:py-1.5',
      'sm:min-h-[32px]',
    ].join(' '),
    
    medium: [
      'px-4',
      'py-2.5',
      'text-base',
      'min-h-[44px]', // Minimum touch target
      'gap-2',
      'sm:px-4',
      'sm:py-2',
      'sm:min-h-[40px]',
    ].join(' '),
    
    large: [
      'px-6',
      'py-3.5',
      'text-lg',
      'font-semibold',
      'min-h-[52px]', // Minimum touch target
      'gap-2.5',
      'sm:px-6',
      'sm:py-3',
      'sm:min-h-[48px]',
    ].join(' '),
  };

  const fullWidthClass = fullWidth ? 'w-full' : '';

  const combinedClasses = [
    baseClasses,
    variantClasses[variant],
    sizeClasses[size],
    fullWidthClass,
    className,
  ].filter(Boolean).join(' ');

  // Handle click events securely
  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    if (disabled || loading) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    
    onClick?.(event);
  };

  // Get appropriate spinner color based on variant
  const getSpinnerColor = () => {
    switch (variant) {
      case 'primary':
      case 'secondary':
        return 'white';
      case 'outline':
      case 'ghost':
        return 'red';
      default:
        return 'white';
    }
  };

  // Loading state content
  const loadingContent = (
    <span className="flex items-center justify-center gap-2" role="status" aria-live="polite">
      <LoadingSpinner 
        size={size === 'small' ? 'small' : 'medium'} 
        color={getSpinnerColor()} 
        aria-hidden="true"
      />
      <span className="sr-only">Loading...</span>
    </span>
  );

  return (
    <button
      ref={ref}
      type={type}
      onClick={handleClick}
      disabled={disabled || loading}
      className={combinedClasses}
      aria-label={ariaLabel}
      aria-describedby={ariaDescribedby}
      aria-busy={loading}
      aria-disabled={disabled || loading}
      id={id}
      form={form}
      name={name}
      value={value}
      tabIndex={tabIndex}
      autoFocus={autoFocus}
      {...restProps}
    >
      {loading ? loadingContent : children}
    </button>
  );
});

Button.displayName = 'Button';

export default Button;

