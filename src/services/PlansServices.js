const {userConst} = require('../constants');
const {Transaction, Sequelize, Plan, Subscriptions} = require('../models');
const {Op} = require('sequelize');

class PlanService {
  static async addPlan(newPlan) {
    return Plan.create(newCampaign);
  }
  static async getAllPlan(queryClause = null) {
    return Plan.findAll({
      order: [['createdAt', 'DESC']],
      where: {
        ...queryClause
      },
      include: ['Subscriptions']
    });
  }
  static async getPlanByIdWithSub(id) {
    return Plan.findByPk(id, {
      include: ['Subscriptions']
    });
  }
  static async getPlanById(id) {
    return Plan.findOne({where: {id}});
  }
  static async updatePlan(id, updatePlan) {
    try {
      const PlanToUpdate = await Plan.findOne({
        where: {
          id: Number(id)
        }
      });

      if (PlanToUpdate) {
        return await Plan.update(updatePlan, {
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
    return Plan.findAll({
      where: {
        id: Number(id)
      },
      include: ['Subscription']
    });
  }
  static async deletePlan(id) {
    try {
      const PlanToDelete = await Plan.findOne({
        where: {
          id: Number(id)
        }
      });

      if (PlanToDelete) {
        const deletedPlan = await Plan.destroy({
          where: {
            id: Number(id)
          }
        });
        return deletedPlan;
      }
      return null;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = PlanService;
