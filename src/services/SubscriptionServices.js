const {userConst} = require('../constants');
const {Transaction, Sequelize, Plan, Subscription, User} = require('../models');
const {Op} = require('sequelize');

class SubscriptionServices {
  static async addSubscription(newSub) {
    return Subscription.create(newCampaign);
  }
  static async getAllSubscriptions(queryClause = null) {
    return Subscription.findAll({
      order: [['createdAt', 'DESC']],
      where: {
        ...queryClause
      },
      include: ['Transaction']
    });
  }
  static async getSubByIdWithPlan(id) {
    return Subscription.findByPk(id, {
      include: ['Plan']
    });
  }
  static async getSubscriptionById(id) {
    return Subscription.findOne({where: {id}});
  }
  static async updateSubscription(id, updateSubscription) {
    try {
      const SubscriptionToUpdate = await Subscription.findOne({
        where: {
          id: Number(id)
        }
      });

      if (SubscriptionToUpdate) {
        return await Subscription.update(updateSubs, {
          where: {
            id: Number(id)
          }
        });
      }
      return null;
    } catch (error) {
      throw error;
    }
  }

  static async getAPlan(id) {
    return Subscription.findAll({
      where: {
        id: Number(id)
      },
      include: ['Subscription']
    });
  }
  static async deleteSubscription(id) {
    try {
      const SubscriptionToDelete = await Subscription.findOne({
        where: {
          id: Number(id)
        }
      });

      if (SubscriptionToDelete) {
        const deletedSub = await Subscription.destroy({
          where: {
            id: Number(id)
          }
        });
        return deletedSub;
      }
      return null;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = SubscriptionServices;
