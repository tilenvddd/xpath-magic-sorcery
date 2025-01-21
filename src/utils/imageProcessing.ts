import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';

// Initialize PDF.js worker
if (typeof window !== 'undefined') {
  const pdfjsWorker = new URL(
    'pdfjs-dist/build/pdf.worker.mjs',
    import.meta.url
  ).toString();
  
  GlobalWorkerOptions.workerSrc = pdfjsWorker;
}

async function convertPDFToImage(file: File): Promise<File> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await getDocument({ data: arrayBuffer }).promise;
  const page = await pdf.getPage(1); // Get first page
  
  const viewport = page.getViewport({ scale: 2.0 }); // Scale up for better quality
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  if (!ctx) {
    throw new Error('Could not get canvas context');
  }
  
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  
  await page.render({
    canvasContext: ctx,
    viewport: viewport
  }).promise;
  
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('Could not create blob from PDF'));
        return;
      }
      const imageFile = new File([blob], 'converted-pdf.png', {
        type: 'image/png',
        lastModified: Date.now(),
      });
      resolve(imageFile);
    }, 'image/png');
  });
}

export const preprocessImage = async (file: File): Promise<File> => {
  // If it's a PDF, convert it to an image first
  if (file.type === 'application/pdf') {
    file = await convertPDFToImage(file);
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      reject(new Error('Could not get canvas context'));
      return;
    }

    img.onload = () => {
      // Set higher maximum dimensions for better quality
      const MAX_WIDTH = 2048;
      const MAX_HEIGHT = 2048;

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

      // Create a temporary canvas for multi-step processing
      const tempCanvas = document.createElement('canvas');
      const tempCtx = tempCanvas.getContext('2d');
      
      if (!tempCtx) {
        reject(new Error('Could not get temporary canvas context'));
        return;
      }

      // Set canvas dimensions
      canvas.width = width;
      canvas.height = height;
      tempCanvas.width = width;
      tempCanvas.height = height;

      // Step 1: Draw original image
      tempCtx.drawImage(img, 0, 0, width, height);

      // Step 2: Apply sharpening
      const imageData = tempCtx.getImageData(0, 0, width, height);
      const sharpenKernel = [
        0, -1, 0,
        -1, 5, -1,
        0, -1, 0
      ];
      applyConvolution(imageData, sharpenKernel);
      tempCtx.putImageData(imageData, 0, 0);

      // Step 3: Apply final processing with enhanced settings
      ctx.filter = 'contrast(1.4) brightness(1.2) saturate(0) grayscale(1)';
      ctx.drawImage(tempCanvas, 0, 0);

      // Convert to binary image with adaptive thresholding
      const finalImageData = ctx.getImageData(0, 0, width, height);
      applyAdaptiveThreshold(finalImageData);
      ctx.putImageData(finalImageData, 0, 0);

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
      }, 'image/jpeg', 1.0); // Maximum quality
    };

    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = URL.createObjectURL(file);
  });
};

// Helper function to apply convolution (for sharpening)
function applyConvolution(imageData: ImageData, kernel: number[]) {
  const pixels = imageData.data;
  const width = imageData.width;
  const height = imageData.height;
  const output = new Uint8ClampedArray(pixels);

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      for (let c = 0; c < 3; c++) {
        const pixel = (y * width + x) * 4 + c;
        let sum = 0;
        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            const idx = ((y + ky) * width + (x + kx)) * 4 + c;
            sum += pixels[idx] * kernel[(ky + 1) * 3 + (kx + 1)];
          }
        }
        output[pixel] = sum;
      }
    }
  }
  imageData.data.set(output);
}

// Helper function to apply adaptive thresholding
function applyAdaptiveThreshold(imageData: ImageData, blockSize: number = 11, C: number = 2) {
  const pixels = imageData.data;
  const width = imageData.width;
  const height = imageData.height;
  
  // Convert to grayscale if not already
  for (let i = 0; i < pixels.length; i += 4) {
    const avg = (pixels[i] + pixels[i + 1] + pixels[i + 2]) / 3;
    pixels[i] = pixels[i + 1] = pixels[i + 2] = avg;
  }

  // Apply adaptive thresholding
  const halfBlock = Math.floor(blockSize / 2);
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let sum = 0;
      let count = 0;
      
      // Calculate local mean
      for (let ky = -halfBlock; ky <= halfBlock; ky++) {
        for (let kx = -halfBlock; kx <= halfBlock; kx++) {
          const ny = y + ky;
          const nx = x + kx;
          if (ny >= 0 && ny < height && nx >= 0 && nx < width) {
            sum += pixels[(ny * width + nx) * 4];
            count++;
          }
        }
      }
      
      const idx = (y * width + x) * 4;
      const mean = sum / count;
      const threshold = mean - C;
      const value = pixels[idx] > threshold ? 255 : 0;
      pixels[idx] = pixels[idx + 1] = pixels[idx + 2] = value;
    }
  }
}