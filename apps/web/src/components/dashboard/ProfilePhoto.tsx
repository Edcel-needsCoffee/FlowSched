import { useEffect, useState } from 'react';
import { apiAssetUrl } from '../../lib/api';
import { initialsForName } from './AvatarImage';

/** Shared avatar rendering for the profile block and its enlarged photo dialog. */
export function ProfilePhoto({
  src,
  name,
  alt = '',
  className = '',
}: {
  src: string | null | undefined;
  name: string;
  alt?: string;
  className?: string;
}): JSX.Element {
  const [failedSource, setFailedSource] = useState<string | null>(null);
  const resolved = src?.startsWith('blob:') ? src : apiAssetUrl(src);
  const imageUrl = resolved ?? null;

  useEffect(() => {
    setFailedSource(null);
  }, [imageUrl]);

  const showImage = imageUrl !== null && imageUrl !== failedSource;
  return (
    <div
      aria-hidden={alt ? undefined : true}
      className={`relative flex items-center justify-center overflow-hidden bg-gradient-to-br from-emerald-300 via-brand-500 to-indigo-500 font-semibold text-white ${className}`}
    >
      {showImage ? (
        <img
          src={imageUrl ?? undefined}
          alt={alt}
          onError={() => setFailedSource(imageUrl)}
          referrerPolicy="no-referrer"
          className="h-full w-full object-cover"
          style={{ objectPosition: 'center top' }}
        />
      ) : (
        <span aria-hidden="true" className="text-[2.5rem] font-semibold tracking-wide">
          {initialsForName(name)}
        </span>
      )}
    </div>
  );
}
