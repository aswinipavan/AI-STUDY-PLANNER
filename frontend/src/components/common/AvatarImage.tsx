'use client';

import Image from 'next/image';
import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';

interface AvatarImageProps {
  /** Remote avatar URL (e.g. Google `lh3.googleusercontent.com` or an uploaded photo). */
  src?: string | null;
  alt: string;
  /** Rendered when there is no src, or when the image fails to load (rate-limited, deleted, offline). */
  fallback: ReactNode;
  /** Use next/image `fill` layout (parent must be positioned). Mutually exclusive with width/height. */
  fill?: boolean;
  width?: number;
  height?: number;
  className?: string;
  style?: CSSProperties;
}

/**
 * Avatar with a resilient fallback. Two problems this solves for third-party profile images:
 *
 *  1. Google's `lh3.googleusercontent.com` returns HTTP 429 / ERR_BLOCKED_BY_ORB when a `Referer`
 *     header is sent from an unrecognised origin. `referrerPolicy="no-referrer"` suppresses the
 *     header and lets the image load.
 *  2. If the image still fails for any reason, `onError` swaps in the caller's initials `fallback`
 *     instead of showing a broken image.
 *
 * `unoptimized` keeps the fetch on the client (direct to the CDN), so no `remotePatterns` config is
 * required and `referrerPolicy` actually applies to the real request.
 */
export default function AvatarImage({
  src,
  alt,
  fallback,
  fill,
  width,
  height,
  className,
  style,
}: AvatarImageProps) {
  const [failed, setFailed] = useState(false);

  // Reset the failed flag when the source changes (e.g. the user uploads a new avatar).
  useEffect(() => {
    setFailed(false);
  }, [src]);

  if (!src || failed) {
    return <>{fallback}</>;
  }

  return (
    <Image
      src={src}
      alt={alt}
      {...(fill ? { fill: true } : { width: width ?? 40, height: height ?? 40 })}
      className={className}
      style={style}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      unoptimized
    />
  );
}
