const {createClient} = require('redis');



const RedisClient = createClient({
  socket: {
    port: process.env.REDIS_PORT,
    tls: true,
  },
});

class RedisService {
    static async connectRedis() {
    try {
      await RedisClient.connect();
      client.on('error', err => console.log('Redis Client Error'));
    } catch (error) {
      Logger.error('Redis ' + error);
    }
  }
}

module.exports = {RedisService, RedisClient};