// backend/services/fileService.js
const AWS = require('aws-sdk');
const crypto = require('crypto');

class FileService {
  constructor() {
    // Configure AWS SDK for Wasabi
    this.s3 = new AWS.S3({
      endpoint: process.env.WASABI_ENDPOINT || 'https://s3.wasabisys.com',
      accessKeyId: process.env.WASABI_ACCESS_KEY,
      secretAccessKey: process.env.WASABI_SECRET_KEY,
      region: process.env.WASABI_REGION || 'us-east-1',
      s3ForcePathStyle: true, // Needed for Wasabi
      signatureVersion: 'v4'
    });
    
    this.bucket = process.env.WASABI_BUCKET_NAME || 'ai-writing-companion-files';
  }

  // Upload file to Wasabi
  async uploadToWasabi(fileName, fileBuffer, mimeType) {
    try {
      const params = {
        Bucket: this.bucket,
        Key: fileName,
        Body: fileBuffer,
        ContentType: mimeType,
        ServerSideEncryption: 'AES256', // Enable server-side encryption
        Metadata: {
          'uploaded-at': new Date().toISOString(),
          'content-type': mimeType
        }
      };

      const result = await this.s3.upload(params).promise();
      
      console.log(`File uploaded successfully: ${fileName}`);
      return {
        location: result.Location,
        etag: result.ETag,
        bucket: result.Bucket,
        key: result.Key
      };
    } catch (error) {
      console.error('Wasabi upload error:', error);
      throw new Error(`Failed to upload file: ${error.message}`);
    }
  }

  // Generate signed URL for file download
  async getSignedUrl(fileName, expiresIn = 3600) {
    try {
      const params = {
        Bucket: this.bucket,
        Key: fileName,
        Expires: expiresIn, // URL expires in seconds (default: 1 hour)
        ResponseContentDisposition: 'attachment' // Force download
      };

      const url = await this.s3.getSignedUrlPromise('getObject', params);
      
      console.log(`Generated signed URL for: ${fileName}`);
      return url;
    } catch (error) {
      console.error('Signed URL generation error:', error);
      throw new Error(`Failed to generate download URL: ${error.message}`);
    }
  }

  // Delete file from Wasabi
  async deleteFromWasabi(fileName) {
    try {
      const params = {
        Bucket: this.bucket,
        Key: fileName
      };

      await this.s3.deleteObject(params).promise();
      
      console.log(`File deleted successfully: ${fileName}`);
      return true;
    } catch (error) {
      console.error('Wasabi deletion error:', error);
      throw new Error(`Failed to delete file: ${error.message}`);
    }
  }

  // Check if file exists
  async fileExists(fileName) {
    try {
      const params = {
        Bucket: this.bucket,
        Key: fileName
      };

      await this.s3.headObject(params).promise();
      return true;
    } catch (error) {
      if (error.code === 'NotFound') {
        return false;
      }
      throw new Error(`Failed to check file existence: ${error.message}`);
    }
  }

  // Get file metadata
  async getFileMetadata(fileName) {
    try {
      const params = {
        Bucket: this.bucket,
        Key: fileName
      };

      const result = await this.s3.headObject(params).promise();
      
      return {
        contentLength: result.ContentLength,
        contentType: result.ContentType,
        lastModified: result.LastModified,
        etag: result.ETag,
        metadata: result.Metadata
      };
    } catch (error) {
      console.error('Get metadata error:', error);
      throw new Error(`Failed to get file metadata: ${error.message}`);
    }
  }

  // List files in a directory
  async listFiles(prefix = '', maxKeys = 1000) {
    try {
      const params = {
        Bucket: this.bucket,
        Prefix: prefix,
        MaxKeys: maxKeys
      };

      const result = await this.s3.listObjectsV2(params).promise();
      
      return {
        files: result.Contents || [],
        totalCount: result.KeyCount,
        isTruncated: result.IsTruncated,
        nextContinuationToken: result.NextContinuationToken
      };
    } catch (error) {
      console.error('List files error:', error);
      throw new Error(`Failed to list files: ${error.message}`);
    }
  }

  // Copy file within the bucket
  async copyFile(sourceKey, destinationKey) {
    try {
      const params = {
        Bucket: this.bucket,
        CopySource: `${this.bucket}/${sourceKey}`,
        Key: destinationKey
      };

      const result = await this.s3.copyObject(params).promise();
      
      console.log(`File copied from ${sourceKey} to ${destinationKey}`);
      return result;
    } catch (error) {
      console.error('Copy file error:', error);
      throw new Error(`Failed to copy file: ${error.message}`);
    }
  }

  // Generate unique file name to avoid conflicts
  generateUniqueFileName(originalName, submissionId, fileType) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const randomSuffix = crypto.randomBytes(4).toString('hex');
    const extension = originalName.split('.').pop();
    
    return `${submissionId}/${fileType}/${timestamp}-${randomSuffix}.${extension}`;
  }

  // Validate file type
  isValidFileType(mimeType) {
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp'
    ];
    
    return allowedTypes.includes(mimeType);
  }

  // Get file type category
  getFileTypeCategory(mimeType) {
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType === 'application/pdf') return 'pdf';
    if (mimeType.includes('word') || mimeType === 'text/plain') return 'document';
    return 'other';
  }

  // Format file size for display
  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // Cleanup old files (can be run as a cron job)
  async cleanupOldFiles(daysOld = 90) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);
      
      const listParams = {
        Bucket: this.bucket
      };
      
      const objects = await this.s3.listObjectsV2(listParams).promise();
      const filesToDelete = [];
      
      for (const object of objects.Contents || []) {
        if (object.LastModified < cutoffDate) {
          filesToDelete.push({ Key: object.Key });
        }
      }
      
      if (filesToDelete.length > 0) {
        const deleteParams = {
          Bucket: this.bucket,
          Delete: {
            Objects: filesToDelete,
            Quiet: false
          }
        };
        
        const result = await this.s3.deleteObjects(deleteParams).promise();
        console.log(`Cleaned up ${result.Deleted?.length || 0} old files`);
        
        return {
          deletedCount: result.Deleted?.length || 0,
          errors: result.Errors || []
        };
      }
      
      return { deletedCount: 0, errors: [] };
    } catch (error) {
      console.error('Cleanup error:', error);
      throw new Error(`Failed to cleanup old files: ${error.message}`);
    }
  }

  // Health check for Wasabi connection
  async healthCheck() {
    try {
      await this.s3.headBucket({ Bucket: this.bucket }).promise();
      return { status: 'healthy', message: 'Wasabi connection successful' };
    } catch (error) {
      console.error('Wasabi health check failed:', error);
      return { 
        status: 'unhealthy', 
        message: `Wasabi connection failed: ${error.message}` 
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

const fileExists = (fileName) => 
  fileService.fileExists(fileName);

const getFileMetadata = (fileName) => 
  fileService.getFileMetadata(fileName);

module.exports = {
  FileService,
  fileService,
  uploadToWasabi,
  getSignedUrl,
  deleteFromWasabi,
  fileExists,
  getFileMetadata
};
