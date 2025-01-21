export const preprocessImageWithROI = async (file: File): Promise<File> => {
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

      // Define possible ROIs dynamically, here we are considering different sections of the image
      const ROIs = [
        { x: 0, y: 0, width: currentWidth / 2, height: currentHeight / 2 }, // top-left quarter
        { x: currentWidth / 2, y: 0, width: currentWidth / 2, height: currentHeight / 2 }, // top-right quarter
        { x: 0, y: currentHeight / 2, width: currentWidth / 2, height: currentHeight / 2 }, // bottom-left quarter
        { x: currentWidth / 2, y: currentHeight / 2, width: currentWidth / 2, height: currentHeight / 2 }, // bottom-right quarter
      ];

      const processAtScaleForROI = (roi: {x: number, y: number, width: number, height: number}): Promise<File | null> =>
        new Promise((innerResolve, innerReject) => {
          try {
            // Scale to new dimensions
            canvas.width = roi.width;
            canvas.height = roi.height;
            
            // Optional: Add padding for better QR detection (optional)
            ctx.fillStyle = 'white';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Apply image enhancement
            ctx.filter = 'contrast(1.5) brightness(1.2) grayscale(1)';
            ctx.drawImage(img, roi.x, roi.y, roi.width, roi.height, 0, 0, canvas.width, canvas.height);

            // Convert to Blob for further processing or QR detection
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

      // Loop to process dynamically at multiple scales for each ROI
      let processedFile = null;

      for (let i = 0; i < ROIs.length; i++) {
        const roi = ROIs[i];

        while (currentWidth >= MIN_DIMENSION && currentHeight >= MIN_DIMENSION) {
          const scaledFile = await processAtScaleForROI(roi);
          if (scaledFile) {
            processedFile = scaledFile;
            break;
          }

          // Resize for the next iteration if needed
          currentWidth = Math.floor(currentWidth * SCALING_FACTOR);
          currentHeight = Math.floor(currentHeight * SCALING_FACTOR);
        }

        if (processedFile) {
          // Successfully processed a file with a valid QR detected within an ROI
          break;
        }
      }

      if (processedFile) {
        resolve(processedFile);
      } else {
        reject(new Error('Failed to process image at any scale for the defined ROIs.'));
      }
    };

    img.onerror = () =>
      reject(new Error('Failed to load image. Ensure the file is valid and not corrupted.'));
    img.src = URL.createObjectURL(file);
  });
};
