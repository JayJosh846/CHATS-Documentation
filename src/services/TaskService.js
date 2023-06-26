const {
  Campaign,
  Task,
  TaskUsers,
  User,
  TaskProgress,
  TaskProgressEvidence
} = require('../models');
const {publicAttr} = require('../constants/user.constants');

class TaskService {
  static async createCashForWorkTask(tasks, campaignId) {
    // check if campaign exists

    const campaign = await Campaign.findOne({
      where: {
        id: campaignId,
        type: 'cash-for-work'
      }
    });

    if (!campaign) throw new Error('Invalid campaign id');

    if (campaign.status == 'completed')
      throw new Error('Campaign is already completed');
    if (campaign.status == 'ended')
      throw new Error('Campaign is already ended');

    const _tasks = tasks.map(task => {
      task.CampaignId = campaignId;
      return task;
    });

    return Task.bulkCreate(_tasks);
  }

  static async getCashForWorkTasks(params) {
    return Task.findAll({
      where: {
        CampaignId: params.campaign_id
      },
      include: [
        {
          model: User,
          as: 'AssignedWorkers',
          attributes: publicAttr
        }
      ]
    });
  }

  static async getCashForBeneficiaries(params) {
    return Task.findOne({
      where: {
        id: params.task_id
      },
      include: [
        {
          model: User,
          as: 'AssignedWorkers',
          attributes: publicAttr
        }
      ]
    });
  }

  static async updateTask(id, updateTaskObj) {
    const task = await Task.findByPk(id);
    if (!task) throw new Error('Invalid task id');

    return task.update(updateTaskObj);
  }

  static async uploadProgressEvidence(taskProgressId, imageUrl) {
    const taskProgress = await TaskProgress.findByPk(taskProgressId);

    if (!taskProgress) {
      throw new Error('No progress task found');
    } else
      return await TaskProgressEvidence.create({
        TaskProgressId: taskProgressId,
        imageUrl
      });
  }
}

module.exports = TaskService;
