import { PDFDocument } from 'pdf-lib';
import { GlobalWorkerOptions } from 'pdfjs-dist';

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
  const pdfDoc = await PDFDocument.load(arrayBuffer);
  const pages = pdfDoc.getPages();
  const firstPage = pages[0];
  
  // Create a canvas with higher resolution
  const canvas = document.createElement('canvas');
  const scale = 2.0; // Increase scale for better quality
  const viewport = {
    width: firstPage.getWidth() * scale,
    height: firstPage.getHeight() * scale
  };
  
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  const ctx = canvas.getContext('2d');
  
  if (!ctx) {
    throw new Error('Could not get canvas context');
  }
  
  // Draw PDF page to canvas with higher quality settings
  ctx.fillStyle = 'white';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  // Convert PDF page to PNG
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
    }, 'image/png', 1.0); // Use maximum quality
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

      // Set canvas dimensions
      canvas.width = width;
      canvas.height = height;

      // Enhanced image processing for better QR detection
      ctx.filter = 'contrast(1.4) brightness(1.2)';
      ctx.drawImage(img, 0, 0, width, height);

      // Apply additional processing for better QR detection
      const imageData = ctx.getImageData(0, 0, width, height);
      const data = imageData.data;
      
      // Apply adaptive thresholding
      for (let i = 0; i < data.length; i += 4) {
        const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
        const threshold = 128;
        const value = avg > threshold ? 255 : 0;
        data[i] = data[i + 1] = data[i + 2] = value;
      }
      
      ctx.putImageData(imageData, 0, 0);

      // Convert canvas to blob with high quality
      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error('Could not create blob from canvas'));
          return;
        }
        // Create a new file from the blob
        const processedFile = new File([blob], file.name, {
          type: 'image/png',
          lastModified: Date.now(),
        });
        resolve(processedFile);
      }, 'image/png', 1.0); // Use maximum quality
    };

    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = URL.createObjectURL(file);
  });
};