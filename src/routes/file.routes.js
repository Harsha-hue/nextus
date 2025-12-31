const express = require('express');
const router = express.Router();
const multer = require('multer');

const fileController = require('../controllers/file.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { uploadLimiter } = require('../middleware/rate-limit.middleware');

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    limits: {
        fileSize: 50 * 1024 * 1024, // 50MB limit
    },
    fileFilter: (req, file, cb) => {
        // Allow most file types
        const allowedTypes = [
            'image/', 'video/', 'audio/', 'application/pdf',
            'application/msword', 'application/vnd.openxmlformats',
            'application/vnd.ms-', 'text/', 'application/zip',
            'application/x-rar', 'application/json',
        ];

        const isAllowed = allowedTypes.some((type) => file.mimetype.startsWith(type));

        if (isAllowed) {
            cb(null, true);
        } else {
            cb(new Error('File type not allowed'), false);
        }
    },
});

// All file routes require authentication
router.use(authenticate);

// Upload file
router.post('/upload', uploadLimiter, upload.single('file'), fileController.uploadFile);

// Get file by ID
router.get('/:id', fileController.getFile);

// Get download URL
router.get('/:id/download', fileController.getDownloadUrl);

// Get files for a channel
router.get('/channel/:channelId', fileController.getChannelFiles);

// Get files for a workspace
router.get('/workspace/:workspaceId', fileController.getWorkspaceFiles);

// Delete a file
router.delete('/:id', fileController.deleteFile);

module.exports = router;
