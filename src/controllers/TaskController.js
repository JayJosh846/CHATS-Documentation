const {Response} = require('../libs');
const db = require('../models');
const {TaskService} = require('../services');
const {SanitizeObject, HttpStatusCode} = require('../utils');

class TaskController {
  static async createCashForWorkTask(req, res) {
    try {
      const tasks = req.body;
      const campaignId = req.params.campaign_id;
      const createdTasks = await TaskService.createCashForWorkTask(
        tasks,
        campaignId,
      );
      Response.setSuccess(
        HttpStatusCode.STATUS_CREATED,
        'Tasks created successfully',
        createdTasks,
      );
      return Response.send(res);
    } catch (error) {
      console.log(error, 'error');
      Response.setError(
        HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR,
        error.message,
      );
      return Response.send(res);
    }
  }

  static async getCashForWorkTasks(req, res) {
    try {
      let completed_tasks = 0;
      let task_count = 0;
      const params = SanitizeObject(req.params);
      const CashForWorkTasks = await TaskService.getCashForWorkTasks(params);

      if (!CashForWorkTasks) {
        Response.setSuccess(
          HttpStatusCode.STATUS_RESOURCE_NOT_FOUND,
          'Task Not Found',
        );
        return Response.send(res);
      }

      CashForWorkTasks.forEach(data => {
        data.dataValues.completed_tasks = data.completed_tasks
          ? completed_tasks++
          : completed_tasks;
      });

      Response.setSuccess(
        HttpStatusCode.STATUS_OK,
        'CashForWork Campaign Tasks retreived',
        CashForWorkTasks,
      );
      return Response.send(res);
    } catch (error) {
      Response.setError(
        HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR,
        error.message,
      );
      return Response.send(res);
    }
  }

  static async getTaskBeneficiaies(req, res) {
    try {
      let completed_task = 0;
      const params = SanitizeObject(req.params);
      const CashForWorkTasks = await TaskService.getCashForBeneficiaries(
        params,
      );
      if (!CashForWorkTasks) {
        Response.setSuccess(
          HttpStatusCode.STATUS_RESOURCE_NOT_FOUND,
          'Task Not Found',
        );
        return Response.send(res);
      }
      //console.log(CashForWorkTasks)

      CashForWorkTasks.AssignedWorkers.forEach(data => {
        data.TaskAssignment.status === 'completed'
          ? completed_task++
          : completed_task;
        data.dataValues.Assigned_UpdatedAt = data.TaskAssignment.updatedAt;
        data.dataValues.Assigned_CreatedAt = data.TaskAssignment.createdAt;
        data.dataValues.Assigned_Status = data.TaskAssignment.status;
      });
      CashForWorkTasks.dataValues.campleted_task = completed_task;
      CashForWorkTasks.dataValues.total_task_allowed =
        CashForWorkTasks.assignment_count;
      Response.setSuccess(
        HttpStatusCode.STATUS_OK,
        'CashForWork  Tasks Beneficiaries',
        CashForWorkTasks,
      );
      return Response.send(res);
    } catch (error) {
      Response.setError(
        HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR,
        error.message,
      );
      return Response.send(res);
    }
  }

  static async updateTask(req, res) {
    try {
      const task = req.body;
      const taskId = req.params.task_id;
      const updatedTask = await TaskService.updateTask(taskId, task);

      Response.setSuccess(
        HttpStatusCode.STATUS_OK,
        'Task updated',
        updatedTask,
      );
      return Response.send(res);
    } catch (error) {
      Response.setError(
        HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR,
        error.message,
      );
      return Response.send(res);
    }
  }

  static async amendTask(req, res) {
    try {
      const taskId = req.params.taskId;
      const task = await db.Task.findByPk(taskId);
      if (!task) {
        Response.setSuccess(
          HttpStatusCode.STATUS_RESOURCE_NOT_FOUND,
          'Task Not Found',
        );
        return Response.send(res);
      }
      const updated = await db.Task.update(
        {isCompleted: true},
        {where: {id: taskId}},
      );
      Response.setSuccess(HttpStatusCode.STATUS_OK, 'Task updated', updated);
      return Response.send(res);
    } catch (error) {
      Response.setError(
        HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR,
        error.message,
      );
      return Response.send(res);
    }
  }

  static async uploadEvidence(req, res) {
    const {taskProgressId} = req.params;
    const imageUrl = req.file.path;

    console.log(req.file, taskProgressId);

    try {
      const evidence = await TaskService.uploadProgressEvidence(
        taskProgressId,
        imageUrl,
      );
      if (evidence) {
        Response.setSuccess(
          HttpStatusCode.STATUS_OK,
          'Task Evidence Uploaded Successfully',
          evidence,
        );
        return Response.send(res);
      } else {
        Response.setError(
          HttpStatusCode.STATUS_BAD_REQUEST,
          'Something went wrong while uploading evidence',
        );
        return Response.send(res);
      }
    } catch (error) {
      Response.setError(
        HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR,
        error.message,
      );
      return Response.send(res);
    }
  }
}

module.exports = TaskController;
