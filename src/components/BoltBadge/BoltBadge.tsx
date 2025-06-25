import React from 'react';

interface BoltBadgeProps {
  variant?: 'default' | 'minimal' | 'dark';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const BoltBadge: React.FC<BoltBadgeProps> = ({ 
  variant = 'default', 
  size = 'md',
  className = '' 
}) => {
  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1.5 text-sm',
    lg: 'px-4 py-2 text-base'
  };

  const variantClasses = {
    default: 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700',
    minimal: 'bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200',
    dark: 'bg-gray-900 text-white hover:bg-gray-800'
  };

  return (
    <a
      href="https://bolt.new"
      target="_blank"
      rel="noopener noreferrer"
      className={`
        inline-flex items-center gap-2 rounded-full font-medium transition-all duration-200 
        hover:scale-105 hover:shadow-lg group cursor-pointer z-40
        ${sizeClasses[size]} 
        ${variantClasses[variant]}
        ${className}
      `}
    >
      {/* Bolt Icon */}
      <svg 
        className={`${size === 'sm' ? 'w-3 h-3' : size === 'lg' ? 'w-5 h-5' : 'w-4 h-4'} transition-transform group-hover:rotate-12`}
        viewBox="0 0 24 24" 
        fill="none" 
        stroke="currentColor" 
        strokeWidth="2"
      >
        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
      </svg>
      
      <span className="font-semibold">Built with Bolt</span>
    </a>
  );
};

export default BoltBadge;