/**
 * Flattens Apex/LDS errors into an array of strings.
 * @param {Object} error - Error from Apex or getRecord
 * @returns {string[]} Human-readable messages
 */
export function reduceErrors(error) {
    if (!error) return [];
    if (Array.isArray(error.body)) {
        return error.body.map((e) => e.message || e.pageErrors?.[0]?.message || JSON.stringify(e));
    }
    if (error.body?.pageErrors?.length) {
        return error.body.pageErrors.map((e) => e.message);
    }
    if (error.body?.message) {
        return [error.body.message];
    }
    if (typeof error.message === 'string') {
        return [error.message];
    }
    return [JSON.stringify(error)];
}