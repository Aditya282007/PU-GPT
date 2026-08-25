import { forwardRef } from 'react';

export const Card = forwardRef(({ 
  children, 
  className = '', 
  padding = 'p-6',
  ...props 
}, ref) => {
  return (
    <div
      ref={ref}
      className={`bg-rule-line/20 border border-rule-line rounded-xl ${padding} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
});

Card.displayName = 'Card';

export const CardHeader = forwardRef(({ children, className = '', ...props }, ref) => (
  <div ref={ref} className={`mb-4 ${className}`} {...props}>
    {children}
  </div>
));

CardHeader.displayName = 'CardHeader';

export const CardTitle = forwardRef(({ children, className = '', ...props }, ref) => (
  <h3 ref={ref} className={`font-display font-medium text-lg text-chalk ${className}`} {...props}>
    {children}
  </h3>
));

CardTitle.displayName = 'CardTitle';

export const CardContent = forwardRef(({ children, className = '', ...props }, ref) => (
  <div ref={ref} className={className} {...props}>
    {children}
  </div>
));

CardContent.displayName = 'CardContent';