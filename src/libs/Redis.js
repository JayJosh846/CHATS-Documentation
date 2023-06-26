const redis = require('redis');

const redisClient = redis.createClient(process.env.REDIS_URL, {
  enable_offline_queue: false
});

class RedisClient {
  static connect() {
    redisClient.on('error', err => {
      console.log(err);
      // this error is handled by an error handling function that will be explained later in this tutorial
      return new Error();
    });
  }
  static createKeyString = (email, ip) => `${email}_${ip}`;
}

module.exports = RedisClient;
