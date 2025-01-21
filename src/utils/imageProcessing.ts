export const preprocessImage = async (file: File): Promise<File> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      reject(new Error('Could not get canvas context. Ensure the browser supports canvas.'));
      return;
    }

    img.onload = () => {
      const MAX_DIMENSION = 2048; // Allow larger images for small QR codes
      const MIN_DIMENSION = 256; // Ensure the image doesn't get too small

      let width = img.width;
      let height = img.height;

      // Calculate new dimensions while maintaining aspect ratio
      if (width > height) {
        if (width > MAX_DIMENSION) {
          height = Math.round((height * MAX_DIMENSION) / width);
          width = MAX_DIMENSION;
        }
      } else {
        if (height > MAX_DIMENSION) {
          width = Math.round((width * MAX_DIMENSION) / height);
          height = MAX_DIMENSION;
        }
      }

      // Ensure dimensions are above the minimum size
      width = Math.max(width, MIN_DIMENSION);
      height = Math.max(height, MIN_DIMENSION);

      // Add padding around the image
      const padding = 10;
      canvas.width = width + padding * 2;
      canvas.height = height + padding * 2;
      
      // Apply padding
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Apply preprocessing filters
      ctx.filter = 'contrast(1.5) brightness(1.2) grayscale(1)';
      ctx.drawImage(img, padding, padding, width, height);

      // Convert the canvas content to a blob
      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error('Could not create blob from canvas.'));
          return;
        }
        const processedFile = new File([blob], file.name, {
          type: 'image/jpeg',
          lastModified: Date.now(),
        });
        resolve(processedFile);
      }, 'image/jpeg', 0.9);
    };

    img.onerror = () => reject(new Error('Failed to load image. Ensure the file is valid and not corrupted.'));
    img.src = URL.createObjectURL(file);
  });
};
