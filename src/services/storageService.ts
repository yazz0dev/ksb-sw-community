import {
  getStorage,
  ref as storageRefFb, // Renamed to avoid conflict with Vue's ref
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
} from 'firebase/storage';

const storage = getStorage();

/**
 * Uploads a file to Firebase Storage with progress tracking.
 * @param file The file to upload.
 * @param path The storage path where the file should be uploaded (e.g., 'profile-images/userId/filename.jpg').
 * @param onProgress Callback function to report upload progress (0-100).
 * @returns Promise resolving with the download URL of the uploaded file.
 */
export const uploadFileService = (
  file: File,
  path: string,
  onProgress: (progress: number) => void
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const fileRef = storageRefFb(storage, path);
    const uploadTask = uploadBytesResumable(fileRef, file);

    uploadTask.on(
      'state_changed',
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        onProgress(Math.round(progress));
      },
      (error) => {
        console.error('Upload failed:', error);
        reject(error);
      },
      async () => {
        try {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          resolve(downloadURL);
        } catch (error) {
          console.error('Failed to get download URL:', error);
          reject(error);
        }
      }
    );
  });
};

/**
 * Deletes a file from Firebase Storage using its download URL.
 * @param fileUrl The download URL of the file to delete.
 * @returns Promise that resolves when deletion is complete.
 */
export const deleteFileByUrlService = async (fileUrl: string): Promise<void> => {
  if (!fileUrl || !fileUrl.startsWith('https://firebasestorage.googleapis.com')) {
    console.warn('Invalid file URL provided for deletion:', fileUrl);
    // Optionally throw an error or return early if the URL is not a Firebase Storage URL
    // For now, let's attempt to create a ref, which might fail gracefully if URL is malformed.
  }
  try {
    const fileRef = storageRefFb(storage, fileUrl); // Firebase SDK can parse full URLs
    await deleteObject(fileRef);
  } catch (error: any) {
    // It's common for 'storage/object-not-found' to occur if deleting an already deleted/non-existent file.
    // Depending on requirements, you might want to suppress this specific error.
    if (error.code === 'storage/object-not-found') {
      console.warn('Attempted to delete a file that does not exist:', fileUrl, error.message);
      // Resolve promise successfully if not finding the object is acceptable for deletion attempt.
      return Promise.resolve();
    }
    console.error('Failed to delete file by URL:', fileUrl, error);
    throw error; // Re-throw other errors
  }
}; 