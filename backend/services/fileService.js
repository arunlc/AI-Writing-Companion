// backend/services/fileService.js - ENHANCED VERSION
const AWS = require('aws-sdk');
const crypto = require('crypto');

class FileService {
  constructor() {
    // ✅ ENHANCED: Better error handling for missing environment variables
    const requiredEnvVars = [
      'WASABI_ACCESS_KEY',
      'WASABI_SECRET_KEY', 
      'WASABI_BUCKET_NAME',
      'WASABI_ENDPOINT',
      'WASABI_REGION'
    ];
    
    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
    if (missingVars.length > 0) {
      console.error('❌ Missing required environment variables:', missingVars);
      throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
    }
    
    console.log('✅ All Wasabi environment variables present');
    
    // ✅ ENHANCED: Configure AWS SDK for Wasabi with better timeout settings
    this.s3 = new AWS.S3({
      endpoint: process.env.WASABI_ENDPOINT,
      accessKeyId: process.env.WASABI_ACCESS_KEY,
      secretAccessKey: process.env.WASABI_SECRET_KEY,
      region: process.env.WASABI_REGION,
      s3ForcePathStyle: true, // ✅ REQUIRED: Needed for Wasabi
      signatureVersion: 'v4',
      // ✅ ENHANCED: Better timeout settings for Render
      httpOptions: {
        timeout: 20000,        // 20 second timeout
        connectTimeout: 5000   // 5 second connect timeout
      },
      maxRetries: 2,           // ✅ REDUCED: Fewer retries on Render
      retryDelayOptions: {
        customBackoff: function(retryCount) {
          return Math.pow(2, retryCount) * 1000; // exponential backoff
        }
      }
    });
    
    this.bucket = process.env.WASABI_BUCKET_NAME;
    
    console.log('✅ Wasabi S3 client configured:', {
      endpoint: process.env.WASABI_ENDPOINT,
      region: process.env.WASABI_REGION,
      bucket: this.bucket
    });
  }

  // ✅ ENHANCED: Upload file to Wasabi with better error handling
  async uploadToWasabi(fileName, fileBuffer, mimeType) {
    console.log('☁️ Starting Wasabi upload:', {
      fileName,
      size: fileBuffer.length,
      mimeType
    });
    
    try {
      // ✅ ENHANCED: Validate inputs
      if (!fileName) {
        throw new Error('File name is required');
      }
      if (!fileBuffer || fileBuffer.length === 0) {
        throw new Error('File buffer is empty');
      }
      if (!mimeType) {
        throw new Error('MIME type is required');
      }
      
      const params = {
        Bucket: this.bucket,
        Key: fileName,
        Body: fileBuffer,
        ContentType: mimeType,
        ServerSideEncryption: 'AES256',
        Metadata: {
          'uploaded-at': new Date().toISOString(),
          'content-type': mimeType,
          'file-size': fileBuffer.length.toString()
        },
        // ✅ ENHANCED: Add cache control for better performance
        CacheControl: 'max-age=31536000', // 1 year
        // ✅ ENHANCED: Add content disposition
        ContentDisposition: `attachment; filename="${fileName.split('/').pop()}"`
      };

      console.log('📤 Uploading to Wasabi with params:', {
        Bucket: params.Bucket,
        Key: params.Key,
        ContentType: params.ContentType,
        BodySize: params.Body.length
      });

      const result = await this.s3.upload(params).promise();
      
      console.log('✅ Wasabi upload successful:', {
        location: result.Location,
        etag: result.ETag,
        bucket: result.Bucket,
        key: result.Key
      });
      
      return {
        location: result.Location,
        etag: result.ETag,
        bucket: result.Bucket,
        key: result.Key
      };
    } catch (error) {
      console.error('❌ Wasabi upload error:', {
        message: error.message,
        code: error.code,
        statusCode: error.statusCode,
        fileName
      });
      
      // ✅ ENHANCED: Better error categorization
      if (error.code === 'NetworkingError' || error.code === 'TimeoutError') {
        throw new Error(`Network error uploading to storage: ${error.message}`);
      } else if (error.code === 'AccessDenied') {
        throw new Error('Storage access denied. Please check credentials.');
      } else if (error.code === 'NoSuchBucket') {
        throw new Error(`Storage bucket not found: ${this.bucket}`);
      } else {
        throw new Error(`Storage upload failed: ${error.message}`);
      }
    }
  }

  // ✅ ENHANCED: Generate signed URL with better error handling
  async getSignedUrl(fileName, expiresIn = 3600) {
    console.log('🔗 Generating signed URL for:', fileName);
    
    try {
      if (!fileName) {
        throw new Error('File name is required');
      }
      
      const params = {
        Bucket: this.bucket,
        Key: fileName,
        Expires: expiresIn, // URL expires in seconds
        ResponseContentDisposition: 'attachment' // Force download
      };

      const url = await this.s3.getSignedUrlPromise('getObject', params);
      
      console.log('✅ Signed URL generated successfully for:', fileName);
      return url;
    } catch (error) {
      console.error('❌ Signed URL generation error:', {
        message: error.message,
        code: error.code,
        fileName
      });
      
      if (error.code === 'NoSuchKey') {
        throw new Error('File not found in storage');
      } else {
        throw new Error(`Failed to generate download URL: ${error.message}`);
      }
    }
  }

  // ✅ ENHANCED: Delete file with better error handling
  async deleteFromWasabi(fileName) {
    console.log('🗑️ Deleting from Wasabi:', fileName);
    
    try {
      if (!fileName) {
        throw new Error('File name is required');
      }
      
      const params = {
        Bucket: this.bucket,
        Key: fileName
      };

      await this.s3.deleteObject(params).promise();
      
      console.log('✅ File deleted successfully:', fileName);
      return true;
    } catch (error) {
      console.error('❌ Wasabi deletion error:', {
        message: error.message,
        code: error.code,
        fileName
      });
      
      // Don't throw for file not found - it's already "deleted"
      if (error.code === 'NoSuchKey') {
        console.log('ℹ️ File already deleted or not found:', fileName);
        return true;
      }
      
      throw new Error(`Failed to delete file: ${error.message}`);
    }
  }

  // ✅ ENHANCED: Health check with connection test
  async healthCheck() {
    console.log('🏥 Performing Wasabi health check...');
    
    try {
      // Test bucket access
      await this.s3.headBucket({ Bucket: this.bucket }).promise();
      
      console.log('✅ Wasabi health check passed');
      return { 
        status: 'healthy', 
        message: 'Wasabi connection successful',
        bucket: this.bucket,
        endpoint: process.env.WASABI_ENDPOINT
      };
    } catch (error) {
      console.error('❌ Wasabi health check failed:', {
        message: error.message,
        code: error.code,
        statusCode: error.statusCode
      });
      
      return { 
        status: 'unhealthy', 
        message: `Wasabi connection failed: ${error.message}`,
        bucket: this.bucket,
        endpoint: process.env.WASABI_ENDPOINT
      };
    }
  }

  // ✅ NEW: Test upload function for debugging
  async testUpload() {
    console.log('🧪 Testing Wasabi upload...');
    
    try {
      const testData = Buffer.from('Test file content for health check');
      const testFileName = `test/health-check-${Date.now()}.txt`;
      
      // Upload test file
      const uploadResult = await this.uploadToWasabi(testFileName, testData, 'text/plain');
      console.log('✅ Test upload successful');
      
      // Delete test file
      await this.deleteFromWasabi(testFileName);
      console.log('✅ Test file cleaned up');
      
      return { 
        status: 'success', 
        message: 'Upload test completed successfully',
        uploadResult
      };
    } catch (error) {
      console.error('❌ Upload test failed:', error);
      return { 
        status: 'failed', 
        message: `Upload test failed: ${error.message}`
      };
    }
  }
}

// Export singleton instance
const fileService = new FileService();

// Export individual functions for backwards compatibility
const uploadToWasabi = (fileName, fileBuffer, mimeType) => 
  fileService.uploadToWasabi(fileName, fileBuffer, mimeType);

const getSignedUrl = (fileName, expiresIn) => 
  fileService.getSignedUrl(fileName, expiresIn);

const deleteFromWasabi = (fileName) => 
  fileService.deleteFromWasabi(fileName);

module.exports = {
  FileService,
  fileService,
  uploadToWasabi,
  getSignedUrl,
  deleteFromWasabi
};
