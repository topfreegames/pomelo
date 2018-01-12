'use strict';
/**
 * Component for distributed tracing using Jaeger.
 */
var tracer = require('pomelo-rpc').tracer;

/**
 * Component factory function
 *
 * @param {Object} app  current application context
 * @param {Object} opts construct parameters
 *                      opts.probability: chance a trace is sampled,
 *                      opts.version: (optional) game version,
 * @return {Object}     component instance
 */
module.exports = function(app, opts) {
  return new Component(app, opts);
};

/**
 * Jaeger component class
 *
 * @param {Object} app  current application context
 * @param {Object} opts construct parameters
 */
var Component = function(app, opts) {
  opts.serviceName = app.serverType;
  opts.game = app.get('name');

  tracer.configure(opts);
};
