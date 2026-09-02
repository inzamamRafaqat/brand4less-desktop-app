import React from 'react';

interface ProductSvgProps {
  name?: string;
  categoryName?: string;
  categoryIcon?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'card' | 'banner';
}

export const ProductSvgIllustration: React.FC<ProductSvgProps> = ({
  name = '',
  categoryName = '',
  categoryIcon = '',
  className = '',
  size = 'card',
}) => {
  const combined = `${name} ${categoryName} ${categoryIcon}`.toLowerCase();

  const sizeStyles = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
    card: 'w-24 h-24 md:w-28 md:h-28',
    banner: 'w-36 h-36',
  };

  // 1. Denim Jeans & Trousers
  if (
    combined.includes('jean') ||
    combined.includes('denim') ||
    combined.includes('pant') ||
    combined.includes('trouser') ||
    combined.includes('chino')
  ) {
    return (
      <svg
        viewBox="0 0 100 100"
        className={`${sizeStyles[size]} fill-none stroke-current stroke-[2.2] stroke-linecap-round stroke-linejoin-round ${className}`}
      >
        {/* Waistband */}
        <path d="M 28 20 L 72 20 L 70 28 L 30 28 Z" />
        {/* Belt Loops */}
        <line x1="36" y1="20" x2="36" y2="28" />
        <line x1="50" y1="20" x2="50" y2="28" />
        <line x1="64" y1="20" x2="64" y2="28" />
        {/* Fly & Button */}
        <circle cx="50" cy="24" r="1.5" fill="currentColor" />
        <path d="M 50 28 L 50 42 Q 53 45 56 42" strokeDasharray="1.5 1" />
        {/* Front Pockets */}
        <path d="M 30 28 Q 40 30 42 42" />
        <path d="M 70 28 Q 60 30 58 42" />
        {/* Watch Pocket */}
        <path d="M 34 31 Q 38 32 39 37" strokeDasharray="1.5 1" />
        {/* Legs Outer & Inseam */}
        <path d="M 30 28 L 22 84 L 38 84 L 50 48 L 62 84 L 78 84 L 70 28" />
        {/* Hem stitching */}
        <line x1="22" y1="80" x2="38" y2="80" strokeDasharray="1 1" />
        <line x1="62" y1="80" x2="78" y2="80" strokeDasharray="1 1" />
      </svg>
    );
  }

  // 2. Polo Shirt
  if (combined.includes('polo')) {
    return (
      <svg
        viewBox="0 0 100 100"
        className={`${sizeStyles[size]} fill-none stroke-current stroke-[2.2] stroke-linecap-round stroke-linejoin-round ${className}`}
      >
        {/* Collar */}
        <path d="M 36 22 L 46 32 L 50 26 L 54 32 L 64 22 Z" />
        {/* Placket */}
        <path d="M 46 32 L 46 48 L 54 48 L 54 32" />
        <circle cx="50" cy="37" r="1.2" fill="currentColor" />
        <circle cx="50" cy="43" r="1.2" fill="currentColor" />
        {/* Shoulders & Body */}
        <path d="M 36 22 L 20 32 L 14 42 L 24 46 L 28 38 L 28 82 L 72 82 L 72 38 L 76 46 L 86 42 L 80 32 L 64 22" />
        {/* Sleeve Ribs */}
        <line x1="14" y1="42" x2="24" y2="46" />
        <line x1="76" y1="46" x2="86" y2="42" />
        {/* Bottom Hem & Side Slits */}
        <line x1="28" y1="78" x2="72" y2="78" strokeDasharray="1.5 1.5" />
      </svg>
    );
  }

  // 3. Formal & Casual Buttoned Shirts
  if (
    combined.includes('formal') ||
    combined.includes('button') ||
    combined.includes('dress shirt') ||
    combined.includes('oxford')
  ) {
    return (
      <svg
        viewBox="0 0 100 100"
        className={`${sizeStyles[size]} fill-none stroke-current stroke-[2.2] stroke-linecap-round stroke-linejoin-round ${className}`}
      >
        {/* Spread Collar */}
        <path d="M 34 22 L 44 32 L 50 24 L 56 32 L 66 22 Z" />
        {/* Center Placket */}
        <line x1="47" y1="32" x2="47" y2="82" />
        <line x1="53" y1="32" x2="53" y2="82" />
        {/* Buttons */}
        <circle cx="50" cy="38" r="1.2" fill="currentColor" />
        <circle cx="50" cy="48" r="1.2" fill="currentColor" />
        <circle cx="50" cy="58" r="1.2" fill="currentColor" />
        <circle cx="50" cy="68" r="1.2" fill="currentColor" />
        {/* Chest Pocket */}
        <path d="M 32 40 L 42 40 L 42 50 L 37 53 L 32 50 Z" strokeDasharray="1.5 1.5" />
        {/* Shoulders, Long Sleeves & Curved Hem */}
        <path d="M 34 22 L 18 30 L 10 68 L 18 70 L 26 38 L 26 80 Q 50 86 74 80 L 74 38 L 82 70 L 90 68 L 82 30 L 66 22" />
        {/* Cuffs */}
        <line x1="10" y1="64" x2="18" y2="66" />
        <line x1="82" y1="66" x2="90" y2="64" />
      </svg>
    );
  }

  // 4. Hoodie & Sweatshirt / Jacket
  if (
    combined.includes('hoodie') ||
    combined.includes('jacket') ||
    combined.includes('sweat') ||
    combined.includes('zipper') ||
    combined.includes('coat') ||
    combined.includes('blazer')
  ) {
    return (
      <svg
        viewBox="0 0 100 100"
        className={`${sizeStyles[size]} fill-none stroke-current stroke-[2.2] stroke-linecap-round stroke-linejoin-round ${className}`}
      >
        {/* Hood Contour */}
        <path d="M 38 28 Q 50 14 62 28" />
        <path d="M 32 26 Q 50 8 68 26" />
        {/* Drawstrings */}
        <line x1="44" y1="30" x2="43" y2="44" />
        <line x1="56" y1="30" x2="57" y2="44" />
        <circle cx="43" cy="45" r="1.2" fill="currentColor" />
        <circle cx="57" cy="45" r="1.2" fill="currentColor" />
        {/* Main Body */}
        <path d="M 32 26 L 16 34 L 10 70 L 20 72 L 26 40 L 26 82 L 74 82 L 74 40 L 80 72 L 90 70 L 84 34 L 68 26" />
        {/* Kangaroo Pocket */}
        <path d="M 36 60 L 40 54 L 60 54 L 64 60 L 64 76 L 36 76 Z" />
        {/* Ribbed Bottom & Cuffs */}
        <line x1="26" y1="76" x2="74" y2="76" />
        <line x1="10" y1="66" x2="20" y2="68" />
        <line x1="80" y1="68" x2="90" y2="66" />
      </svg>
    );
  }

  // 5. Traditional Kurta / Shalwar Kameez
  if (
    combined.includes('kurta') ||
    combined.includes('shalwar') ||
    combined.includes('kameez') ||
    combined.includes('ethnic') ||
    combined.includes('eastern')
  ) {
    return (
      <svg
        viewBox="0 0 100 100"
        className={`${sizeStyles[size]} fill-none stroke-current stroke-[2.2] stroke-linecap-round stroke-linejoin-round ${className}`}
      >
        {/* Mandarin Band Collar */}
        <path d="M 40 22 Q 50 26 60 22" />
        <path d="M 40 20 Q 50 24 60 20" />
        {/* Embroidered Placket */}
        <path d="M 47 24 L 47 48 L 53 48 L 53 24" />
        <circle cx="50" cy="30" r="1" fill="currentColor" />
        <circle cx="50" cy="38" r="1" fill="currentColor" />
        <circle cx="50" cy="44" r="1" fill="currentColor" />
        {/* Long Kurta Body with Side Slits */}
        <path d="M 40 22 L 20 30 L 14 66 L 22 68 L 28 38 L 26 60" />
        <path d="M 60 22 L 80 30 L 86 66 L 78 68 L 72 38 L 74 60" />
        {/* Lower body with side slits */}
        <path d="M 28 62 L 26 86 L 74 86 L 72 62" />
        {/* Chest Pocket Outline */}
        <path d="M 32 36 L 40 36 L 40 44 L 32 44 Z" strokeDasharray="1 1" />
      </svg>
    );
  }

  // 6. Shoes & Sneakers
  if (
    combined.includes('shoe') ||
    combined.includes('sneaker') ||
    combined.includes('boot') ||
    combined.includes('slipper') ||
    combined.includes('loafer') ||
    combined.includes('footwear')
  ) {
    return (
      <svg
        viewBox="0 0 100 100"
        className={`${sizeStyles[size]} fill-none stroke-current stroke-[2.2] stroke-linecap-round stroke-linejoin-round ${className}`}
      >
        {/* Upper Silhouette */}
        <path d="M 20 44 Q 28 38 36 46 L 52 46 Q 66 54 84 62 L 84 74 L 16 74 L 16 56 Q 16 46 20 44 Z" />
        {/* Ankle Collar */}
        <path d="M 20 44 Q 28 48 36 46" />
        {/* Laces */}
        <line x1="38" y1="48" x2="44" y2="52" />
        <line x1="42" y1="48" x2="48" y2="52" />
        <line x1="46" y1="48" x2="52" y2="52" />
        {/* Sole / Midsole */}
        <path d="M 14 74 L 86 74 Q 88 80 82 82 L 18 82 Q 12 80 14 74 Z" />
        {/* Tread Grooves */}
        <line x1="28" y1="78" x2="34" y2="78" />
        <line x1="42" y1="78" x2="48" y2="78" />
        <line x1="56" y1="78" x2="62" y2="78" />
        <line x1="70" y1="78" x2="76" y2="78" />
      </svg>
    );
  }

  // 7. Watch & Timepieces
  if (combined.includes('watch') || combined.includes('timepiece') || combined.includes('chrono')) {
    return (
      <svg
        viewBox="0 0 100 100"
        className={`${sizeStyles[size]} fill-none stroke-current stroke-[2.2] stroke-linecap-round stroke-linejoin-round ${className}`}
      >
        {/* Strap Top & Bottom */}
        <path d="M 38 14 L 62 14 L 60 30 L 40 30 Z" />
        <path d="M 40 70 L 60 70 L 62 86 L 38 86 Z" />
        {/* Strap Stitching / Links */}
        <line x1="42" y1="18" x2="58" y2="18" strokeDasharray="1.5 1.5" />
        <line x1="42" y1="24" x2="58" y2="24" strokeDasharray="1.5 1.5" />
        <line x1="42" y1="76" x2="58" y2="76" strokeDasharray="1.5 1.5" />
        <line x1="42" y1="82" x2="58" y2="82" strokeDasharray="1.5 1.5" />
        {/* Watch Case & Bezel */}
        <circle cx="50" cy="50" r="22" />
        <circle cx="50" cy="50" r="18" strokeDasharray="3 1.5" />
        {/* Crown Buttons */}
        <rect x="72" y="47" width="4" height="6" rx="1" fill="currentColor" />
        {/* Dial Hands */}
        <line x1="50" y1="50" x2="50" y2="38" strokeWidth="2.5" />
        <line x1="50" y1="50" x2="60" y2="50" strokeWidth="2.5" />
        <circle cx="50" cy="50" r="2" fill="currentColor" />
      </svg>
    );
  }

  // 8. Perfume & Fragrances
  if (
    combined.includes('perfume') ||
    combined.includes('fragrance') ||
    combined.includes('scent') ||
    combined.includes('attar') ||
    combined.includes('oud')
  ) {
    return (
      <svg
        viewBox="0 0 100 100"
        className={`${sizeStyles[size]} fill-none stroke-current stroke-[2.2] stroke-linecap-round stroke-linejoin-round ${className}`}
      >
        {/* Atomizer Spray Cap */}
        <rect x="42" y="16" width="16" height="14" rx="2" />
        <line x1="42" y1="23" x2="58" y2="23" />
        {/* Neck */}
        <rect x="45" y="30" width="10" height="6" fill="currentColor" />
        {/* Crystal Glass Bottle */}
        <path d="M 30 36 L 70 36 L 74 84 L 26 84 Z" />
        {/* Inner Liquid Level */}
        <path d="M 32 50 Q 50 54 68 50 L 70 80 L 30 80 Z" strokeDasharray="1.5 1.5" />
        {/* Label Badge */}
        <rect x="38" y="56" width="24" height="16" rx="2" />
        <line x1="42" y1="64" x2="58" y2="64" />
      </svg>
    );
  }

  // 9. Leather Belt
  if (combined.includes('belt')) {
    return (
      <svg
        viewBox="0 0 100 100"
        className={`${sizeStyles[size]} fill-none stroke-current stroke-[2.2] stroke-linecap-round stroke-linejoin-round ${className}`}
      >
        {/* Buckle */}
        <rect x="20" y="36" width="24" height="28" rx="4" strokeWidth="3" />
        <line x1="20" y1="50" x2="36" y2="50" strokeWidth="3" />
        {/* Belt Loop */}
        <rect x="48" y="38" width="6" height="24" rx="1" fill="currentColor" />
        {/* Belt Strap */}
        <path d="M 44 40 L 84 40 Q 88 40 88 50 Q 88 60 84 60 L 44 60" />
        {/* Pin Holes */}
        <circle cx="62" cy="50" r="1.5" fill="currentColor" />
        <circle cx="70" cy="50" r="1.5" fill="currentColor" />
        <circle cx="78" cy="50" r="1.5" fill="currentColor" />
        {/* Edge Stitching */}
        <line x1="56" y1="43" x2="82" y2="43" strokeDasharray="1.5 1.5" />
        <line x1="56" y1="57" x2="82" y2="57" strokeDasharray="1.5 1.5" />
      </svg>
    );
  }

  // 10. Leather Wallet
  if (combined.includes('wallet') || combined.includes('cardholder') || combined.includes('purse')) {
    return (
      <svg
        viewBox="0 0 100 100"
        className={`${sizeStyles[size]} fill-none stroke-current stroke-[2.2] stroke-linecap-round stroke-linejoin-round ${className}`}
      >
        {/* Outer Bifold Wallet Body */}
        <rect x="20" y="28" width="60" height="44" rx="6" />
        {/* Inner Card Slits */}
        <path d="M 28 42 L 50 42 Q 54 42 54 48" />
        <path d="M 28 50 L 50 50 Q 54 50 54 56" />
        {/* Metal Logo Plate */}
        <rect x="62" y="52" width="10" height="6" rx="1" fill="currentColor" />
        {/* Perimeter Stitching */}
        <rect x="23" y="31" width="54" height="38" rx="4" strokeDasharray="1.5 1.5" />
      </svg>
    );
  }

  // 11. Cap / Snapback / Hat
  if (combined.includes('cap') || combined.includes('hat') || combined.includes('snapback') || combined.includes('beanie')) {
    return (
      <svg
        viewBox="0 0 100 100"
        className={`${sizeStyles[size]} fill-none stroke-current stroke-[2.2] stroke-linecap-round stroke-linejoin-round ${className}`}
      >
        {/* Top Button */}
        <circle cx="50" cy="30" r="2" fill="currentColor" />
        {/* Crown Panels */}
        <path d="M 26 62 Q 24 34 50 30 Q 76 34 74 62 Z" />
        <line x1="50" y1="30" x2="50" y2="62" />
        <path d="M 50 30 Q 36 44 36 62" />
        <path d="M 50 30 Q 64 44 64 62" />
        {/* Eyelets */}
        <circle cx="42" cy="44" r="1.2" fill="currentColor" />
        <circle cx="58" cy="44" r="1.2" fill="currentColor" />
        {/* Curved Visor / Brim */}
        <path d="M 24 62 Q 50 72 88 58 Q 66 54 24 62 Z" fill="currentColor" fillOpacity="0.1" />
      </svg>
    );
  }

  // 12. Default: Crewneck T-Shirt / Aesthetic Fashion Garment
  return (
    <svg
      viewBox="0 0 100 100"
      className={`${sizeStyles[size]} fill-none stroke-current stroke-[2.2] stroke-linecap-round stroke-linejoin-round ${className}`}
    >
      {/* Crewneck Collar */}
      <path d="M 38 22 Q 50 28 62 22" />
      <path d="M 38 22 Q 50 18 62 22" />
      {/* Sleeves & Main Tee Silhouette */}
      <path d="M 38 22 L 20 30 L 12 42 L 22 46 L 28 38 L 28 80 L 72 80 L 72 38 L 78 46 L 88 42 L 80 30 L 62 22" />
      {/* Sleeve Hem Stitching */}
      <line x1="12" y1="42" x2="22" y2="46" strokeDasharray="1.5 1.5" />
      <line x1="78" y1="46" x2="88" y2="42" strokeDasharray="1.5 1.5" />
      {/* Bottom Hem */}
      <line x1="28" y1="76" x2="72" y2="76" strokeDasharray="1.5 1.5" />
      {/* Minimal Brand Accent Line */}
      <line x1="45" y1="42" x2="55" y2="42" />
    </svg>
  );
};
