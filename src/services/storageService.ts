import { Cloudinary } from '@cloudinary/url-gen';
import { fill } from '@cloudinary/url-gen/actions/resize';
import { quality } from '@cloudinary/url-gen/actions/delivery';
import { format } from '@cloudinary/url-gen/actions/delivery';

// Initialize Cloudinary instance
const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

if (!cloudName || !uploadPreset) {
  console.error('Cloudinary configuration is missing');
}

const cld = new Cloudinary({
  cloud: {
    cloudName: cloudName
  }
});

/**
 * Upload a file to Cloudinary using the Vue.js SDK
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
  if (!cloudName || !uploadPreset) {
    throw new Error('Cloudinary configuration is missing');
  }

  try {
    // Convert to JPEG if needed to ensure compatibility
    const fileToUpload = await convertToJpegIfNeeded(file, 0.85);
    
    return new Promise((resolve, reject) => {
      const formData = new FormData();
      formData.append('file', fileToUpload);
      formData.append('upload_preset', uploadPreset);
      formData.append('public_id', `profile-pictures/${fileName}`);
      formData.append('folder', 'profile-pictures');
      formData.append('tags', 'profile,user-upload,ksb-community');

      const xhr = new XMLHttpRequest();
      
      if (onProgress) {
        xhr.upload.addEventListener('progress', (evt) => {
          if (evt.lengthComputable) {
            const progress = Math.round((evt.loaded * 100) / evt.total);
            onProgress(progress);
          }
        });
      }

      xhr.onload = function() {
        if (xhr.status === 200) {
          try {
            const response = JSON.parse(xhr.responseText);
            console.log('Cloudinary upload response:', {
              secure_url: response.secure_url,
              public_id: response.public_id,
              format: response.format,
              bytes: response.bytes
            });
            
            if (response.secure_url) {
              resolve(response.secure_url);
            } else {
              reject(new Error('Upload failed - no secure URL returned'));
            }
          } catch (parseError) {
            console.error('Parse error:', parseError);
            reject(new Error('Upload failed - invalid response format'));
          }
        } else {
          console.error('Upload failed with status:', xhr.status, xhr.responseText);
          // Parse error response for better error messages
          try {
            const errorResponse = JSON.parse(xhr.responseText);
            const errorMessage = errorResponse.error?.message || `HTTP ${xhr.status}`;
            reject(new Error(`Upload failed: ${errorMessage}`));
          } catch {
            reject(new Error(`Upload failed with status ${xhr.status}: ${xhr.responseText || 'Unknown error'}`));
          }
        }
      };

      xhr.onerror = function() {
        console.error('Network error during upload');
        reject(new Error('Upload failed due to network error'));
      };

      xhr.open('POST', `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`);
      xhr.send(formData);
    });
  } catch (conversionError) {
    throw new Error(`Failed to prepare image for upload: ${conversionError instanceof Error ? conversionError.message : 'Unknown error'}`);
  }
}

/**
 * Delete a file from Cloudinary by URL using the SDK
 * @param fileUrl The URL of the file to delete
 */
export async function deleteFileByUrlService(fileUrl: string): Promise<void> {
  try {
    const publicId = extractPublicIdFromUrl(fileUrl);
    if (!publicId) {
      console.warn('Could not extract public ID from URL:', fileUrl);
      return;
    }

    // Note: File deletion still requires server-side implementation
    // The SDK doesn't provide client-side deletion for security reasons
    console.warn('File deletion should be handled server-side for security. Public ID:', publicId);
    
  } catch (error) {
    console.error('Error deleting file:', error);
    throw error;
  }
}

/**
 * Extract public ID from Cloudinary URL with proper path handling
 * @param url Cloudinary file URL
 * @returns Public ID or null if not found
 */
function extractPublicIdFromUrl(url: string): string | null {
  try {
    if (!url.includes('cloudinary.com')) {
      return null;
    }

    // Parse the URL to extract components
    const urlObj = new URL(url);
    const pathSegments = urlObj.pathname.split('/').filter(segment => segment.length > 0);
    
    // Find the upload segment index
    const uploadIndex = pathSegments.findIndex(segment => segment === 'upload');
    if (uploadIndex === -1) return null;
    
    // Public ID starts after upload and any transformations
    let publicIdStartIndex = uploadIndex + 1;
    
    // Skip transformation parameters (they start with letters like 'w_', 'h_', 'c_', etc.)
    while (publicIdStartIndex < pathSegments.length) {
      const segment = pathSegments[publicIdStartIndex];
      if (!segment || !/^[a-z]_/.test(segment)) {
        break;
      }
      publicIdStartIndex++;
    }
    
    // Skip version if present (starts with 'v' followed by numbers)
    if (publicIdStartIndex < pathSegments.length) {
      const versionSegment = pathSegments[publicIdStartIndex];
      if (versionSegment && /^v\d+$/.test(versionSegment)) {
        publicIdStartIndex++;
      }
    }
    
    // Get remaining segments as public ID
    const publicIdSegments = pathSegments.slice(publicIdStartIndex);
    if (publicIdSegments.length === 0) return null;
    
    // Join segments and remove file extension from last segment
    const lastSegment = publicIdSegments[publicIdSegments.length - 1];
    if (!lastSegment) return null; // Add null check
    
    const nameWithoutExtension = lastSegment.split('.')[0];
    if (!nameWithoutExtension) return null; // Add null check
    
    publicIdSegments[publicIdSegments.length - 1] = nameWithoutExtension;
    
    return publicIdSegments.join('/');
  } catch (error) {
    console.error('Error extracting public ID from URL:', error);
    return null;
  }
}

/**
 * Get optimized image URL using Cloudinary SDK transformations
 * @param url Original Cloudinary URL
 * @param transformations Cloudinary transformation parameters
 * @returns Optimized image URL
 */
export function getOptimizedImageUrl(
  url: string, 
  transformations: { width?: number; height?: number; quality?: number } = {}
): string {
  if (!url || !url.includes('cloudinary.com')) {
    return url;
  }

  try {
    const publicId = extractPublicIdFromUrl(url);
    if (!publicId) {
      return url;
    }

    const { width = 400, height = 400, quality: qualityValue = 80 } = transformations;
    
    // Use Cloudinary SDK to generate optimized URL with proper transformation methods
    const optimizedImage = cld.image(publicId)
      .resize(fill().width(width).height(height))
      .delivery(quality(qualityValue))
      .delivery(format('auto'));
    
    return optimizedImage.toURL();
  } catch (error) {
    console.error('Error generating optimized image URL:', error);
    return url; // Return original URL if optimization fails
  }
}

/**
 * Create Cloudinary instance for advanced usage
 * @returns Cloudinary instance
 */
export function getCloudinaryInstance(): Cloudinary {
  return cld;
}

/**
 * Convert image file to JPEG format if needed
 * @param file Original file
 * @param quality JPEG quality (0-1)
 * @returns Promise with converted file or original if already JPEG
 */
async function convertToJpegIfNeeded(file: File, quality: number = 0.85): Promise<File> {
  // If already JPEG, return as is
  if (file.type === 'image/jpeg' || file.type === 'image/jpg') {
    return file;
  }

  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      
      // Fill with white background for transparency support
      if (ctx) {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
      }

      canvas.toBlob(
        (blob) => {
          if (blob) {
            const convertedFile = new File(
              [blob], 
              file.name.replace(/\.[^/.]+$/, '.jpg'), 
              { type: 'image/jpeg' }
            );
            resolve(convertedFile);
          } else {
            reject(new Error('Failed to convert image to JPEG'));
          }
        },
        'image/jpeg',
        quality
      );
    };

    img.onerror = () => {
      reject(new Error('Failed to load image for conversion'));
    };

    img.src = URL.createObjectURL(file);
  });
}
