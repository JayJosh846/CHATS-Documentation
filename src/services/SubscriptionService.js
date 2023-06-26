const {OrgAdminRolesToAcl} = require('../utils').Types;
const {Op} = require('sequelize');

const {userConst} = require('../constants');

const {User, Ngo, Plan, Subscription} = require('../models');

const QueueService = require('./QueueService');
const MailerService = require('./MailerService');
const bcrypt = require('bcryptjs');

class SubscriptionService {
  static async create(subscription) {
    return await Subscription.create(subscription);
  }
  static async get(subscription) {}
  static async delete(subscription) {}
  static async update(subscription) {}
}

module.exports = SubscriptionService;
