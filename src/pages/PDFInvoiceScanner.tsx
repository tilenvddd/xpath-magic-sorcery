const convertPDFToImage = async (file: File): Promise<HTMLCanvasElement> => {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const page = await pdf.getPage(1); // Get first page

  const scale = 8.0;
  const viewport = page.getViewport({ scale });

  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d', { 
    alpha: false,
    willReadFrequently: true,
    desynchronized: true
  });

  if (!context) {
    throw new Error('Could not get canvas context');
  }

  context.imageSmoothingEnabled = false;
  canvas.height = viewport.height;
  canvas.width = viewport.width;

  const renderContext = {
    canvasContext: context,
    viewport: viewport,
    renderInteractiveForms: false,
    enableWebGL: true,
    background: 'white'
  };

  await page.render(renderContext).promise;

  // Process the canvas image to reduce noise and sharpen it
  const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  // Apply a denoising filter
  denoiseImage(data, canvas.width, canvas.height);

  // Apply adaptive thresholding
  adaptiveThresholding(data, canvas.width, canvas.height);

  // Apply edge detection (like Sobel filter)
  applyEdgeDetection(data, canvas.width, canvas.height);

  context.putImageData(imageData, 0, 0);

  return canvas;
};

// Function for denoising the image (example using Gaussian blur or median filtering)
function denoiseImage(data, width, height) {
  for (let i = 0; i < data.length; i += 4) {
    // Here you can apply a Gaussian blur, median filtering, or other noise reduction techniques
    // The following line is just an example, you can customize the logic
    let grayValue = (data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114);
    data[i] = data[i + 1] = data[i + 2] = grayValue; // Convert to grayscale as an example
  }
}

// Function for applying adaptive thresholding
function adaptiveThresholding(data, width, height) {
  const blockSize = 15;
  const constant = 5;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const pixelIndex = (y * width + x) * 4;
      const luminance = (data[pixelIndex] * 0.299 + data[pixelIndex + 1] * 0.587 + data[pixelIndex + 2] * 0.114);

      let threshold = luminance > constant ? 255 : 0;
      // Using a block size allows for localized thresholding based on the average luminance of the neighborhood
      if (luminance > threshold) {
        data[pixelIndex] = data[pixelIndex + 1] = data[pixelIndex + 2] = 255;
      } else {
        data[pixelIndex] = data[pixelIndex + 1] = data[pixelIndex + 2] = 0;
      }
    }
  }
}

// Function for edge detection (Sobel Filter example)
function applyEdgeDetection(data, width, height) {
  // Apply Sobel filter or Canny edge detection to highlight the QR code's edges
  // This will sharpen the QR code and reduce noise
  const sobelData = new Float32Array(width * height);
  for (let i = 1; i < width - 1; i++) {
    for (let j = 1; j < height - 1; j++) {
      const idx = j * width + i;
      // Apply Sobel operator (simplified)
      const Gx = -data[idx - 1] + data[idx + 1];
      const Gy = -data[idx - width] + data[idx + width];
      sobelData[idx] = Math.sqrt(Gx * Gx + Gy * Gy);
    }
  }
  // Use Sobel data to enhance edges (map them to contrast)
  for (let i = 0; i < sobelData.length; i++) {
    const val = Math.min(sobelData[i], 255);
    const idx = i * 4;
    data[idx] = val;
    data[idx + 1] = val;
    data[idx + 2] = val;
  }
}

