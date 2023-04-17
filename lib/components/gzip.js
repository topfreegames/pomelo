'use strict';

const zlib = require('zlib')

module.exports = Component;

function Component(app, opts) {
    if (!(this instanceof Component)) {
        return new Component(app, opts);
    }
}

Component.prototype.name = '__gzip__';

Component.prototype.encode = function(key, msg) {
    let msgString = JSON.stringify(msg);
    return zlib.gzip(msgString, (err, buffer) => {
        return buffer;
    })
};

Component.prototype.decode = function(key, msg) {
    return msg.toString('base64');
};
