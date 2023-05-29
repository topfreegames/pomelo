'use strict';

const zlib = require('zlib')
const GZIP_BYTE_THRESHOLD = 200;

module.exports = Component;

function Component(app, opts) {
    if (!(this instanceof Component)) {
        return new Component(app, opts);
    }
}

Component.prototype.name = '__gzip__';

Component.prototype.encode = function(key, msg) {
    let msgString = JSON.stringify(msg);
    let originalMsgSize = Buffer.byteLength(msgString, 'utf8');
    let usingGzip = false;

    let convertedData;
    if (originalMsgSize >= GZIP_BYTE_THRESHOLD) {
      let gzipData = zlib.gzipSync(msgString);
      if (gzipData.byteLength < originalMsgSize) {
        convertedData = gzipData;
        usingGzip = true;
      }
    }
    
    if (!usingGzip) {
      convertedData = Buffer.from(msgString, 'utf-8')
    }
    
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
