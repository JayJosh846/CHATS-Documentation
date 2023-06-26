require('dotenv').config();
const db = require('../models');
const {util, Response, Logger} = require('../libs');
const {HttpStatusCode} = require('../utils');
const Validator = require('validatorjs');
const {UserService, PlanService, SubscriptionService} = require('../services');
const {SanitizeObject} = require('../utils');
const environ = process.env.NODE_ENV == 'development' ? 'd' : 'p';
const axios = require('axios');

class SubscriptionController {
  static async createSubscriptions(req, res) {
    try {
      const plan = await Subscriptions.create(req.body);
      res.status(201).json(plan);
    } catch (err) {
      res.status(400).json(err);
    }
  }
  static async getAllSubscriptions(req, res) {
    try {
      const Subscriptions = await Subscriptions.getAllSubscriptions();
    } catch (error) {
      console.log(error);
    }
  }
  static async getSubscriptions(req, res) {
    try {
    } catch (error) {}
  }
  static async getSubscriptions(req, res) {
    try {
    } catch (error) {}
  }
  static async updateSubscriptions(req, res) {
    try {
    } catch (error) {}
  }
  static async deleteSubscriptions(req, res) {
    try {
    } catch (error) {}
  }
}
module.exports = SubscriptionController;
