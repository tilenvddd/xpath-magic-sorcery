// preprocessImage.ts
export const preprocessImage = async (file: File): Promise<File> => {
  const image = await createImageBitmap(file);

  // Create a canvas to manipulate the image
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Could not create canvas context');

  // Set canvas size to image dimensions
  canvas.width = image.width;
  canvas.height = image.height;

  // Draw the image onto the canvas
  context.drawImage(image, 0, 0);

  // Get image data from the canvas
  const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  // Apply custom image processing functions
  reduceNoise(data, canvas.width, canvas.height);
  enhanceContrast(data, canvas.width, canvas.height);
  applyEdgeDetection(data, canvas.width, canvas.height);
  adaptiveThreshold(data, canvas.width, canvas.height);

  // Write the processed data back to canvas
  context.putImageData(imageData, 0, 0);

  // Create a blob from the processed canvas for further use (e.g., for scanning)
  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      if (blob) {
        const processedFile = new File([blob], 'processed-image.jpg', { type: 'image/jpeg' });
        resolve(processedFile);
      } else {
        throw new Error('Failed to process canvas to blob');
      }
    }, 'image/jpeg');
  });
};

// Denoising via Gaussian blur (or median filter)
function reduceNoise(data: Uint8ClampedArray, width: number, height: number): void {
  const radius = 1; // For Gaussian, adjust for stronger blur
  const kernel = [
    [1 / 16, 2 / 16, 1 / 16],
    [2 / 16, 4 / 16, 2 / 16],
    [1 / 16, 2 / 16, 1 / 16]
  ];

  const tempData = new Uint8ClampedArray(data);
  for (let y = radius; y < height - radius; y++) {
    for (let x = radius; x < width - radius; x++) {
      const idx = (y * width + x) * 4;
      let red = 0, green = 0, blue = 0;

      for (let ky = -radius; ky <= radius; ky++) {
        for (let kx = -radius; kx <= radius; kx++) {
          const kIdx = ((y + ky) * width + (x + kx)) * 4;
          red += tempData[kIdx] * kernel[ky + radius][kx + radius];
          green += tempData[kIdx + 1] * kernel[ky + radius][kx + radius];
          blue += tempData[kIdx + 2] * kernel[ky + radius][kx + radius];
        }
      }

      data[idx] = red;
      data[idx + 1] = green;
      data[idx + 2] = blue;
    }
  }
}

// Enhance contrast and brightness (gamma correction)
function enhanceContrast(data: Uint8ClampedArray, width: number, height: number): void {
  const gamma = 1.2; // Adjust contrast based on this value

  for (let i = 0; i < data.length; i += 4) {
    // Normalize the RGB values to [0, 1]
    let r = data[i] / 255;
    let g = data[i + 1] / 255;
    let b = data[i + 2] / 255;

    // Apply gamma correction
    r = Math.pow(r, gamma);
    g = Math.pow(g, gamma);
    b = Math.pow(b, gamma);

    // Rescale back to [0, 255]
    data[i] = r * 255;
    data[i + 1] = g * 255;
    data[i + 2] = b * 255;
  }
}

// Edge detection (Sobel filter)
function applyEdgeDetection(data: Uint8ClampedArray, width: number, height: number): void {
  const sobelKernelX = [
    [-1, 0, 1],
    [-2, 0, 2],
    [-1, 0, 1]
  ];
  const sobelKernelY = [
    [-1, -2, -1],
    [0, 0, 0],
    [1, 2, 1]
  ];

  const tempData = new Uint8ClampedArray(data);
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      let gradX = 0, gradY = 0;

      for (let ky = -1; ky <= 1; ky++) {
        for (let kx = -1; kx <= 1; kx++) {
          const idx = ((y + ky) * width + (x + kx)) * 4;
          gradX += tempData[idx] * sobelKernelX[ky + 1][kx + 1];
          gradY += tempData[idx] * sobelKernelY[ky + 1][kx + 1];
        }
      }

      const magnitude = Math.sqrt(gradX * gradX + gradY * gradY);
      const idx = (y * width + x) * 4;

      data[idx] = magnitude > 255 ? 255 : magnitude;     // Red
      data[idx + 1] = magnitude > 255 ? 255 : magnitude; // Green
      data[idx + 2] = magnitude > 255 ? 255 : magnitude; // Blue
    }
  }
}

// Adaptive thresholding to make the image binary
function adaptiveThreshold(data: Uint8ClampedArray, width: number, height: number): void {
  const threshold = 160; // You can adjust this threshold
  
  for (let i = 0; i < data.length; i += 4) {
    const luminance = (data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114);
    const newValue = luminance > threshold ? 255 : 0;

    // Apply thresholding to each pixel
    data[i] = newValue;        // Red
    data[i + 1] = newValue;    // Green
    data[i + 2] = newValue;    // Blue
  }
}
