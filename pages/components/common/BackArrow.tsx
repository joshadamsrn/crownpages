import React from 'react';

interface ArrowProps {
  size?: number;
  className?: string;
}

const BackArrow: React.FC<ArrowProps> = ({ size = 24, className = '' }) => (
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
    <polyline points="15 18 9 12 15 6" />
  </svg>
);

export default BackArrow; 