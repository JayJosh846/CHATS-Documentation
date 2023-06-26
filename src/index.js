require("dotenv").config();
const http = require('http');
const logger = require('./libs').Logger;

const app = require("./app");
const PORT = process.env.PORT || 3000;

/**
 * Normalize a port into a number, string, or false.
 */
 function normalizePort(val) {
  let _port = parseInt(val, 10);

  if (isNaN(_port)) {
    // named pipe
    return val;
  }

  if (_port >= 0) {
    // port number
    return _port;
  }

  return false;
}

// Event listener for HTTP server "error" event.
function onError(error) {
  if (error.syscall !== 'listen') {
    throw error;
  }

  let bind = typeof port === 'string'
    ? 'Pipe ' + port
    : 'Port ' + port;

  // handle specific listen errors with friendly messages
  switch (error.code) {
    case 'EACCES':
      console.error(bind + ' requires elevated privileges');
      process.exit(1);
      break;
    case 'EADDRINUSE':
      console.error(bind + ' is already in use');
      process.exit(1);
      break;
    default:
      throw error;
  }
}

//  Event listener for HTTP server "listening" event.
function onListening() {
  let addr = server.address();
  let bind = typeof addr === 'string'
    ? 'pipe ' + addr
    : 'port ' + addr.port;
  logger.info('Listening on ' + bind);
}

const port = normalizePort(PORT);

app.set("port", port);
app.set("trust proxy", 1);

const server = http.createServer(app);
server.listen(port);
server.on("error", onError);
server.on('listening', onListening);
