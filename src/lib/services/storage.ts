import { randomUUID } from 'crypto';

import { getSupabaseServiceClient } from '@/lib/supabase/service';

const DEFAULT_BUCKET = 'nmbli';

async function performUpload({
  key,
  data,
  contentType,
}: {
  key: string;
  data: Buffer;
  contentType: string;
}) {
  const bucket = process.env.SUPABASE_STORAGE_BUCKET || DEFAULT_BUCKET;
  const supabase = getSupabaseServiceClient();

  const { error } = await supabase.storage.from(bucket).upload(key, data, {
    contentType,
    upsert: false,
  });

  if (error) {
    throw new Error(`Failed to upload file: ${error.message}`);
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(bucket).getPublicUrl(key);

  return publicUrl;
}

export async function uploadFileToStorage(params: { file: File; pathPrefix: string }) {
  const { file, pathPrefix } = params;
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const extension = file.name.split('.').pop();
  const key = `${pathPrefix}/${randomUUID()}${extension ? `.${extension}` : ''}`;

  const publicUrl = await performUpload({
    key,
    data: buffer,
    contentType: file.type || 'application/octet-stream',
  });

  return {
    storagePath: key,
    url: publicUrl,
    mimeType: file.type || 'application/octet-stream',
    size: buffer.length,
    originalName: file.name,
  };
}

export async function uploadBufferToStorage(params: {
  buffer: Buffer;
  pathPrefix: string;
  fileName?: string;
  mimeType?: string;
}) {
  const { buffer, pathPrefix, fileName, mimeType } = params;
  const extension = fileName?.includes('.') ? fileName.split('.').pop() : undefined;
  const key = `${pathPrefix}/${randomUUID()}${extension ? `.${extension}` : ''}`;

  const publicUrl = await performUpload({
    key,
    data: buffer,
    contentType: mimeType || 'application/octet-stream',
  });

  return {
    storagePath: key,
    url: publicUrl,
    mimeType: mimeType || 'application/octet-stream',
    size: buffer.length,
    originalName: fileName || 'upload',
  };
}
