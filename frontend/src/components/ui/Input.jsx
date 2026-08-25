import { forwardRef } from 'react';

export const Input = forwardRef(({ 
  label, 
  error, 
  hint, 
  className = '', 
  ...props 
}, ref) => {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-chalk/80 mb-1.5">{label}</label>
      )}
      <input
        ref={ref}
        className={`w-full px-4 py-3 rounded-lg bg-rule-line/30 border transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-amber-chalk/20 ${
          error 
            ? 'border-rust focus:border-rust' 
            : 'border-rule-line text-chalk placeholder:text-chalk/40 focus:border-amber-chalk'
        } ${className}`}
        aria-invalid={error ? 'true' : 'false'}
        aria-describedby={error ? `${props.id}-error` : hint ? `${props.id}-hint` : undefined}
        {...props}
      />
      {error && (
        <p id={`${props.id}-error`} className="mt-1.5 text-sm text-rust" role="alert">{error}</p>
      )}
      {hint && !error && (
        <p id={`${props.id}-hint`} className="mt-1.5 text-sm text-chalk/50">{hint}</p>
      )}
    </div>
  );
});

Input.displayName = 'Input';