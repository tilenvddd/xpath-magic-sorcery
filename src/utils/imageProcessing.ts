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
      // Define your Region of Interest (ROI)
      const ROI = { x: 100, y: 100, width: 800, height: 800 }; // Example ROI: top-left corner at (100,100), 800x800 pixels size

      let width = img.width;
      let height = img.height;

      // Calculate new dimensions while maintaining aspect ratio for full image size or within ROI bounds
      if (width > height) {
        if (width > ROI.width) { // Adjust width to ROI width if necessary
          height = Math.round((height * ROI.width) / width);
          width = ROI.width;
        }
      } else {
        if (height > ROI.height) { // Adjust height to ROI height if necessary
          width = Math.round((width * ROI.height) / height);
          height = ROI.height;
        }
      }
      const ROIs = [
  { x: 0, y: 0, width: 500, height: 500 },   // Top-left section
  { x: 500, y: 0, width: 500, height: 500 }, // Top-right section
  { x: 0, y: 500, width: 500, height: 500 }, // Bottom-left section
  { x: 500, y: 500, width: 500, height: 500 } // Bottom-right section
];

ROIs.forEach(roi => {
  // Apply similar logic per ROI, resizing and processing images accordingly
});


      // Set canvas dimensions
      canvas.width = width;
      canvas.height = height;

      // Apply image processing within the defined ROI area
      ctx.filter = 'contrast(1.2) brightness(1.1) grayscale(1)';
      
      // Draw only the image region of interest (crop the image based on the ROI)
      ctx.drawImage(img, ROI.x, ROI.y, ROI.width, ROI.height, 0, 0, width, height);

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
