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
 *                      opts.enable_probability (optional) chance to enable tracing
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
    opts.serviceName = app.serverType;
    opts.game = app.get('name');

    if(Math.random() <= opts.enable_probability) {
      tracer.configure(opts);
    }
  }
};

Component.prototype.name = '__jaeger__';
