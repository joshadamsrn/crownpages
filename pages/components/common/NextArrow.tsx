import React from 'react';

interface ArrowProps {
  size?: number;
  className?: string;
}

const NextArrow: React.FC<ArrowProps> = ({ size = 24, className = '' }) => (
  <svg
    width={size}
    height={size}
    fill="none"
    stroke="#38bdf8"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <polyline points="9 18 15 12 9 6" />
  </svg>
);

export default NextArrow; 