/**
 * Generate URL-friendly slug from string
 * @param {string} text - Input text
 * @returns {string} URL-friendly slug
 */
const generateSlug = (text) => {
    return text
        .toString()
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-')        // Replace spaces with -
        .replace(/[^\w\-]+/g, '')    // Remove all non-word chars
        .replace(/\-\-+/g, '-')      // Replace multiple - with single -
        .replace(/^-+/, '')          // Trim - from start of text
        .replace(/-+$/, '');         // Trim - from end of text
};

/**
 * Generate unique slug by appending random suffix
 * @param {string} text - Input text
 * @returns {string} Unique slug
 */
const generateUniqueSlug = (text) => {
    const baseSlug = generateSlug(text);
    const suffix = Math.random().toString(36).substring(2, 8);
    return `${baseSlug}-${suffix}`;
};

/**
 * Validate slug format
 * @param {string} slug - Slug to validate
 * @returns {boolean} Whether slug is valid
 */
const isValidSlug = (slug) => {
    const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
    return slugRegex.test(slug);
};

module.exports = {
    generateSlug,
    generateUniqueSlug,
    isValidSlug,
};
