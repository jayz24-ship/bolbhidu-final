export function errorHandler(err, _req, res, _next) {
    const status = err.status || 500;
    const code = err.code || (status === 500 ? 'INTERNAL_ERROR' : 'ERROR');
    const message = err.message || 'Something went wrong';
    const details = err.details;
    res.status(status).json({ error: { code, message, ...(details ? { details } : {}) } });
}
//# sourceMappingURL=error.js.map