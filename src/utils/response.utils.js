/**
 * Create success response
 * @param {Object} data - Response data
 * @param {string} message - Success message
 * @returns {Object} Formatted response
 */
const success = (data, message = 'Success') => {
    return {
        success: true,
        message,
        data,
    };
};

/**
 * Create paginated response
 * @param {Array} data - Response data
 * @param {Object} pagination - Pagination info
 * @param {string} message - Success message
 * @returns {Object} Formatted response
 */
const paginated = (data, pagination, message = 'Success') => {
    return {
        success: true,
        message,
        data,
        pagination: {
            page: pagination.page,
            limit: pagination.limit,
            total: pagination.total,
            totalPages: Math.ceil(pagination.total / pagination.limit),
            hasNext: pagination.page < Math.ceil(pagination.total / pagination.limit),
            hasPrev: pagination.page > 1,
        },
    };
};

/**
 * Create error response
 * @param {string} error - Error message
 * @param {number} statusCode - HTTP status code
 * @param {Object} details - Additional error details
 * @returns {Object} Formatted error response
 */
const error = (errorMessage, statusCode = 500, details = null) => {
    const response = {
        success: false,
        error: errorMessage,
    };

    if (details) {
        response.details = details;
    }

    return { statusCode, response };
};

/**
 * Parse pagination parameters from request
 * @param {Object} query - Request query object
 * @returns {Object} Pagination parameters
 */
const parsePagination = (query) => {
    const page = Math.max(1, parseInt(query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(query.limit) || 20));
    const offset = (page - 1) * limit;

    return { page, limit, offset };
};

/**
 * Parse sort parameters from request
 * @param {Object} query - Request query object
 * @param {Array} allowedFields - Allowed sort fields
 * @param {string} defaultField - Default sort field
 * @returns {Object} Sort parameters
 */
const parseSort = (query, allowedFields = ['created_at'], defaultField = 'created_at') => {
    const sortBy = allowedFields.includes(query.sortBy) ? query.sortBy : defaultField;
    const sortOrder = query.sortOrder === 'asc' ? 'asc' : 'desc';

    return { sortBy, sortOrder, ascending: sortOrder === 'asc' };
};

module.exports = {
    success,
    paginated,
    error,
    parsePagination,
    parseSort,
};
