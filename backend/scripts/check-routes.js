const setupRoutes = require('./src/routes/index.js').setupRoutes;
const express = require('express');
const app = require('express')();
app.use(require('express').json());
require('./src/routes/index.js').setupRoutes(app);
console.log('App routes:');
app._router.stack.forEach(r => {
  if (r.route) console.log('  ', r.route.path, Object.keys(r.route.methods));
  else if (r.name === 'router') r.handle.stack.forEach(r => r.route && console.log('  ', r.route.path, Object.keys(r.route.methods)));
});