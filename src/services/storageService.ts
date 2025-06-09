import ImageKit from 'imagekit-javascript';

// Initialize ImageKit for client-side uploads
const imagekit = new ImageKit({
  publicKey: import.meta.env.VITE_IMAGEKIT_PUBLIC_KEY!,
  urlEndpoint: import.meta.env.VITE_IMAGEKIT_URL_ENDPOINT!,
});

/**
 * Upload a file to ImageKit using client-side upload
 * @param file The file to upload
 * @param fileName The name for the uploaded file
 * @param onProgress Progress callback function
 * @returns Promise with the download URL
 */
export async function uploadFileService(
  file: File,
  fileName: string,
  onProgress?: (progress: number) => void
): Promise<string> {
  return new Promise((resolve, reject) => {
    // Build upload options with optional progress callback
    const uploadOptions: any = {
      file: file,
      fileName: fileName,
      folder: '/profile-pictures/',
      tags: ['profile', 'user-upload'],
      useUniqueFileName: true,
      responseFields: ['url', 'fileId'],
    };

    // Add progress callback to upload options if provided
    if (onProgress) {
      uploadOptions.onUploadProgress = (evt: any) => {
        if (evt.total > 0) {
          const progress = Math.round((evt.loaded * 100) / evt.total);
          onProgress(progress);
        }
      };
    }

    imagekit.upload(
      uploadOptions,
      (error: any, result: any) => {
        if (error) {
          reject(new Error(error.message || 'Upload failed'));
        } else if (result && result.url) {
          resolve(result.url);
        } else {
          reject(new Error('Upload failed - no result or URL returned'));
        }
      }
    );
  });
}

/**
 * Delete a file from ImageKit by URL
 * @param fileUrl The URL of the file to delete
 */
export async function deleteFileByUrlService(fileUrl: string): Promise<void> {
  try {
    // Extract fileId from ImageKit URL
    const fileId = extractFileIdFromUrl(fileUrl);
    if (!fileId) {
      console.warn('Could not extract file ID from URL:', fileUrl);
      return;
    }

    // Note: Direct file deletion requires server-side implementation
    // This would typically be handled by your backend API
    console.warn('File deletion should be handled server-side for security. FileId:', fileId);
    
  } catch (error) {
    console.error('Error deleting file:', error);
    throw error;
  }
}

/**
 * Extract file ID from ImageKit URL
 * @param url ImageKit file URL
 * @returns File ID or null if not found
 */
function extractFileIdFromUrl(url: string): string | null {
  try {
    // ImageKit URLs typically contain the file ID in the path
    // This is a simplified extraction - adjust based on your URL structure
    const urlParts = url.split('/');
    const lastSegment = urlParts[urlParts.length - 1];

    if (typeof lastSegment !== 'string') {
      // This case should ideally not be reached if `url` is a valid string,
      // as split('/') on a string always yields a non-empty array of strings.
      return null;
    }

    // lastSegment is now confirmed to be a string.
    // The split('.')[0] operation on a string will always yield a string.
    const fileId = lastSegment.split('.')[0];
    return fileId || null; // Handle empty string case
  } catch (error) {
    console.error('Error extracting file ID from URL:', error);
    return null;
  }
}

/**
 * Get optimized image URL with transformations
 * @param url Original ImageKit URL
 * @param transformations ImageKit transformation parameters
 * @returns Optimized image URL
 */
export function getOptimizedImageUrl(
  url: string, 
  transformations: { width?: number; height?: number; quality?: number } = {}
): string {
  if (!url.includes('imagekit.io')) {
    return url; // Return original URL if not an ImageKit URL
  }

  const { width = 400, height = 400, quality = 80 } = transformations;
  
  // Add ImageKit transformations to URL
  const transformationString = `tr:w-${width},h-${height},q-${quality},c-maintain_ratio`;
  
  // Insert transformation parameters into ImageKit URL
  return url.replace(/\/([^\/]+\.(jpg|jpeg|png|webp|gif))$/i, `/${transformationString}/$1`);
}
