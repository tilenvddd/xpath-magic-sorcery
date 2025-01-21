export const preprocessImage = async (file: File): Promise<File> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      reject(new Error('Could not get canvas context. Ensure the browser supports canvas.'));
      return;
    }

    img.onload = async () => {
      const MAX_DIMENSION = 2048; // Max allowable dimensions for large images
      const MIN_DIMENSION = 256; // Min allowable dimensions for dynamic resizing
      const SCALING_FACTOR = 0.8; // Downscale by 20% at each iteration
      
      let currentWidth = img.width;
      let currentHeight = img.height;

      const processAtScale = (): Promise<File | null> =>
        new Promise((innerResolve, innerReject) => {
          try {
            // Scale to new dimensions while keeping aspect ratio
            canvas.width = currentWidth;
            canvas.height = currentHeight;

            // Optional: Add padding for better QR detection
            ctx.fillStyle = 'white';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Apply image enhancements
            ctx.filter = 'contrast(1.5) brightness(1.2) grayscale(1)';
            ctx.drawImage(img, 0, 0, currentWidth, currentHeight);

            // Convert to Blob for QR library processing or return scaled image
            canvas.toBlob((blob) => {
              if (!blob) {
                innerResolve(null);
                return;
              }
              const scaledFile = new File([blob], file.name, {
                type: 'image/jpeg',
                lastModified: Date.now(),
              });
              innerResolve(scaledFile);
            }, 'image/jpeg', 0.9);
          } catch (e) {
            innerReject(e);
          }
        });

      // Loop to process dynamically at multiple scales
      while (currentWidth >= MIN_DIMENSION && currentHeight >= MIN_DIMENSION) {
        const scaledFile = await processAtScale();
        if (scaledFile) {
          // Successfully processed a file, return it
          resolve(scaledFile);
          return;
        }

        // Resize for the next iteration
        currentWidth = Math.floor(currentWidth * SCALING_FACTOR);
        currentHeight = Math.floor(currentHeight * SCALING_FACTOR);
      }

      // If no valid file detected at any size
      reject(new Error('Failed to process the image at any scale.'));
    };

    img.onerror = () =>
      reject(new Error('Failed to load image. Ensure the file is valid and not corrupted.'));
    img.src = URL.createObjectURL(file);
  });
};
