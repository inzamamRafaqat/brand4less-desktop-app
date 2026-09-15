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

  // 1. GLASSES & SUNGLASSES
  if (
    combined.includes('glass') ||
    combined.includes('sunglass') ||
    combined.includes('aviator') ||
    combined.includes('wayfarer') ||
    combined.includes('spectacle') ||
    combined.includes('eyewear')
  ) {
    return (
      <svg
        viewBox="0 0 100 100"
        className={`${sizeStyles[size]} fill-none stroke-current stroke-[2.2] stroke-linecap-round stroke-linejoin-round ${className}`}
      >
        <rect x="14" y="38" width="30" height="24" rx="7" strokeWidth="2.5" />
        <rect x="56" y="38" width="30" height="24" rx="7" strokeWidth="2.5" />
        <path d="M 44 46 Q 50 42 56 46" strokeWidth="2.5" />
        <line x1="16" y1="38" x2="42" y2="38" strokeWidth="2" />
        <line x1="58" y1="38" x2="84" y2="38" strokeWidth="2" />
        <path d="M 14 42 L 6 36 Q 4 34 8 32" strokeWidth="2.2" />
        <path d="M 86 42 L 94 36 Q 96 34 92 32" strokeWidth="2.2" />
        <line x1="20" y1="44" x2="26" y2="56" strokeWidth="1.5" strokeOpacity="0.4" />
        <line x1="62" y1="44" x2="68" y2="56" strokeWidth="1.5" strokeOpacity="0.4" />
      </svg>
    );
  }

  // 2. LEATHER BELT & BUCKLE
  if (combined.includes('belt') || combined.includes('buckle')) {
    return (
      <svg
        viewBox="0 0 100 100"
        className={`${sizeStyles[size]} fill-none stroke-current stroke-[2.2] stroke-linecap-round stroke-linejoin-round ${className}`}
      >
        <rect x="18" y="34" width="26" height="32" rx="4" strokeWidth="3" />
        <line x1="18" y1="50" x2="36" y2="50" strokeWidth="3" />
        <rect x="48" y="36" width="7" height="28" rx="1.5" fill="currentColor" fillOpacity="0.15" strokeWidth="2" />
        <path d="M 44 38 L 82 38 Q 88 38 88 50 Q 88 62 82 62 L 44 62" strokeWidth="2.5" />
        <circle cx="60" cy="50" r="1.5" fill="currentColor" />
        <circle cx="68" cy="50" r="1.5" fill="currentColor" />
        <circle cx="76" cy="50" r="1.5" fill="currentColor" />
        <line x1="55" y1="42" x2="80" y2="42" strokeDasharray="2 1.5" strokeWidth="1.5" />
        <line x1="55" y1="58" x2="80" y2="58" strokeDasharray="2 1.5" strokeWidth="1.5" />
      </svg>
    );
  }

  // 3. SLIPPERS / SLIDES / CHAPPAL
  if (
    combined.includes('slipper') ||
    combined.includes('slide') ||
    combined.includes('flip flop') ||
    combined.includes('chappal') ||
    combined.includes('sandal')
  ) {
    return (
      <svg
        viewBox="0 0 100 100"
        className={`${sizeStyles[size]} fill-none stroke-current stroke-[2.2] stroke-linecap-round stroke-linejoin-round ${className}`}
      >
        {/* Sleek Ergonomic Footbed Sole Profile */}
        <path d="M 16 62 Q 22 70 44 70 Q 72 70 82 64 Q 86 60 84 54 Q 80 48 68 48 Q 42 48 24 52 Q 14 54 16 62 Z" strokeWidth="2.4" />
        {/* Cushioned Dual-Layer Midsole Base */}
        <path d="M 16 62 L 16 70 Q 22 78 44 78 Q 72 78 82 72 L 82 64" strokeWidth="2.2" />
        {/* Soft Contoured Wide Slide Band Strap */}
        <path d="M 40 48 Q 50 30 68 34 Q 74 38 76 50" strokeWidth="3" fill="currentColor" fillOpacity="0.12" />
        {/* Modern Perforated Stripe Accent */}
        <path d="M 45 46 Q 53 35 66 38" strokeWidth="1.5" strokeDasharray="2 1.5" />
        {/* Grip Tread Outsole Grooves */}
        <line x1="26" y1="74" x2="32" y2="74" strokeWidth="2" />
        <line x1="42" y1="74" x2="48" y2="74" strokeWidth="2" />
        <line x1="58" y1="74" x2="64" y2="74" strokeWidth="2" />
      </svg>
    );
  }

  // 3.5 SHOES & SNEAKERS & FORMAL SHOES (High priority BEFORE any shirt checks)
  if (
    combined.includes('shoe') ||
    combined.includes('sneaker') ||
    combined.includes('derby') ||
    combined.includes('oxford') ||
    combined.includes('loafer') ||
    combined.includes('boot') ||
    combined.includes('moccasin') ||
    combined.includes('trainer')
  ) {
    return (
      <svg
        viewBox="0 0 100 100"
        className={`${sizeStyles[size]} fill-none stroke-current stroke-[2.2] stroke-linecap-round stroke-linejoin-round ${className}`}
      >
        {/* Upper Silhouette */}
        <path d="M 20 44 Q 28 38 36 46 L 52 46 Q 66 54 84 62 L 84 74 L 16 74 L 16 56 Q 16 46 20 44 Z" strokeWidth="2.4" />
        {/* Ankle Collar */}
        <path d="M 20 44 Q 28 48 36 46" />
        {/* Laces */}
        <line x1="38" y1="48" x2="44" y2="52" />
        <line x1="42" y1="48" x2="48" y2="52" />
        <line x1="46" y1="48" x2="52" y2="52" />
        {/* Sole / Midsole */}
        <path d="M 14 74 L 86 74 Q 88 80 82 82 L 18 82 Q 12 80 14 74 Z" strokeWidth="2.4" />
        {/* Tread Grooves */}
        <line x1="28" y1="78" x2="34" y2="78" />
        <line x1="42" y1="78" x2="48" y2="78" />
        <line x1="56" y1="78" x2="62" y2="78" />
        <line x1="70" y1="78" x2="76" y2="78" />
      </svg>
    );
  }

  // 4. SOCKS
  if (combined.includes('sock') || combined.includes('moza')) {
    return (
      <svg
        viewBox="0 0 100 100"
        className={`${sizeStyles[size]} fill-none stroke-current stroke-[2.2] stroke-linecap-round stroke-linejoin-round ${className}`}
      >
        <rect x="36" y="18" width="28" height="8" rx="2" strokeWidth="2.2" />
        <line x1="43" y1="18" x2="43" y2="26" strokeWidth="1.5" />
        <line x1="50" y1="18" x2="50" y2="26" strokeWidth="1.5" />
        <line x1="57" y1="18" x2="57" y2="26" strokeWidth="1.5" />
        <path d="M 36 26 L 36 58 Q 36 68 44 72 L 68 76 Q 78 77 80 68 Q 80 58 70 54 L 64 54 L 64 26" strokeWidth="2.4" />
        <path d="M 36 54 Q 38 66 48 64" strokeWidth="2" strokeDasharray="2 1.5" />
        <path d="M 72 58 Q 78 64 68 76" strokeWidth="2" strokeDasharray="2 1.5" />
      </svg>
    );
  }

  // 5. UNDERWEAR / BOXERS / BRIEFS
  if (
    combined.includes('underwear') ||
    combined.includes('boxer') ||
    combined.includes('brief')
  ) {
    return (
      <svg
        viewBox="0 0 100 100"
        className={`${sizeStyles[size]} fill-none stroke-current stroke-[2.2] stroke-linecap-round stroke-linejoin-round ${className}`}
      >
        <rect x="24" y="24" width="52" height="9" rx="2" strokeWidth="2.4" />
        <line x1="24" y1="28.5" x2="76" y2="28.5" strokeWidth="1" strokeDasharray="2 2" />
        <path d="M 24 33 L 20 68 L 42 68 L 46 54 L 54 54 L 58 68 L 80 68 L 76 33" strokeWidth="2.4" />
        <path d="M 44 33 Q 42 46 50 48 Q 58 46 56 33" strokeWidth="1.8" strokeDasharray="2 1.5" />
        <line x1="20" y1="64" x2="42" y2="64" strokeWidth="1.5" strokeDasharray="2 1.5" />
        <line x1="58" y1="64" x2="80" y2="64" strokeWidth="1.5" strokeDasharray="2 1.5" />
      </svg>
    );
  }

  // 6. VEST / SLEEVELESS UNDERSHIRT
  if (
    combined.includes('vest') ||
    combined.includes('sleeveless') ||
    combined.includes('tank top') ||
    combined.includes('banyan')
  ) {
    return (
      <svg
        viewBox="0 0 100 100"
        className={`${sizeStyles[size]} fill-none stroke-current stroke-[2.2] stroke-linecap-round stroke-linejoin-round ${className}`}
      >
        <path d="M 38 20 Q 50 36 62 20" strokeWidth="2.4" />
        <path d="M 38 20 L 30 20" strokeWidth="2.4" />
        <path d="M 62 20 L 70 20" strokeWidth="2.4" />
        <path d="M 30 20 Q 34 38 26 48 L 26 82 L 74 82 L 74 48 Q 66 38 70 20" strokeWidth="2.4" />
        <line x1="38" y1="44" x2="38" y2="78" strokeWidth="1.2" strokeOpacity="0.4" />
        <line x1="50" y1="42" x2="50" y2="78" strokeWidth="1.2" strokeOpacity="0.4" />
        <line x1="62" y1="44" x2="62" y2="78" strokeWidth="1.2" strokeOpacity="0.4" />
        <line x1="26" y1="78" x2="74" y2="78" strokeWidth="1.5" strokeDasharray="2 1.5" />
      </svg>
    );
  }

  // 7. CASUAL SHIRT HALF SLEEVE
  if (
    combined.includes('half sleeve') ||
    combined.includes('half selve') ||
    (combined.includes('casual shirt') && combined.includes('half'))
  ) {
    return (
      <svg
        viewBox="0 0 100 100"
        className={`${sizeStyles[size]} fill-none stroke-current stroke-[2.2] stroke-linecap-round stroke-linejoin-round ${className}`}
      >
        {/* Camp / Cuban Open Notch Collar */}
        <path d="M 34 22 L 44 30 L 50 24 L 56 30 L 66 22 Z" strokeWidth="2.4" />
        {/* Front Button Placket */}
        <line x1="47" y1="30" x2="47" y2="80" strokeWidth="1.8" />
        <line x1="53" y1="30" x2="53" y2="80" strokeWidth="1.8" />
        <circle cx="50" cy="36" r="1.2" fill="currentColor" />
        <circle cx="50" cy="46" r="1.2" fill="currentColor" />
        <circle cx="50" cy="56" r="1.2" fill="currentColor" />
        <circle cx="50" cy="66" r="1.2" fill="currentColor" />
        {/* Chest Patch Pocket */}
        <path d="M 32 38 L 42 38 L 42 48 L 37 51 L 32 48 Z" strokeDasharray="1.5 1.5" />
        {/* Short Half-Sleeve Silhouette */}
        <path d="M 34 22 L 20 30 L 14 44 L 24 48 L 28 38 L 28 80 L 72 80 L 72 38 L 76 48 L 86 44 L 80 30 L 66 22" strokeWidth="2.2" />
        {/* Folded Sleeve Cuff Ribs */}
        <line x1="14" y1="44" x2="24" y2="48" strokeWidth="2" />
        <line x1="76" y1="48" x2="86" y2="44" strokeWidth="2" />
      </svg>
    );
  }

  // 8. CASUAL SHIRT (Full Sleeve / Checked / Bain Collar)
  if (
    combined.includes('casual shirt') ||
    combined.includes('bain')
  ) {
    return (
      <svg
        viewBox="0 0 100 100"
        className={`${sizeStyles[size]} fill-none stroke-current stroke-[2.2] stroke-linecap-round stroke-linejoin-round ${className}`}
      >
        {/* Casual Button-Down Collar with Stand */}
        <path d="M 35 22 L 44 31 L 50 25 L 56 31 L 65 22 Z" strokeWidth="2.4" />
        {/* Center Placket */}
        <line x1="48" y1="31" x2="48" y2="80" strokeWidth="1.8" />
        <line x1="52" y1="31" x2="52" y2="80" strokeWidth="1.8" />
        <circle cx="50" cy="37" r="1.2" fill="currentColor" />
        <circle cx="50" cy="47" r="1.2" fill="currentColor" />
        <circle cx="50" cy="57" r="1.2" fill="currentColor" />
        <circle cx="50" cy="67" r="1.2" fill="currentColor" />
        {/* Dual Flap Utility Pockets */}
        <path d="M 30 38 L 40 38 L 40 48 L 35 51 L 30 48 Z" strokeWidth="1.8" />
        <path d="M 60 38 L 70 38 L 70 48 L 65 51 L 60 48 Z" strokeWidth="1.8" />
        {/* Long Sleeves with Casual Curved Hem */}
        <path d="M 35 22 L 18 30 L 10 68 L 18 70 L 26 38 L 26 80 Q 50 85 74 80 L 74 38 L 82 70 L 90 68 L 82 30 L 65 22" strokeWidth="2.2" />
        <line x1="10" y1="64" x2="18" y2="66" strokeWidth="2" />
        <line x1="82" y1="66" x2="90" y2="64" strokeWidth="2" />
      </svg>
    );
  }

  // 9. DRESS SHIRT (Formal Stiff Spread Collar, Single Chest Pocket)
  if (
    combined.includes('dress shirt') ||
    (combined.includes('shirt') && combined.includes('formal'))
  ) {
    return (
      <svg
        viewBox="0 0 100 100"
        className={`${sizeStyles[size]} fill-none stroke-current stroke-[2.2] stroke-linecap-round stroke-linejoin-round ${className}`}
      >
        {/* Stiff Formal Spread Collar */}
        <path d="M 33 21 L 44 32 L 50 24 L 56 32 L 67 21 Z" strokeWidth="2.4" />
        {/* Placket */}
        <line x1="47" y1="32" x2="47" y2="82" strokeWidth="1.8" />
        <line x1="53" y1="32" x2="53" y2="82" strokeWidth="1.8" />
        <circle cx="50" cy="38" r="1.2" fill="currentColor" />
        <circle cx="50" cy="48" r="1.2" fill="currentColor" />
        <circle cx="50" cy="58" r="1.2" fill="currentColor" />
        <circle cx="50" cy="68" r="1.2" fill="currentColor" />
        {/* Single Left Chest Pocket */}
        <path d="M 32 40 L 42 40 L 42 50 L 37 53 L 32 50 Z" strokeDasharray="1.5 1.5" />
        {/* Body & Tailored French Cuffs */}
        <path d="M 33 21 L 18 30 L 10 68 L 18 70 L 26 38 L 26 80 Q 50 86 74 80 L 74 38 L 82 70 L 90 68 L 82 30 L 67 21" strokeWidth="2.2" />
        <line x1="10" y1="64" x2="18" y2="66" strokeWidth="2" />
        <line x1="82" y1="66" x2="90" y2="64" strokeWidth="2" />
      </svg>
    );
  }

  // 10. DENIM JEANS (Rivets, Coin Pocket, Scoop Pockets, Chain Stitch Hem)
  if (
    combined.includes('jean') ||
    combined.includes('denim')
  ) {
    return (
      <svg
        viewBox="0 0 100 100"
        className={`${sizeStyles[size]} fill-none stroke-current stroke-[2.2] stroke-linecap-round stroke-linejoin-round ${className}`}
      >
        {/* Heavy Denim Waistband */}
        <path d="M 28 20 L 72 20 L 70 28 L 30 28 Z" strokeWidth="2.4" />
        {/* 5 Belt Loops */}
        <line x1="34" y1="20" x2="34" y2="28" strokeWidth="2" />
        <line x1="44" y1="20" x2="44" y2="28" strokeWidth="2" />
        <line x1="50" y1="20" x2="50" y2="28" strokeWidth="2" />
        <line x1="56" y1="20" x2="56" y2="28" strokeWidth="2" />
        <line x1="66" y1="20" x2="66" y2="28" strokeWidth="2" />
        {/* Metal Button & Fly J-Stitch */}
        <circle cx="50" cy="24" r="1.8" fill="currentColor" />
        <path d="M 50 28 L 50 43 Q 54 46 58 42" strokeDasharray="1.5 1" strokeWidth="1.8" />
        {/* Curved Scoop Pockets */}
        <path d="M 30 28 Q 40 30 42 42" strokeWidth="2" />
        <path d="M 70 28 Q 60 30 58 42" strokeWidth="2" />
        {/* Coin Pocket with Rivet */}
        <path d="M 34 31 Q 38 32 39 37" strokeDasharray="1.5 1" />
        <circle cx="35" cy="31" r="1" fill="currentColor" />
        {/* Straight / Baggy Inseam & Outseam */}
        <path d="M 30 28 L 22 84 L 38 84 L 50 48 L 62 84 L 78 84 L 70 28" strokeWidth="2.5" />
        {/* Double Chain Stitch Hem */}
        <line x1="22" y1="80" x2="38" y2="80" strokeDasharray="1.5 1.5" />
        <line x1="62" y1="80" x2="78" y2="80" strokeDasharray="1.5 1.5" />
      </svg>
    );
  }

  // 11. DRESS PANT & COTTON PANT (Sharp Center Creases, Slanted Slash Pockets)
  if (
    combined.includes('pant') ||
    combined.includes('chino')
  ) {
    return (
      <svg
        viewBox="0 0 100 100"
        className={`${sizeStyles[size]} fill-none stroke-current stroke-[2.2] stroke-linecap-round stroke-linejoin-round ${className}`}
      >
        {/* Tailored Dress Waistband */}
        <path d="M 27 20 L 73 20 L 71 27 L 29 27 Z" strokeWidth="2.2" />
        <line x1="38" y1="20" x2="38" y2="27" strokeWidth="1.5" />
        <line x1="62" y1="20" x2="62" y2="27" strokeWidth="1.5" />
        {/* Formal Slanted Slash Pockets */}
        <line x1="31" y1="27" x2="38" y2="40" strokeWidth="2" />
        <line x1="69" y1="27" x2="62" y2="40" strokeWidth="2" />
        {/* Tailored Straight Legs */}
        <path d="M 29 27 L 24 84 L 38 84 L 50 46 L 62 84 L 76 84 L 71 27" strokeWidth="2.2" />
        {/* Pressed Formal Center Crease Lines */}
        <line x1="31" y1="32" x2="31" y2="82" strokeWidth="1.2" strokeDasharray="3 2" strokeOpacity="0.5" />
        <line x1="69" y1="32" x2="69" y2="82" strokeWidth="1.2" strokeDasharray="3 2" strokeOpacity="0.5" />
        {/* Blind Hem Stitch */}
        <line x1="24" y1="81" x2="38" y2="81" strokeWidth="1" />
        <line x1="62" y1="81" x2="76" y2="81" strokeWidth="1" />
      </svg>
    );
  }

  // 12. COTTON TROUSER / 6-POCKET / TRACK TROUSER (Cargo Flaps, Elastic Cuffs & Drawstring)
  if (
    combined.includes('trouser') ||
    combined.includes('6pocket')
  ) {
    return (
      <svg
        viewBox="0 0 100 100"
        className={`${sizeStyles[size]} fill-none stroke-current stroke-[2.2] stroke-linecap-round stroke-linejoin-round ${className}`}
      >
        {/* Elastic Drawstring Waistband */}
        <path d="M 28 20 L 72 20 L 70 28 L 30 28 Z" strokeWidth="2.2" />
        <line x1="30" y1="24" x2="70" y2="24" strokeDasharray="1 1" />
        <path d="M 48 26 Q 46 34 44 38" strokeWidth="1.5" />
        <path d="M 52 26 Q 54 34 56 38" strokeWidth="1.5" />
        {/* Distinctive Cargo Side Flap Pockets */}
        <rect x="18" y="48" width="8" height="14" rx="1.5" strokeWidth="1.8" />
        <rect x="74" y="48" width="8" height="14" rx="1.5" strokeWidth="1.8" />
        {/* Trouser Legs with Elastic Ankle Ribbing */}
        <path d="M 30 28 L 22 82 L 36 82 L 50 48 L 64 82 L 78 82 L 70 28" strokeWidth="2.2" />
        <rect x="22" y="82" width="14" height="4" rx="1" />
        <rect x="64" y="82" width="14" height="4" rx="1" />
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
