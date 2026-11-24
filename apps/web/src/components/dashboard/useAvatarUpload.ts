import { useEffect, useRef, useState, type ChangeEvent, type RefObject } from 'react';
import { validateAvatarFile } from '../../lib/dashboard';

/** Validates, previews and uploads a profile photo while keeping the local preview in sync. */
export function useAvatarUpload(onUpload: (file: File) => Promise<void>): {
  inputRef: RefObject<HTMLInputElement>;
  previewUrl: string | null;
  error: string | null;
  uploading: boolean;
  openPicker: () => void;
  handleChange: (event: ChangeEvent<HTMLInputElement>) => Promise<void>;
} {
  const inputRef = useRef<HTMLInputElement>(null);
  const previewRef = useRef<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => () => {
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
  }, []);

  function openPicker(): void {
    inputRef.current?.click();
  }

  async function handleChange(event: ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = event.target.files?.[0] ?? null;
    event.target.value = '';
    if (!file) return;

    const problem = validateAvatarFile(file);
    if (problem) {
      setError(problem);
      return;
    }

    setError(null);
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    const localPreview = URL.createObjectURL(file);
    previewRef.current = localPreview;
    setPreviewUrl(localPreview);
    setUploading(true);
    try {
      await onUpload(file);
      URL.revokeObjectURL(localPreview);
      if (previewRef.current === localPreview) previewRef.current = null;
      setPreviewUrl(null);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'Upload failed. Try again.');
    } finally {
      setUploading(false);
    }
  }

  return { inputRef, previewUrl, error, uploading, openPicker, handleChange };
}
