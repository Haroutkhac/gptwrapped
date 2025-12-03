module.exports = {
  root: true,
  extends: ['next', 'next/core-web-vitals'],
  rules: {
    'no-restricted-globals': [
      'error',
      {
        name: 'fetch',
        message: 'Use localFetch from @/lib/localFetch to enforce offline-first policy.'
      }
    ]
  }
};
