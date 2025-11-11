import * as pdfjsLib from 'pdfjs-dist';
import type { TextItem, TextMarkedContent } from 'pdfjs-dist/types/src/display/api';

// Configure PDF.js worker
if (typeof window !== 'undefined') {
  // Using CDN worker - version must match the installed package version
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.worker.min.mjs`;
}

export async function extractTextFromPDF(file: File): Promise<string> {
  try {
    console.log('Starting PDF extraction for file:', file.name);
    
    // Read file as ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    console.log('ArrayBuffer size:', arrayBuffer.byteLength);
    
    // Validate it's a PDF
    const uint8Array = new Uint8Array(arrayBuffer);
    const pdfSignature = String.fromCharCode(
      uint8Array[0],
      uint8Array[1],
      uint8Array[2],
      uint8Array[3]
    );
    if (pdfSignature !== '%PDF') {
      throw new Error('Invalid PDF file: File does not start with PDF signature');
    }
    
    // Load PDF document with configuration
    const loadingTask = pdfjsLib.getDocument({
      data: arrayBuffer,
      useSystemFonts: true,
      disableFontFace: false,
    });
    
    const pdf = await loadingTask.promise;
    console.log('PDF loaded successfully. Pages:', pdf.numPages);
    
    let fullText = '';
    const textParts: string[] = [];
    
    // Extract text from all pages
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      console.log(`Processing page ${pageNum}/${pdf.numPages}`);
      
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      
      // Extract text with better spacing handling
      const pageTextParts: string[] = [];
      let lastY = -1;
      
      for (const item of textContent.items) {
        // Type guard to check if item has 'str' property
        if ('str' in item) {
          const textItem = item as TextItem;
          
          // Add line break if we moved to a new line (Y coordinate changed significantly)
          if (lastY !== -1 && Math.abs(textItem.transform[5] - lastY) > 5) {
            pageTextParts.push('\n');
          }
          
          // Add the text with space
          if (textItem.str.trim()) {
            pageTextParts.push(textItem.str);
            pageTextParts.push(' ');
          }
          
          lastY = textItem.transform[5];
        }
      }
      
      const pageText = pageTextParts.join('').trim();
      if (pageText) {
        textParts.push(pageText);
      }
    }
    
    fullText = textParts.join('\n\n');
    console.log('Extracted text length:', fullText.length);
    
    // Validate extraction
    if (!fullText || fullText.length < 10) {
      throw new Error('No readable text found in PDF. The file might be an image-based scan or encrypted.');
    }
    
    // Clean up extra whitespace
    fullText = fullText
      .replace(/\s+/g, ' ')  // Replace multiple spaces with single space
      .replace(/\n\s+\n/g, '\n\n')  // Clean up paragraph breaks
      .trim();
    
    console.log('Final text length after cleanup:', fullText.length);
    return fullText;
    
  } catch (error) {
    console.error('PDF extraction error:', error);
    
    if (error instanceof Error) {
      // Handle specific error types
      if (error.message.includes('Invalid PDF')) {
        throw new Error('This file appears to be corrupted or not a valid PDF. Please try another file.');
      }
      if (error.message.includes('password') || error.message.includes('encrypted')) {
        throw new Error('This PDF is password-protected or encrypted. Please use an unprotected PDF.');
      }
      if (error.message.includes('No readable text')) {
        throw new Error('Could not extract text from this PDF. It might be an image-based scan. Try using a text-based PDF.');
      }
      
      // Pass through our custom error messages
      if (error.message.includes('File does not start with PDF signature')) {
        throw error;
      }
      
      throw new Error(`Failed to process PDF: ${error.message}`);
    }
    
    throw new Error('An unexpected error occurred while processing the PDF. Please try a different file.');
  }
}

// Helper function to validate PDF file before processing
export function validatePDFFile(file: File): { valid: boolean; error?: string } {
  // Check file type
  if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
    return {
      valid: false,
      error: 'Please upload a PDF file (.pdf extension)',
    };
  }
  
  // Check file size (max 10MB)
  const maxSize = 10 * 1024 * 1024; // 10MB
  if (file.size > maxSize) {
    return {
      valid: false,
      error: 'PDF file is too large. Please upload a file smaller than 10MB.',
    };
  }
  
  // Check minimum size
  if (file.size < 100) {
    return {
      valid: false,
      error: 'File is too small to be a valid PDF.',
    };
  }
  
  return { valid: true };
}

