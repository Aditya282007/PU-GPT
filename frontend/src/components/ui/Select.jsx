import { forwardRef } from 'react';

export const Select = forwardRef(({ 
  label, 
  error, 
  options = [], 
  placeholder,
  className = '', 
  ...props 
}, ref) => {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-chalk/80 mb-1.5">{label}</label>
      )}
      <select
        ref={ref}
        className={`w-full px-4 py-3 rounded-lg bg-rule-line/30 border appearance-none transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-amber-chalk/20 ${
          error 
            ? 'border-rust focus:border-rust' 
            : 'border-rule-line text-chalk focus:border-amber-chalk'
        } ${className}`}
        aria-invalid={error ? 'true' : 'false'}
        {...props}
      >
        {placeholder && <option value="" disabled>{placeholder}</option>}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && <p className="mt-1.5 text-sm text-rust" role="alert">{error}</p>}
    </div>
  );
});

Select.displayName = 'Select';