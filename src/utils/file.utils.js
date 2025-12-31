const path = require('path');
const config = require('../config/environment');

/**
 * Validate file type against allowed MIME types
 * @param {string} mimeType - File MIME type
 * @returns {boolean} Whether file type is allowed
 */
const isAllowedFileType = (mimeType) => {
    return config.upload.allowedMimeTypes.includes(mimeType);
};

/**
 * Validate file size
 * @param {number} size - File size in bytes
 * @returns {boolean} Whether file size is within limit
 */
const isValidFileSize = (size) => {
    return size <= config.upload.maxFileSize;
};

/**
 * Get file extension from filename
 * @param {string} filename - File name
 * @returns {string} File extension (lowercase)
 */
const getFileExtension = (filename) => {
    return path.extname(filename).toLowerCase().slice(1);
};

/**
 * Generate unique filename
 * @param {string} originalName - Original file name
 * @returns {string} Unique file name
 */
const generateUniqueFilename = (originalName) => {
    const ext = path.extname(originalName);
    const nameWithoutExt = path.basename(originalName, ext);
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `${nameWithoutExt}-${timestamp}-${random}${ext}`;
};

/**
 * Get file type category
 * @param {string} mimeType - File MIME type
 * @returns {string} File category (image, video, audio, document)
 */
const getFileCategory = (mimeType) => {
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('video/')) return 'video';
    if (mimeType.startsWith('audio/')) return 'audio';
    return 'document';
};

/**
 * Format file size to human readable string
 * @param {number} bytes - File size in bytes
 * @returns {string} Formatted file size
 */
const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

module.exports = {
    isAllowedFileType,
    isValidFileSize,
    getFileExtension,
    generateUniqueFilename,
    getFileCategory,
    formatFileSize,
};
