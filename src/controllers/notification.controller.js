const notificationService = require('../services/notification.service');
const { success, paginated, parsePagination } = require('../utils/response.utils');

/**
 * Get user notifications
 * GET /api/v1/notifications
 */
const getNotifications = async (req, res, next) => {
    try {
        const pagination = parsePagination(req.query);
        const { unreadOnly } = req.query;

        const result = await notificationService.getUserNotifications(req.userId, {
            ...pagination,
            unreadOnly: unreadOnly === 'true',
        });

        res.json(paginated(result.notifications, {
            page: result.page,
            limit: result.limit,
            total: result.total,
            meta: { unreadCount: result.unreadCount },
        }, 'Notifications retrieved successfully'));
    } catch (error) {
        if (error.statusCode) {
            return res.status(error.statusCode).json({
                success: false,
                error: error.message,
            });
        }
        next(error);
    }
};

/**
 * Get unread count
 * GET /api/v1/notifications/unread-count
 */
const getUnreadCount = async (req, res, next) => {
    try {
        const count = await notificationService.getUnreadCount(req.userId);
        res.json(success({ count }, 'Unread count retrieved'));
    } catch (error) {
        next(error);
    }
};

/**
 * Mark notification as read
 * PATCH /api/v1/notifications/:id/read
 */
const markAsRead = async (req, res, next) => {
    try {
        await notificationService.markAsRead(req.params.id, req.userId);
        res.json(success(null, 'Notification marked as read'));
    } catch (error) {
        if (error.statusCode) {
            return res.status(error.statusCode).json({
                success: false,
                error: error.message,
            });
        }
        next(error);
    }
};

/**
 * Mark all notifications as read
 * PATCH /api/v1/notifications/read-all
 */
const markAllAsRead = async (req, res, next) => {
    try {
        await notificationService.markAllAsRead(req.userId);
        res.json(success(null, 'All notifications marked as read'));
    } catch (error) {
        if (error.statusCode) {
            return res.status(error.statusCode).json({
                success: false,
                error: error.message,
            });
        }
        next(error);
    }
};

/**
 * Delete a notification
 * DELETE /api/v1/notifications/:id
 */
const deleteNotification = async (req, res, next) => {
    try {
        await notificationService.deleteNotification(req.params.id, req.userId);
        res.json(success(null, 'Notification deleted'));
    } catch (error) {
        if (error.statusCode) {
            return res.status(error.statusCode).json({
                success: false,
                error: error.message,
            });
        }
        next(error);
    }
};

module.exports = {
    getNotifications,
    getUnreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
};
