'use strict';

const zlib = require('zlib')
const GZIP_BYTE_THRESHOLD = 1000;
const BYTE_PER_CHAR = 8;

module.exports = Component;

function Component(app, opts) {
    if (!(this instanceof Component)) {
        return new Component(app, opts);
    }
}

Component.prototype.name = '__gzip__';

Component.prototype.encode = function(key, msg) {
    let msgString = JSON.stringify(msg);
    let usingGzip = msgString.length * BYTE_PER_CHAR >= GZIP_BYTE_THRESHOLD;
    let convertedData = usingGzip ? zlib.gzipSync(msgString) : Buffer.from(msgString, 'utf-8');
    let buffer = Buffer.alloc(1 + convertedData.byteLength);
    buffer.writeUint8(usingGzip);
    convertedData.copy(buffer, 1);
    return buffer;
};

Component.prototype.decode = function(key, body) {
    return JSON.parse(body.toString('utf8'));

    // the following code works, but we are not using gzip in the client.
    // the reason is that most requests doesn't need to be compressed because of their nature. Therefore we only send encoded data.
    
    // let isUsingGzip = body.readInt8() === 1;
    // let data;
    // if (isUsingGzip)
    //     data = JSON.parse(zlib.gunzipSync(msg.subarray(1)));
    // else
    //     data = JSON.parse(msg.subarray(1).toString('utf8'));
    // return data;
};
