const {Response} = require('../libs');
const {compareHash, HttpStatusCode} = require('../utils');

const IsRequestWithValidPin = async (req, res, next) => {
  try {
    const pin = req.body.pin || req.query.pin || null;
    if (!req.user) {
      Response.setError(
        HttpStatusCode.STATUS_UNAUTHORIZED,
        'Authorized user not found.',
      );
      return Response.send(res);
    }

    if (!req.user.pin) {
      Response.setError(
        HttpStatusCode.STATUS_BAD_REQUEST,
        'Transaction PIN not enabled. Please enable.',
      );
      return Response.send(res);
    }

    if (!pin) {
      Response.setError(
        HttpStatusCode.STATUS_BAD_REQUEST,
        'PIN missing from request.',
      );
      return Response.send(res);
    }

    if (!compareHash(req.body.pin, req.user.pin)) {
      Response.setError(
        HttpStatusCode.STATUS_BAD_REQUEST,
        'Invalid or wrong old PIN.',
      );
      return Response.send(res);
    }
    next();
  } catch (error) {
    console.log(error);
    Response.setError(
      HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR,
      'Transaction PIN service error.',
    );
    return Response.send(res);
  }
};

exports.IsRequestWithValidPin = IsRequestWithValidPin;
