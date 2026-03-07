'use strict';

const Redis = require('ioredis');
const commander = require('./common/cmd');
const constants = require('../util/constants');
const utils = require('../util/utils');
const logger = require('pomelo-logger').getLogger('pomelo', __filename);

module.exports = Monitor;

function Monitor(app, opts) {
  if (!(this instanceof Monitor)) {
    return new Monitor(app, opts);
  }

  this.app = app;
  this.mode = opts.mode || 'single';
  this.name = opts.name || null;
  this.redisNodes = opts.redisNodes || [];
  this.period = opts.period || constants.TIME.DEFAULT_REDIS_REG;
  this.expire = opts.expire || constants.TIME.DEFAULT_REDIS_EXPIRE;
  this.password = opts.password || null;
  this.redisOpts = opts.redisOpts || {};
}

Monitor.prototype.start = function(cb) {
  this.started = false;
  if (this.mode === 'single') {
    this.client = new Redis(this.redisNodes.port,
                            this.redisNodes.host, this.redisOpts);
  } else {
    this.client = new Redis({
      sentinels: this.redisNodes.hosts,
      password: this.password,
      name: this.name
    }, this.redisOpts);
  }

  this.client.on('connect', () => {
    logger.info('%s connected to redis successfully !', this.app.serverId);
    if (this.password) {
      this.client.auth(this.password);
    }
    _watcherCluster2Command.call(this);

    if (this.mode === 'multiple') {
      _clearPingTimer(this, () => {
        _getMaster(this, this.redisNodes);
      });
    }

    if (!this.started) {
      this.started = true;
      this.timer = setInterval(_watcherCluster2Command.bind(this),
                               this.period);
      utils.invokeCallback(cb);
    }
  });

  this.client.on('error', function(error) {
    logger.error('[redisMonitor] server has errors with redis server, ' +
                 'with error: %j', error);
  });

  this.client.on('close', function() {
    logger.error('[redisMonitor] server has been closed with redis server.');
  });

  this.client.on('end', function() {
    logger.error('[redisMonitor] server is over and without reconnection.');
  });
};

Monitor.prototype.stop = function() {
  this.client.disconnect();

  if (this.pingRedis) {
    this.pingRedis.disconnect();
  }
  clearInterval(this.timer);
};

Monitor.prototype.sendCommandResult = function(result, type) {
  let key;
  if (!type) {
    // send result to redis, key:
    key = constants.RESERVED.REDIS_REG_RES_PREFIX +
      this.app.env + ':' +
      this.app.getCurServer().id;

  } else {
    //send show info to redis, key:
    key = constants.RESERVED.REDIS_REG_RES_PREFIX +
      this.app.env + ':' +
      this.app.getCurServer().id + ':' + type;
  }

  this.client.set(key, result).catch((err) => {
    logger.error('set %j err: %j', key, err);
  });
};

function _watcherCluster2Command() {
  _getClusterInfo(this, this.app, this.client, this.app.getCurServer());
  _getCommand(this, this.app, this.client, this.app.getCurServer());
}

function _getClusterInfo(mon, app, redis, serverInfo) {
  const results = {};
  const key = constants.RESERVED.REDIS_REG_PREFIX + app.env;
  serverInfo.pid = process.pid;
  const args = [key, Date.now() + mon.expire, JSON.stringify(serverInfo)];

  redis.zadd(...args).then(() => {
    const queryArgs = [key, Date.now(), '+inf'];
    return redis.zrangebyscore(...queryArgs);
  }).then((res) => {
    let i;
    let server;
    for (i = res.length - 1; i >= 0; i--) {
      server = JSON.parse(res[i]);
      results[server.id] = server;
    }
    logger.debug('cluster servers info: %j', results);
    app.replaceServers(results);
  }).catch((err) => {
    logger.error('getClusterInfo err: %j', err);
  });
}

function _getCommand(mon, app, redis, serverInfo) {
  const key = constants.RESERVED.REDIS_REG_PREFIX +
    app.env + ':' + serverInfo.id;

  redis.get(key).then((res) => {
    if (res) {
      logger.debug('get cmd: ', res);
      return redis.del(key).then(() => {
        commander.init(mon, res);
      });
    }
  }).catch((err) => {
    logger.error('get pomelo-register cmd err %j', err);
  });
}

function _getMaster(mon, redisNodes) {
  logger.info('[redisMonitor] get master');
  const mainClient = mon.client;
  const clients = redisNodes.redis;

  for (let i = 0; i < clients.length; i++) {
    logger.info('[redisMonitor] get master index: %s, port: %s, host: %s',
                i, clients[i].port, clients[i].host);
    const client = new Redis({
      host: clients[i].host,
      port: clients[i].port,
      password: redisNodes.password
    });

    client.on('error', () => {
      logger.error('[redisMonitor] monitor redis connect error');
      client.disconnect();
    });

    client.info('replication').then((info) => {
      logger.info('[redisMonitor] connect redis host: %s port: %s ok.',
                  clients[i].host, clients[i].port);

      const obj = {};
      const lines = info.toString().split('\r\n');
      let parts;
      lines.forEach((line) => {
        parts = line.split(':');
        if (parts[1]) {
          obj[parts[0]] = parts[1];
        }
      });

      if (obj.role === 'master') {
        mon.pingRedis = client;
        mon.pingtimer = setInterval(() => {
          logger.info('[redisMonitor] ping redis with host: %s port: %s',
                      clients[i].host, clients[i].port);
          _ping(mon, client, mainClient);
        }, constants.TIME.DEFAULT_REDIS_PING);
      } else {
        client.disconnect();
      }
    }).catch((err) => {
      logger.error('[redisMonitor] get redis info error ' +
                   'with host: %s port: %s',
                   clients[i].host, clients[i].port);
      client.disconnect();
    });
  }
}

function _ping(mon, client, rds) {
  const timeout = setTimeout(() => {
    logger.error('[redisMonitor] ping redis timeout');
    clearInterval(mon.pingtimer);
    logger.info('[redisMonitor] clear pingtimer timeout');
    client.disconnect();
    client = null;
    mon.pingtimer = null;
    rds.disconnect();
    rds = null;
    mon.start(() => {});
  }, constants.TIME.DEFAULT_REDIS_PING_TIMEOUT);

  client.ping().then(() => {
    clearTimeout(timeout);
    logger.info('[redisMonitor] ping');
  }).catch((err) => {
    clearTimeout(timeout);
    logger.error('[redisMonitor] redis ping error', err);
  });
}

function _clearPingTimer(mon, cb) {
  logger.info('[redisMonitor] clear ping timer');
  clearInterval(mon.pingtimer);
  const client = mon.pingRedis;
  if (client) {
    client.disconnect();
    mon.pingRedis = null;
    mon.pingtimer = null;
  }
  utils.invokeCallback(cb);
}
