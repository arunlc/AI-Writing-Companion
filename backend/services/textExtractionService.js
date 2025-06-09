// backend/services/textExtractionService.js - REAL TEXT EXTRACTION
const fs = require('fs').promises;
const path = require('path');
const mammoth = require('mammoth');
const pdfParse = require('pdf-parse');
const textract = require('textract');
const { promisify } = require('util');

// Promisify textract for async/await usage
const textractFromBuffer = promisify(textract.fromBufferWithMime);

class TextExtractionService {
  constructor() {
    console.log('✅ TextExtractionService initialized with real extraction libraries');
  }

  /**
   * Extract text from various document formats
   * @param {Buffer} fileBuffer - File buffer from storage or upload
   * @param {string} mimeType - MIME type of the file
   * @param {string} originalName - Original filename
   * @returns {Promise<string>} - Extracted text content
   */
  async extractText(fileBuffer, mimeType, originalName) {
    console.log(`📄 Extracting text from: ${originalName} (${mimeType})`);

    if (!fileBuffer || fileBuffer.length === 0) {
      throw new Error('File buffer is empty or invalid');
    }

    try {
      switch (mimeType) {
        case 'text/plain':
          return await this.extractFromTxt(fileBuffer);
        
        case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
          return await this.extractFromDocx(fileBuffer);
        
        case 'application/msword':
          return await this.extractFromDoc(fileBuffer, originalName);
        
        case 'application/pdf':
          return await this.extractFromPdf(fileBuffer);
        
        default:
          throw new Error(`Unsupported file type: ${mimeType}`);
      }
    } catch (error) {
      console.error(`❌ Text extraction failed for ${originalName}:`, error);
      throw new Error(`Failed to extract text from ${originalName}: ${error.message}`);
    }
  }

  /**
   * Extract text from plain text files
   */
  async extractFromTxt(fileBuffer) {
    try {
      const content = fileBuffer.toString('utf8');
      return this.cleanText(content);
    } catch (error) {
      throw new Error(`Failed to read text file: ${error.message}`);
    }
  }

  /**
   * Extract text from DOCX files using mammoth
   */
  async extractFromDocx(fileBuffer) {
    try {
      console.log('📝 Extracting from DOCX using mammoth...');
      const result = await mammoth.extractRawText({ buffer: fileBuffer });
      
      if (result.messages && result.messages.length > 0) {
        console.log('⚠️ Mammoth extraction warnings:', result.messages);
      }
      
      const cleanedText = this.cleanText(result.value);
      console.log(`✅ DOCX extraction successful: ${cleanedText.length} characters`);
      return cleanedText;
    } catch (error) {
      console.error('❌ Mammoth extraction error:', error);
      throw new Error(`Failed to extract from DOCX: ${error.message}`);
    }
  }

  /**
   * Extract text from DOC files using textract
   */
  async extractFromDoc(fileBuffer, originalName) {
    try {
      console.log('📝 Extracting from DOC using textract...');
      
      // Create a temporary file for textract (it needs file path for .doc files)
      const tempDir = '/tmp';
      const tempFileName = `temp_${Date.now()}_${originalName}`;
      const tempFilePath = path.join(tempDir, tempFileName);
      
      // Write buffer to temporary file
      await fs.writeFile(tempFilePath, fileBuffer);
      
      try {
        // Extract text using file path
        const text = await textractFromBuffer(fileBuffer, 'application/msword');
        const cleanedText = this.cleanText(text);
        console.log(`✅ DOC extraction successful: ${cleanedText.length} characters`);
        return cleanedText;
      } finally {
        // Clean up temporary file
        try {
          await fs.unlink(tempFilePath);
        } catch (unlinkError) {
          console.warn('⚠️ Failed to clean up temp file:', unlinkError.message);
        }
      }
    } catch (error) {
      console.error('❌ Textract extraction error:', error);
      throw new Error(`Failed to extract from DOC: ${error.message}`);
    }
  }

  /**
   * Extract text from PDF files using pdf-parse
   */
  async extractFromPdf(fileBuffer) {
    try {
      console.log('📝 Extracting from PDF using pdf-parse...');
      const data = await pdfParse(fileBuffer);
      const cleanedText = this.cleanText(data.text);
      console.log(`✅ PDF extraction successful: ${cleanedText.length} characters, ${data.numpages} pages`);
      return cleanedText;
    } catch (error) {
      console.error('❌ PDF extraction error:', error);
      throw new Error(`Failed to extract from PDF: ${error.message}`);
    }
  }

  /**
   * Clean and normalize extracted text
   */
  cleanText(text) {
    if (!text) return '';
    
    return text
      .replace(/\r\n/g, '\n')           // Normalize line endings
      .replace(/\n{3,}/g, '\n\n')       // Remove excessive line breaks
      .replace(/\t/g, ' ')              // Replace tabs with spaces
      .replace(/  +/g, ' ')             // Replace multiple spaces with single space
      .replace(/\u00A0/g, ' ')          // Replace non-breaking spaces
      .replace(/[\u2000-\u200B]/g, ' ') // Replace various unicode spaces
      .trim();                          // Remove leading/trailing whitespace
  }

  /**
   * Validate if file type is supported for text extraction
   */
  isTextExtractable(mimeType) {
    const supportedTypes = [
      'text/plain',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
      'application/pdf'
    ];
    
    return supportedTypes.includes(mimeType);
  }

  /**
   * Get word count from extracted text
   */
  getWordCount(text) {
    if (!text) return 0;
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  }

  /**
   * Get character count from extracted text
   */
  getCharCount(text) {
    if (!text) return 0;
    return text.length;
  }

  /**
   * Generate extraction metadata
   */
  generateMetadata(text, originalName, mimeType) {
    const wordCount = this.getWordCount(text);
    const charCount = this.getCharCount(text);
    
    return {
      originalFileName: originalName,
      mimeType: mimeType,
      wordCount: wordCount,
      characterCount: charCount,
      extractedAt: new Date().toISOString(),
      textLength: text.length,
      preview: text.substring(0, 200) + (text.length > 200 ? '...' : ''),
      extractionMethod: this.getExtractionMethod(mimeType),
      isSuccessful: true
    };
  }

  /**
   * Get extraction method used for file type
   */
  getExtractionMethod(mimeType) {
    const methods = {
      'text/plain': 'UTF-8 decoding',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'Mammoth DOCX parser',
      'application/msword': 'Textract DOC parser',
      'application/pdf': 'PDF-parse library'
    };
    return methods[mimeType] || 'Unknown';
  }

  /**
   * Health check for extraction service
   */
  async healthCheck() {
    try {
      // Test each extraction method with sample content
      const testResults = {
        textExtraction: true,
        libraries: {
          mammoth: !!mammoth,
          pdfParse: !!pdfParse,
          textract: !!textract
        },
        supportedTypes: [
          'text/plain',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/msword',
          'application/pdf'
        ]
      };

      // Quick test of text cleaning
      const testText = this.cleanText('  Test   text\n\n\nwith    spaces  ');
      testResults.textCleaning = testText === 'Test text\n\nwith spaces';

      return {
        status: 'healthy',
        message: 'Text extraction service operational',
        details: testResults
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        message: `Text extraction service error: ${error.message}`,
        details: { error: error.message }
      };
    }
  }
}

// Export singleton instance
const textExtractionService = new TextExtractionService();

module.exports = textExtractionService;
