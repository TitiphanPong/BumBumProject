'use client';

import { PlusOutlined } from '@ant-design/icons';
import { Button, Upload } from 'antd';
import type { Dispatch, SetStateAction } from 'react';
import { mediaItemFromCloudinary, type ClaimMediaItem } from '@/lib/claim-media';

type ClaimMediaUploadProps = {
  items: ClaimMediaItem[];
  setItems: Dispatch<SetStateAction<ClaimMediaItem[]>>;
  maxCount: number;
  videoMode: 'controls' | 'autoplay';
  customRemoveForAll?: boolean;
  onUploadError: (error: Error) => void;
};

export default function ClaimMediaUpload({
  items,
  setItems,
  maxCount,
  videoMode,
  customRemoveForAll = false,
  onUploadError,
}: ClaimMediaUploadProps) {
  return (
    <Upload
      name="file"
      listType="picture-card"
      accept="image/*,video/*"
      maxCount={maxCount}
      showUploadList={{ showRemoveIcon: true }}
      customRequest={async ({ file, onSuccess, onError }) => {
        try {
          const formData = new FormData();
          formData.append('file', file as Blob);
          formData.append('upload_preset', process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET!);

          const response = await fetch(
            `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/auto/upload`,
            { method: 'POST', body: formData }
          );
          const data = await response.json();
          if (!response.ok) throw new Error(data?.error?.message || 'Cloudinary upload failed');

          const item = mediaItemFromCloudinary(data, (file as File).name);
          setItems(previous => [...previous, item]);
          onSuccess?.(data, new XMLHttpRequest());
        } catch (error) {
          const uploadError = error instanceof Error ? error : new Error(String(error));
          onUploadError(uploadError);
          onError?.(uploadError);
        }
      }}
      fileList={items.map((item, index) => ({
        uid: String(index),
        name: item.name,
        status: 'done' as const,
        url: item.url,
        type:
          item.resourceType === 'video'
            ? `video/${item.format || 'mp4'}`
            : `image/${item.format || 'jpeg'}`,
      }))}
      itemRender={(originNode, file, _fileList, actions) => {
        const isVideo = file.type?.startsWith('video/');
        if (!isVideo && !customRemoveForAll) return originNode;

        const size = customRemoveForAll ? 100 : '100%';
        return (
          <div style={{ position: 'relative', width: size, height: size }}>
            {isVideo ? (
              <video
                src={file.url}
                autoPlay={videoMode === 'autoplay'}
                muted
                loop={videoMode === 'autoplay'}
                playsInline
                controls={videoMode === 'controls'}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  borderRadius: customRemoveForAll ? 8 : undefined,
                  display: 'block',
                  pointerEvents: videoMode === 'autoplay' ? 'none' : undefined,
                }}
              />
            ) : (
              originNode
            )}
            <Button
              type={customRemoveForAll ? 'primary' : 'default'}
              danger
              size="small"
              style={{
                position: 'absolute',
                right: customRemoveForAll ? 7 : 4,
                top: customRemoveForAll ? 7 : 4,
                zIndex: 1,
              }}
              onClick={() => actions.remove()}>
              ×
            </Button>
          </div>
        );
      }}
      onRemove={file => {
        const fileUrl = file.url || file.thumbUrl || file.response?.secure_url;
        setItems(previous => previous.filter(item => item.url !== fileUrl));
        return true;
      }}>
      {items.length < maxCount && (
        <div>
          <PlusOutlined />
          <div style={{ marginTop: 8 }}>อัปโหลด</div>
        </div>
      )}
    </Upload>
  );
}
