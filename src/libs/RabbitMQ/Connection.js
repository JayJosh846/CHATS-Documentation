"use strict";
require("dotenv").config();

exports.__esModule = true;
var { Connection } = require("@droidsolutions-oss/amqp-ts");
exports["default"] = new Connection(`amqp://${process.env.RABBIT_HOST}`);
