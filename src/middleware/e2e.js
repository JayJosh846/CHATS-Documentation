require('dotenv').config();
const util = require('../libs/Utils');

module.exports = (req, res, next) => {
  try {
    req.body = util.decryptRequest(req.body.data);
    next();
  } catch (error) {
    next();
  }
};
