import { imageSrcSet, imageUrl } from '@/lib/media';
import type { Media } from '@/lib/types';

interface Props {
  media: Media;
  alt: string;
  sizes: string;
  /** width / height. When set, the image is cropped (smart gravity) to this ratio. */
  aspect?: number;
  priority?: boolean;
  className?: string;
  max?: number;
}

/**
 * Responsive Cloudinary image. Plain <img> with srcset so the browser picks
 * the smallest adequate file; Cloudinary negotiates AVIF/WebP and quality.
 */
export function CldImage({ media, alt, sizes, aspect, priority, className, max = 2400 }: Props) {
  const crop = aspect ? 'fill' : 'limit';
  const width = Math.min(1280, media.width);
  const height = aspect ? Math.round(width / aspect) : Math.round((media.height / media.width) * width);
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={imageUrl(media, { width, height: aspect ? height : undefined, crop })}
      srcSet={imageSrcSet(media, { aspect, crop, max })}
      sizes={sizes}
      width={width}
      height={height}
      alt={alt}
      loading={priority ? 'eager' : 'lazy'}
      fetchPriority={priority ? 'high' : 'auto'}
      decoding="async"
      className={className}
    />
  );
}
