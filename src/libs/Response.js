const {ResponseStatus} = require('../utils');

class Response {
  constructor() {
    this.type = null;
    this.data = null;
    this.message = null;
    this.errors = null;
    this.statusCode = null;
  }

  setSuccess(statusCode, message,  data = null) {
    this.statusCode = statusCode;
    this.message = message;
    this.data = data;
    this.type = ResponseStatus.SUCCESS;
  }

  setError(statusCode, message, errors = null) {
    this.statusCode = statusCode;
    this.message = message;
    this.errors = errors;
    this.type = ResponseStatus.FAILURE;
  }

  send(res) {
    let result;
    if (this.type === ResponseStatus.SUCCESS) {
      result = {
        code: this.statusCode,
        status: this.type,
        message: this.message,
        data: this.data,
      };
    } else {
      result = {
        code: this.statusCode,
        status: this.type,
        message: this.message,
        ...(this.errors && {errors: this.errors}),
      };
    }

    return res.status(result.code).json(result);
  }
}

module.exports = new Response();
