'use strict';
/**
 * Component for distributed tracing using Jaeger.
 */
const jaeger = require('jaeger-tracer-node');
const logger = require('pomelo-logger').getLogger('pomelo', __filename);

/**
 * Component factory function
 *
 * @param {Object} app  current application context
 * @param {Object} opts construct parameters
 *                      opts.disable (optional) if tracing should be disabled,
 *                      opts.host: (optional) address of the jaeger-agent,
 *                      opts.port: (optional) port of the jaeger-agent,
 *                      opts.probability: (optional) chance a trace is sampled,
 *                      opts.tags: (optional) global span tags.
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
    opts.tags = opts.tags || {};
    opts.serviceName = opts.serviceName || app.get('name') + "-" + app.serverType;

    logger.info("Starting jaeger with opts", opts);

    jaeger.configure(opts);
  }
};

Component.prototype.name = '__jaeger__';
