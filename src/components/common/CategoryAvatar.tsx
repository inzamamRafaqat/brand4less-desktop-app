import React from 'react';
import { ProductSvgIllustration } from './ProductSvgIllustration';

interface CategoryAvatarProps {
  categoryIcon?: string;
  categoryName?: string;
  productName?: string;
  imageUrl?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'card';
  className?: string;
}

export const CategoryAvatar: React.FC<CategoryAvatarProps> = ({
  categoryIcon,
  categoryName,
  productName,
  imageUrl,
  size = 'md',
  className = '',
}) => {
  // If an external image exists, attempt to render it with fallback to SVG on error
  const [imgError, setImgError] = React.useState(false);

  if (imageUrl && !imgError) {
    return (
      <img
        src={imageUrl}
        alt={productName || categoryName || 'Product'}
        onError={() => setImgError(true)}
        className={`object-cover rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 ${
          size === 'sm'
            ? 'w-10 h-10'
            : size === 'md'
            ? 'w-14 h-14'
            : size === 'lg'
            ? 'w-20 h-20'
            : size === 'card'
            ? 'w-full h-44'
            : 'w-28 h-28'
        } ${className}`}
      />
    );
  }

  const sizeClasses = {
    sm: 'w-10 h-10 p-1.5 rounded-xl',
    md: 'w-14 h-14 p-2.5 rounded-2xl',
    lg: 'w-20 h-20 p-3.5 rounded-2xl',
    card: 'w-full h-44 p-6 rounded-2xl',
    xl: 'w-28 h-28 p-5 rounded-3xl',
  };

  const svgSizes: Record<string, 'sm' | 'md' | 'lg' | 'card'> = {
    sm: 'sm',
    md: 'md',
    lg: 'lg',
    card: 'card',
    xl: 'lg',
  };

  return (
    <div
      className={`inline-flex items-center justify-center flex-shrink-0 transition-all ${sizeClasses[size]} ${className}`}
      title={productName || categoryName || 'Product'}
    >
      <ProductSvgIllustration
        name={productName}
        categoryName={categoryName}
        categoryIcon={categoryIcon}
        size={svgSizes[size]}
      />
    </div>
  );
};
