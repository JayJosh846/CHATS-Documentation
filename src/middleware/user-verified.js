const {Response} = require('../libs');
const {HttpStatusCode} = require('../utils');
const IsUserVerified = async (req, res, next) => {
  try {
    const user = req.user;
    if (!user) {
      Response.setError(
        HttpStatusCode.STATUS_FORBIDDEN,
        'Unathorised request. Authenticated user missing.',
      );
      return Response.send(res);
    }
//!user.is_bvn_verified && 
    if(!user.is_nin_verified) {
      Response.setError(HttpStatusCode.STATUS_FORBIDDEN, 'Unathorised request. Indentity verification pending.');
      return Response.send(res);
    }

    next();
  } catch (error) {
    Response.setError(
      HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR,
      'Server error. Please retry.',
    );
    return Response.send(res);
  }
};

module.exports = {
  IsUserVerified,
};
