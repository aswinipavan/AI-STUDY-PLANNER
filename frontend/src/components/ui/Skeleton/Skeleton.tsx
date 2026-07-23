import React from 'react';
import styles from './Skeleton.module.css';

interface SkeletonProps {
  className?: string;
  width?: string | number;
  height?: string | number;
  borderRadius?: string;
}

export const Skeleton = ({ className = '', width, height, borderRadius }: SkeletonProps) => {
  const id = React.useId().replace(/:/g, '');
  const uid = `skel-${id}`;

  const w = typeof width === 'number' ? `${width}px` : width;
  const h = typeof height === 'number' ? `${height}px` : height;
  const r = typeof borderRadius === 'number' ? `${borderRadius}px` : borderRadius;

  return (
    <>
      {(w || h || r) && (
        <style>{`
          .${uid} {
            ${w ? `--skel-w: ${w};` : ''}
            ${h ? `--skel-h: ${h};` : ''}
            ${r ? `--skel-radius: ${r};` : ''}
          }
        `}</style>
      )}
      <div className={`${styles.skeleton} ${uid} ${className}`} />
    </>
  );
};
