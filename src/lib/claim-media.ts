export type ClaimMediaType = 'image' | 'video';

export interface ClaimMediaItem {
  url: string;
  name: string;
  resourceType: ClaimMediaType;
  format?: string;
}

type CloudinaryUploadResult = {
  secure_url?: string;
  resource_type?: string;
  format?: string;
  original_filename?: string;
  error?: { message?: string };
};

const VIDEO_EXTENSIONS = /\.(mp4|mov|m4v|webm|avi|mkv)(?:$|[?#])/i;

export function isVideoUrl(url: string): boolean {
  return /\/video\/upload\//i.test(url) || VIDEO_EXTENSIONS.test(url);
}

export function toTelegramMediaUrl(url: string): string {
  if (!isVideoUrl(url) || !/res\.cloudinary\.com/i.test(url)) return url;

  const withMp4Transformation = url.includes('/upload/f_mp4/')
    ? url
    : url.replace('/upload/', '/upload/f_mp4/');

  return withMp4Transformation.replace(/\.[a-z0-9]+(?=([?#]|$))/i, '.mp4');
}

export function mediaItemFromUrl(url: string, index = 0): ClaimMediaItem {
  const resourceType: ClaimMediaType = isVideoUrl(url) ? 'video' : 'image';
  return {
    url,
    name: `${resourceType}-${index + 1}`,
    resourceType,
    format: url.match(/\.([a-z0-9]+)(?:[?#]|$)/i)?.[1]?.toLowerCase(),
  };
}

export function mediaItemFromCloudinary(
  result: CloudinaryUploadResult,
  fallbackName: string
): ClaimMediaItem {
  if (!result.secure_url) {
    throw new Error(result.error?.message || 'Cloudinary did not return a media URL');
  }
  if (result.resource_type !== 'image' && result.resource_type !== 'video') {
    throw new Error(`Unsupported Cloudinary resource type: ${result.resource_type || 'unknown'}`);
  }

  const extension = result.format ? `.${result.format}` : '';
  return {
    url: result.secure_url,
    name: result.original_filename ? `${result.original_filename}${extension}` : fallbackName,
    resourceType: result.resource_type,
    format: result.format,
  };
}
