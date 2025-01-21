export const preprocessImage = async (file: File): Promise<File> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      reject(new Error('Could not get canvas context'));
      return;
    }

    img.onload = () => {
      // Set reasonable maximum dimensions
      const MAX_WIDTH = 1600;
      const MAX_HEIGHT = 1600;

      let width = img.width;
      let height = img.height;

      // Calculate new dimensions while maintaining aspect ratio
      if (width > height) {
        if (width > MAX_WIDTH) {
          height = Math.round((height * MAX_WIDTH) / width);
          width = MAX_WIDTH;
        }
      } else {
        if (height > MAX_HEIGHT) {
          width = Math.round((width * MAX_HEIGHT) / height);
          height = MAX_HEIGHT;
        }
      }

      // Set canvas dimensions
      canvas.width = width;
      canvas.height = height;

      // Apply minimal image processing to preserve QR code quality
      ctx.filter = 'contrast(1.1) brightness(1.05)';
      ctx.drawImage(img, 0, 0, width, height);

      // Convert canvas to blob with high quality
      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error('Could not create blob from canvas'));
          return;
        }
        // Create a new file from the blob
        const processedFile = new File([blob], file.name, {
          type: 'image/jpeg',
          lastModified: Date.now(),
        });
        resolve(processedFile);
      }, 'image/jpeg', 0.95);
    };

    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = URL.createObjectURL(file);
  });
};