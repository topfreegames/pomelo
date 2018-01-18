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
 *                      opts.host: (optional) address of the jaeger-agent,
 *                      opts.port: (optional) port of the jaeger-agent,
 *                      opts.probability: (optional) chance a trace is sampled,
 *                      opts.version: (optional) game version.
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
  if(opts) {
    opts.serviceName = app.serverType;
    opts.game = app.get('name');

    tracer.configure(opts);
  }
};

Component.prototype.name = '__jaeger__';
