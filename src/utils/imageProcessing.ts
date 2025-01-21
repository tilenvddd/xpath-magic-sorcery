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
      // Define the dimensions for the ROI centered in the image
      const ROI_WIDTH = 500;  // Set your desired center region width
      const ROI_HEIGHT = 500; // Set your desired center region height

      let width = img.width;
      let height = img.height;

      // Calculate the center of the image
      const x = Math.max(0, Math.floor((width - ROI_WIDTH) / 2));  // Center horizontally
      const y = Math.max(0, Math.floor((height - ROI_HEIGHT) / 2)); // Center vertically

      // Set reasonable maximum dimensions for scaling
      const MAX_WIDTH = 1024;
      const MAX_HEIGHT = 1024;

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

      // Apply image processing within the defined center ROI
      ctx.filter = 'contrast(1.2) brightness(1.1) grayscale(1)';

      // Draw only the image center region (crop the image based on the center ROI)
      ctx.drawImage(img, x, y, ROI_WIDTH, ROI_HEIGHT, 0, 0, width, height);

      // Convert canvas to blob
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
      }, 'image/jpeg', 0.9);
    };

    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = URL.createObjectURL(file);
  });
};
