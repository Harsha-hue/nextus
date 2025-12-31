const { google } = require('googleapis');
const { drive, getDriveAuth } = require('../config/google-drive');
const { supabase } = require('../config/supabase');
const { v4: uuidv4 } = require('uuid');
const config = require('../config/environment');

/**
 * File Service - Handles file uploads, downloads, and management
 * Uses Google Drive for storage
 */
class FileService {
    /**
     * Upload a file to Google Drive
     * @param {Buffer} fileBuffer - File buffer
     * @param {string} fileName - Original file name
     * @param {string} mimeType - File MIME type
     * @param {Object} metadata - File metadata
     * @returns {Object} File record
     */
    async uploadFile(fileBuffer, fileName, mimeType, metadata = {}) {
        const { workspaceId, channelId, dmGroupId, uploaderId } = metadata;
        const fileId = uuidv4();

        try {
            // Create file in Google Drive
            const auth = getDriveAuth();
            const driveClient = google.drive({ version: 'v3', auth });

            const driveResponse = await driveClient.files.create({
                requestBody: {
                    name: `${fileId}_${fileName}`,
                    mimeType: mimeType,
                    parents: [config.googleDrive.folderId],
                },
                media: {
                    mimeType: mimeType,
                    body: require('stream').Readable.from(fileBuffer),
                },
                fields: 'id, webViewLink, webContentLink',
            });

            const googleDriveId = driveResponse.data.id;
            const googleDriveUrl = driveResponse.data.webContentLink || driveResponse.data.webViewLink;

            // Store file metadata in Supabase
            const fileRecord = {
                id: fileId,
                workspace_id: workspaceId,
                channel_id: channelId || null,
                dm_group_id: dmGroupId || null,
                uploader_id: uploaderId,
                original_name: fileName,
                file_type: this._getFileCategory(mimeType),
                file_size_bytes: fileBuffer.length,
                mime_type: mimeType,
                storage_provider: 'google_drive',
                google_drive_id: googleDriveId,
                google_drive_url: googleDriveUrl,
                thumbnail_url: null,
                is_public: false,
                metadata: {},
                created_at: new Date(),
            };

            const { data, error } = await supabase
                .from('files')
                .insert(fileRecord)
                .select()
                .single();

            if (error) throw error;

            return data;
        } catch (error) {
            console.error('Upload file error:', error);
            throw { statusCode: 500, message: 'Failed to upload file' };
        }
    }

    /**
     * Get file by ID
     * @param {string} fileId - File ID
     * @returns {Object} File record
     */
    async getFileById(fileId) {
        const { data, error } = await supabase
            .from('files')
            .select('*, uploader:uploader_id(id, username, full_name, avatar_url)')
            .eq('id', fileId)
            .single();

        if (error || !data) {
            throw { statusCode: 404, message: 'File not found' };
        }

        return data;
    }

    /**
     * Get files for a channel
     * @param {string} channelId - Channel ID
     * @param {Object} options - Pagination options
     * @returns {Array} File records
     */
    async getChannelFiles(channelId, options = {}) {
        const { page = 1, limit = 20 } = options;
        const offset = (page - 1) * limit;

        const { data, error, count } = await supabase
            .from('files')
            .select('*, uploader:uploader_id(id, username, full_name, avatar_url)', { count: 'exact' })
            .eq('channel_id', channelId)
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (error) {
            throw { statusCode: 500, message: 'Failed to fetch files' };
        }

        return {
            files: data || [],
            total: count,
            page,
            limit,
        };
    }

    /**
     * Get files for a workspace
     * @param {string} workspaceId - Workspace ID
     * @param {Object} options - Filter and pagination options
     * @returns {Array} File records
     */
    async getWorkspaceFiles(workspaceId, options = {}) {
        const { page = 1, limit = 20, fileType } = options;
        const offset = (page - 1) * limit;

        let query = supabase
            .from('files')
            .select('*, uploader:uploader_id(id, username, full_name, avatar_url)', { count: 'exact' })
            .eq('workspace_id', workspaceId)
            .order('created_at', { ascending: false });

        if (fileType) {
            query = query.eq('file_type', fileType);
        }

        const { data, error, count } = await query.range(offset, offset + limit - 1);

        if (error) {
            throw { statusCode: 500, message: 'Failed to fetch files' };
        }

        return {
            files: data || [],
            total: count,
            page,
            limit,
        };
    }

    /**
     * Delete a file
     * @param {string} fileId - File ID
     * @param {string} userId - Requesting user ID
     */
    async deleteFile(fileId, userId) {
        // Get file record
        const file = await this.getFileById(fileId);

        // Check authorization
        if (file.uploader_id !== userId) {
            throw { statusCode: 403, message: 'Not authorized to delete this file' };
        }

        try {
            // Delete from Google Drive
            if (file.google_drive_id) {
                const auth = getDriveAuth();
                const driveClient = google.drive({ version: 'v3', auth });
                await driveClient.files.delete({ fileId: file.google_drive_id });
            }

            // Delete from Supabase
            const { error } = await supabase
                .from('files')
                .delete()
                .eq('id', fileId);

            if (error) throw error;

            return { success: true };
        } catch (error) {
            console.error('Delete file error:', error);
            throw { statusCode: 500, message: 'Failed to delete file' };
        }
    }

    /**
     * Get download URL for a file
     * @param {string} fileId - File ID
     * @returns {string} Download URL
     */
    async getDownloadUrl(fileId) {
        const file = await this.getFileById(fileId);

        if (file.google_drive_url) {
            return file.google_drive_url;
        }

        // Generate temporary URL from Google Drive
        const auth = getDriveAuth();
        const driveClient = google.drive({ version: 'v3', auth });

        const response = await driveClient.files.get({
            fileId: file.google_drive_id,
            fields: 'webContentLink',
        });

        return response.data.webContentLink;
    }

    /**
     * Get file category from MIME type
     * @param {string} mimeType - MIME type
     * @returns {string} File category
     */
    _getFileCategory(mimeType) {
        if (mimeType.startsWith('image/')) return 'image';
        if (mimeType.startsWith('video/')) return 'video';
        if (mimeType.startsWith('audio/')) return 'audio';
        if (mimeType.includes('pdf')) return 'document';
        if (mimeType.includes('word') || mimeType.includes('document')) return 'document';
        if (mimeType.includes('sheet') || mimeType.includes('excel')) return 'spreadsheet';
        if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return 'presentation';
        return 'other';
    }
}

module.exports = new FileService();
