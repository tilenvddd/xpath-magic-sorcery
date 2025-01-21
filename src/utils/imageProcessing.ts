import { getDocument } from 'pdfjs-dist';

// Initialize PDF.js worker
import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.entry';

if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;
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
      // Set reasonable maximum dimensions
      const MAX_WIDTH = 1024;
      const MAX_HEIGHT = 1024;

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

      // Apply image processing
      ctx.filter = 'contrast(1.2) brightness(1.1) grayscale(1)';
      ctx.drawImage(img, 0, 0, width, height);

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