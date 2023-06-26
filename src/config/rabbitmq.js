require('dotenv').config();

module.exports = {
  connectionURL: `amqp://${process.env.RABBIT_HOST}`
}