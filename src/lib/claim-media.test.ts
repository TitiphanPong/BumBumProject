import { describe, expect, it } from 'vitest';
import { isVideoUrl, mediaItemFromCloudinary, toTelegramMediaUrl } from './claim-media';

describe('claim media', () => {
  it('detects Cloudinary and legacy video URLs', () => {
    expect(isVideoUrl('https://res.cloudinary.com/demo/video/upload/v1/clip.webm')).toBe(true);
    expect(isVideoUrl('https://example.com/clip.mp4?x=1')).toBe(true);
    expect(isVideoUrl('https://res.cloudinary.com/demo/image/upload/v1/photo.jpg')).toBe(false);
  });

  it('creates an MP4 Cloudinary delivery URL for Telegram', () => {
    expect(toTelegramMediaUrl('https://res.cloudinary.com/demo/video/upload/v1/clip.webm')).toBe(
      'https://res.cloudinary.com/demo/video/upload/f_mp4/v1/clip.mp4'
    );
  });

  it('keeps upload metadata', () => {
    expect(
      mediaItemFromCloudinary(
        {
          secure_url: 'https://res.cloudinary.com/demo/video/upload/v1/clip.mov',
          resource_type: 'video',
          format: 'mov',
          original_filename: 'claim-clip',
        },
        'fallback.mov'
      )
    ).toEqual({
      url: 'https://res.cloudinary.com/demo/video/upload/v1/clip.mov',
      name: 'claim-clip.mov',
      resourceType: 'video',
      format: 'mov',
    });
  });
});
