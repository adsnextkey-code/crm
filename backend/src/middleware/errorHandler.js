const notFound = (req, res) => {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` });
};

const errorHandler = (err, req, res, next) => {
  let statusCode = res.statusCode && res.statusCode !== 200 ? res.statusCode : 500;
  if (err.name === 'CastError') statusCode = 400;
  if (err.code === 11000) statusCode = 409;
  if (err.name === 'ValidationError') statusCode = 400;

  let message = err.message || 'Server error';
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {}).join(', ');
    message = `Duplicate value for ${field}`;
  }

  const response = { message };
  if (process.env.NODE_ENV !== 'production' && err.stack) {
    response.stack = err.stack;
  }
  res.status(statusCode).json(response);
};

module.exports = { notFound, errorHandler };
