const CampaignService = require('../services/CampaignService');
const util = require('../libs/Utils');
const db = require('../models');
const Validator = require('validatorjs');
const {Op} = require('sequelize');
const formidable = require('formidable');
const uploadFile = require('./AmazonController');
const {userConst} = require('../constants');
var amqp_1 = require('./../libs/RabbitMQ/Connection');
const {Message} = require('@droidsolutions-oss/amqp-ts');
const {Response, Logger} = require('../libs');
const {AclRoles} = require('../utils');
const {async} = require('regenerator-runtime');
const {
  BlockchainService,
  ZohoService,
  WalletService,
  QueueService
} = require('../services');
var transferToQueue = amqp_1['default'].declareQueue('transferTo', {
  durable: true
});
const environ = process.env.NODE_ENV == 'development' ? 'd' : 'p';

class CashForWorkController {
  constructor() {}

  static async newTask(req, res) {
    try {
      const data = req.body;

      const rules = {
        name: 'required|string',
        description: 'required|string',
        campaign: 'required|numeric',
        amount: 'required|numeric',
        approval: 'required|string|in:supervisor,both'
      };

      const validation = new Validator(data, rules);

      if (validation.fails()) {
        util.setError(400, validation.errors);
        return util.send(res);
      } else {
        const campaignExist = await db.Campaign.findOne({
          where: {id: data.campaign, type: 'cash-for-work'},
          include: {model: db.Tasks, as: 'Jobs'}
        });

        if (!campaignExist) {
          util.setError(400, 'Invalid Cash-for-Work Id');
          return util.send(res);
        }

        if (campaignExist.Jobs.length) {
          const names = campaignExist.Jobs.map(element => {
            return String(element.name).toLowerCase();
          });
          if (names.includes(String(data.name).toLowerCase())) {
            util.setError(
              400,
              'A Task with the same name already exist for this Campaign'
            );
            return util.send(res);
          }
        }

        const taskEntity = {
          name: data.name,
          description: data.description,
          amount: data.amount
        };

        const newTask = await campaignExist.createJob(taskEntity);

        util.setSuccess(201, 'Task Added to Campaign Successfully');
        return util.send(res);
      }
    } catch (err) {
      util.setError(500, 'An Error Occurred. Please Try Again Later.');
      return util.send(res);
    }
  }

  static async getTasks(req, res) {
    try {
      const campaignId = req.params.campaignId;
      const campaignExist = await db.Campaign.findOne({
        where: {id: campaignId, type: 'cash-for-work'},
        include: {
          model: db.Tasks,
          as: 'Jobs',
          attributes: {exclude: ['CampaignId']}
        }
      });

      util.setSuccess(200, 'Tasks', {tasks: campaignExist.Jobs});
      return util.send(res);
    } catch (error) {
      util.setError(404, 'Invalid Campaign');
      return util.send(res);
    }
  }

  static async getAllCashForWork(req, res) {
    const cashforworks = await db.Campaign.findAll({
      where: {
        type: 'cash-for-work'
      },
      include: {model: db.Tasks, as: 'Jobs'}
    });

    const cashForWorkArray = [];

    cashforworks.forEach(cashforwork => {
      const jobs = cashforwork.Jobs;
      const totalTasks = jobs.length;

      const completed = jobs.filter(element => {
        return element.status == 'fulfilled';
      });

      const completedTasks = completed.length;

      const progress = Math.ceil((completedTasks / totalTasks) * 100);

      const cashForWorkDetail = {
        id: cashforwork.id,
        title: cashforwork.title,
        description: cashforwork.description,
        status: cashforwork.status,
        budget: cashforwork.budget,
        totalTasks,
        completedTasks: completedTasks,
        progress,
        location: cashforwork.location,
        start_date: cashforwork.start_date,
        end_date: cashforwork.end_date,
        createdAt: cashforwork.createdAt,
        updatedAt: cashforwork.updatedAt
      };

      cashForWorkArray.push(cashForWorkDetail);
    });

    util.setSuccess(200, 'Campaign retrieved', cashForWorkArray);
    return util.send(res);
  }

  static async getCashForWork(req, res) {
    try {
      const id = req.params.cashforworkid;
      const cashforwork = await db.Campaign.findOne({
        where: {
          id,
          type: 'cash-for-work'
        },
        include: {
          model: db.Tasks,
          as: 'Jobs',
          include: {
            model: db.TaskUsers,
            as: 'AssociatedWorkers',
            include: {
              model: db.TaskProgress,
              as: 'CompletionRequest',
              include: {
                model: db.TaskProgressEvidence,
                as: 'Evidences'
              }
            }
          }
        }
      });

      const jobs = cashforwork.Jobs;
      const totalTasks = jobs.length;

      const completed = jobs.filter(element => {
        return element.status == 'fulfilled';
      });

      const completedTasks = completed.length;

      const progress = Math.ceil((completedTasks / totalTasks) * 100);

      const cashForWorkDetail = {
        id: cashforwork.id,
        title: cashforwork.title,
        description: cashforwork.description,
        status: cashforwork.status,
        budget: cashforwork.budget,
        totalTasks,
        completedTasks: completedTasks,
        progress,
        location: cashforwork.location,
        start_date: cashforwork.start_date,
        end_date: cashforwork.end_date,
        createdAt: cashforwork.createdAt,
        updatedAt: cashforwork.updatedAt
      };

      util.setSuccess(200, 'Cash-for-work Retrieved', {cashForWorkDetail});
      return util.send(res);
    } catch (error) {
      util.setError(404, 'Invalid Cash For Work Id');
      return util.send(res);
    }
  }

  static async getTask(req, res) {
    try {
      const taskId = req.params.taskId;

      const task = await db.Tasks.findOne({
        where: {
          id: taskId
        },
        attributes: {exclude: ['CampaignId']},
        include: [
          {
            model: db.Campaign,
            as: 'Campaign'
          },
          {
            model: db.TaskUsers,
            as: 'AssociatedWorkers',
            attributes: {exclude: ['TaskId']},
            include: [
              {
                model: db.User,
                as: 'Worker',
                attributes: {
                  exclude: [
                    'nfc',
                    'password',
                    'dob',
                    'profile_pic',
                    'location',
                    'is_email_verified',
                    'is_phone_verified',
                    'is_bvn_verified',
                    'is_self_signup',
                    'is_public',
                    'is_tfa_enabled',
                    'last_login',
                    'tfa_secret',
                    'bvn',
                    'nin',
                    'pin'
                  ]
                }
              },
              {
                model: db.TaskProgress,
                as: 'CompletionRequest',
                include: {
                  model: db.TaskProgressEvidence,
                  as: 'Evidences'
                }
              }
            ]
          }
        ]
      });

      util.setSuccess(200, 'Task Retrieved', {task});
      return util.send(res);
    } catch (error) {
      console.log(error.message);

      util.setError(404, 'Invalid Task Id');
      return util.send(res);
    }
  }

  static async addWorkersToTask(req, res) {
    try {
      const data = req.body;

      const rules = {
        users: 'required|array',
        taskId: 'required|numeric',
        'users.*.UserId': 'required|numeric',
        'users.*.type': 'required|string|in:supervisor,worker'
      };

      const validation = new Validator(data, rules, {
        array: ':attribute field must be an array'
      });

      if (validation.fails()) {
        util.setError(400, validation.errors);
        return util.send(res);
      } else {
        const usersIds = data.users.map(element => {
          return element.UserId;
        });

        const users = await db.User.findAll({
          where: {
            id: {
              [Op.in]: usersIds
            }
          }
        });

        if (users.length !== usersIds.length) {
          util.setError(400, 'User(s) are invalid');
          return util.send(res);
        }

        const task = await db.Tasks.findOne({
          where: {id: data.taskId},
          include: {model: db.TaskUsers, as: 'AssociatedWorkers'}
        });

        if (!task) {
          util.setError(400, 'Task Id is Invalid');
          return util.send(res);
        }

        if (task.AssociatedWorkers) {
          const addedUsers = task.AssociatedWorkers.map(element => {
            return element.UserId;
          });

          const dd = addedUsers.some(el => {
            return usersIds.includes(el);
          });

          if (dd) {
            util.setError(400, 'User(s) has been added to Task already');
            return util.send(res);
          }
        }

        data.users.forEach(async element => {
          await task.createAssociatedWorker({
            UserId: element.UserId,
            type: element.type
          });
        });

        util.setSuccess(200, 'Workers added successfully');
        return util.send(res);
      }
    } catch (error) {
      util.setError(500, 'Internal Server Error');
      return util.send(res);
    }
  }

  static async submitProgress(req, res) {
    var form = new formidable.IncomingForm({multiples: true});
    form.parse(req, async (err, fields, files) => {
      const rules = {
        taskId: 'required|numeric',
        userId: 'required|numeric',
        description: 'required|string'
      };

      const validation = new Validator(fields, rules);

      if (validation.fails()) {
        util.setError(400, validation.errors);
        return util.send(res);
      } else {
        if (!Array.isArray(files.images)) {
          util.setError(400, 'Minimum of 5 images is allowed');
          return util.send(res);
        }

        if (files.images.length < 5) {
          util.setError(400, 'Minimum of 5 images is allowed');
          return util.send(res);
        }

        const task = await db.Tasks.findByPk(fields.taskId);
        if (!task) {
          util.setError(400, 'Invalid Task Id');
          return util.send(res);
        }

        if (task.status === 'fulfilled') {
          util.setError(
            400,
            'Task has been fulfilled. No need for an approval request'
          );
          return util.send(res);
        }

        const workerRecord = await db.TaskUsers.findOne({
          where: {TaskId: fields.taskId, UserId: fields.userId},
          include: {model: db.TaskProgress, as: 'CompletionRequest'}
        });

        if (!workerRecord) {
          util.setError(
            400,
            'Task Id is Invalid/User has not been added to this task'
          );
          return util.send(res);
        }

        if (task.approval === 'supervisor' && workerRecord.type === 'worker') {
          util.setError(
            400,
            'Only Supervisors can submit approval Request for this campaign'
          );
          return util.send(res);
        }

        const records = await db.TaskUsers.findAll({
          where: {
            UserId: fields.userId,
            TaskId: fields.taskId
          }
        });

        const recordIds = records.map(element => {
          return element.id;
        });

        const request = await db.TaskProgress.findOne({
          where: {
            TaskUserId: {
              [Op.in]: recordIds
            }
          }
        });

        if (request) {
          util.setError(
            400,
            'Progress Report has already been submitted for this task'
          );
          return util.send(res);
        }

        let i = 0;
        let uploadFilePromises = [];
        files.images.forEach(async image => {
          let ext = image.name.substring(image.name.lastIndexOf('.') + 1);
          uploadFilePromises.push(
            uploadFile(
              image,
              'pge-' + environ + '-' + fields.taskId + ++i + '.' + ext,
              'convexity-progress-evidence'
            )
          );
        });

        Promise.all(uploadFilePromises).then(async responses => {
          await workerRecord
            .createCompletionRequest({description: fields.description})
            .then(progressReport => {
              responses.forEach(async url => {
                await progressReport.createEvidence({imageUrl: url});
              });
            });
        });
        let status = '';

        if (workerRecord.type == 'supervisor') {
          const task = await db.Tasks.findByPk(fields.taskId);
          task.status = 'fulfilled';
          task.save();
        }

        util.setSuccess(201, 'Progress Report Submitted');
        return util.send(res);
      }
    });
  }

  static async approveProgress(req, res) {
    try {
      const data = req.body;
      const rules = {
        userId: 'required|numeric',
        taskId: 'required|numeric'
      };

      const validation = new Validator(data, rules);

      if (validation.fails()) {
        util.setError(400, validation.errors);
        return util.send(res);
      } else {
        const workerRecord = await db.TaskUsers.findOne({
          where: {
            UserId: data.userId,
            TaskId: data.taskId,
            type: 'supervisor'
          }
        });

        if (!workerRecord) {
          util.setError(400, 'Unauthorized! User is not a supervisor');
          return util.send(res);
        }

        const task = await db.Tasks.findByPk(data.taskId);
        task.status = 'fulfilled';
        task.save();

        util.setError(200, 'Completion Request successfully approved');
        return util.send(res);
      }
    } catch (err) {
      console.log(err.message);
      util.setError(500, 'Internal Server Error');
      return util.send(res);
    }
  }

  static async payWages(req, res) {
    try {
      const data = req.body;

      const rules = {
        taskId: 'required|numeric'
      };

      const validation = new Validator(data, rules);

      if (validation.fails()) {
        util.setError(400, validation.errors);
        return util.send(res);
      } else {
        const taskExist = await db.Tasks.findOne({
          where: {id: data.taskId},
          include: [
            {
              as: 'Campaign',
              model: db.Campaign,
              include: {
                model: db.OrganisationMembers,
                as: 'OrganisationMember'
              }
            },
            {
              model: db.TaskUsers,
              as: 'AssociatedWorkers'
            },
            {
              model: db.Transaction,
              as: 'Transaction'
            }
          ]
        });

        if (!taskExist) {
          util.setError(400, 'Invalid Task Id');
          return util.send(res);
        }

        const isMember = await db.OrganisationMembers.findOne({
          where: {
            OrganisationId:
              taskExist.Campaign.OrganisationMember.OrganisationId,
            UserId: req.user.id
          }
        });

        if (taskExist.Transaction.length) {
          util.setError(422, 'Payments has already been initiated for Workers');
          return util.send(res);
        }

        if (!isMember) {
          util.setError(401, 'Unauthorised! Not a staff of the organisation');
          return util.send(res);
        }

        if (!taskExist) {
          util.setError(422, 'Invalid Task');
          return util.send(res);
        }

        if (!taskExist.AssociatedWorkers.length) {
          util.setError(
            422,
            'No Worker Added to Task, Therefore Wages cannot be paid'
          );
          return util.send(res);
        }

        const userIds = taskExist.AssociatedWorkers.map(el => {
          return el.UserId;
        });

        const workersWallets = await db.Wallet.findAll({
          where: {
            AccountUserId: {
              [Op.in]: userIds
            },
            CampaignId: null,
            AccountUserType: 'user'
          }
        });

        const ngoWallet = await db.Wallet.findOne({
          where: {
            AccountUserId: taskExist.Campaign.OrganisationMember.OrganisationId,
            CampaignId: taskExist.Campaign.id,
            AccountUserType: 'organisation'
          }
        });

        const totalAmount = taskExist.amount * workersWallets.length;

        if (totalAmount > ngoWallet.balance) {
          util.setError(
            400,
            'Ngo Wallet Balance is insufficient for this transaction'
          );
          return util.send(res);
        }

        workersWallets.forEach(async wallet => {
          await taskExist
            .createTransaction({
              walletSenderId: ngoWallet.uuid,
              walletRecieverId: wallet.uuid,
              amount: taskExist.amount,
              narration: 'Wages for ' + taskExist.name + ' task '
            })
            .then(transaction => {
              transferToQueue.send(
                new Message(
                  {
                    senderAddress: ngoWallet.address,
                    senderPass: ngoWallet.privateKey,
                    reciepientAddress: wallet.address,
                    amount: taskExist.amount,
                    transaction: transaction.uuid
                  },
                  {contentType: 'application/json'}
                )
              );
            });
        });

        util.setSuccess(200, 'Payment Initiated');
        return util.send(res);
      }
    } catch (error) {
      console.log(error.message);
      util.setError(500, 'Internal Server Error');
      return util.send(res);
    }
  }

  static async viewCashForWorkRefractor(req, res) {
    try {
      const beneficiary = await db.TaskAssignment.findAll({
        where: {UserId: req.user.id},
        include: [
          {
            model: db.TaskAssignmentEvidence,
            as: 'SubmittedEvidences'
          }
        ]
      });

      if (beneficiary) {
        util.setSuccess(200, 'Task Assignment Retrieved', beneficiary);
      } else {
        util.setSuccess(200, 'Task Assignment Not Recieved', beneficiary);
      }
      return util.send(res);
    } catch (error) {
      console.log(error.message);
      util.setError(500, 'Internal Server Error' + error);
      return util.send(res);
    }
  }

  static async viewCashForWorkRefractorFieldApp(req, res) {
    const {beneficiaryId} = req.params;
    try {
      const beneficiary = await db.TaskAssignment.findAll({
        where: {UserId: beneficiaryId},
        include: [
          {
            model: db.TaskAssignmentEvidence,
            as: 'SubmittedEvidences'
          }
        ]
      });

      if (beneficiary) {
        util.setSuccess(200, 'Task Assignment Retrieved', beneficiary);
      } else {
        util.setSuccess(200, 'Task Assignment Not Recieved', beneficiary);
      }
      return util.send(res);
    } catch (error) {
      console.log(error.message);
      util.setError(500, 'Internal Server Error' + error);
      return util.send(res);
    }
  }

  static async pickTaskFromCampaign(req, res) {
    const data = req.body;
    const rules = {
      UserId: 'required|numeric',
      TaskId: 'required|numeric'
    };

    const validation = new Validator(data, rules);

    try {
      if (validation.fails()) {
        util.setError(400, validation.errors);
        return util.send(res);
      } else {
        const exist = await db.User.findOne({
          where: {RoleId: AclRoles.Beneficiary, id: data.UserId}
        });
        const count = await db.TaskAssignment.findAll();
        const assigned = await db.TaskAssignment.findOne({
          where: {UserId: data.UserId, TaskId: data.TaskId}
        });
        if (assigned) {
          util.setError(400, 'you have already pick a this task');
          return util.send(res);
        } else if (exist) {
          const task = await db.Task.findByPk(data.TaskId);
          if (task && task.assigned != task.assignment_count) {
            const TaskAssignment = await db.TaskAssignment.create({
              id: count.length + 1,
              UserId: data.UserId,
              status: 'in progress',
              TaskId: data.TaskId
            });
            if (TaskAssignment) {
              await db.Task.update(
                {
                  assigned: task.assigned + 1
                },
                {where: {id: data.TaskId}}
              );
              util.setSuccess(200, 'Success Picking Task', TaskAssignment);
              return util.send(res);
            } else {
              util.setError(400, 'Something Went Wrong While Picking Task');
              return util.send(res);
            }
          } else
            util.setSuccess(
              400,
              `Only ${task.assignment_count} entries are allowed on this task`
            );
        } else {
          util.setSuccess(404, 'Beneficiary Not Found');
        }
        return util.send(res);
      }
    } catch (error) {
      console.log(error.message);
      util.setError(500, 'Internal Server Error' + error);
      return util.send(res);
    }
  }

  static async evidence(req, res) {
    try {
      //const mneumonic = await db.Wallet.findOne({where: {CampaignId: 9, OrganisationId: 1}});
      //const mneumonic = await ZohoService.generateRefreshToken()
      const mneumonic = await BlockchainService.switchWithdrawal(req.body);
      if (mneumonic) {
        Response.setSuccess(200, 'Task Evidence', mneumonic);
        return Response.send(res);
      }
      Response.setSuccess(200, 'nothing', mneumonic);
      return Response.send(res);
    } catch (error) {
      util.setError(500, 'Internal Server Error' + error);
      return util.send(res);
    }
  }
  /*


      
      
       else {
        if (!files) {
          Response.setError(422, "Task Assignment Evidence Required");
          return Response.send(res);
        } else {
          const task = await db.TaskAssignment.findOne({where: {TaskId: TaskAssignmentId}});
          if (task) {
            const extension = req.file.mimetype.split('/').pop();
            
        const url =  await uploadFile(
              files,
              "pge-" + environ + "-" + TaskAssignmentId + "-i." + extension,
              "convexity-progress-evidence"
            )
              await db.TaskAssignmentEvidence.create({
                uploads: url,
                TaskAssignmentId,
                comment,
                type,
                source: 'beneficiary'
              });
              Response.setSuccess(200, "Success Uploading  Task Evidence");
            return Response.send(res);
            
          } else {
            Response.setError(422, "Task Not Found");
            return Response.send(res);
          }
        }
      }
*/

  static async uploadProgreeEvidenceByBeneficiary(req, res) {
    const {TaskAssignmentId, comment, type} = req.body;
    let uploadArray = [];
    const files = req.files;
    const rules = {
      TaskAssignmentId: 'required|numeric',
      comment: 'required|string',
      type: 'required|string'
    };

    try {
      const validation = new Validator(req.body, rules);
      if (validation.fails()) {
        Response.setError(422, validation.errors);
        return Response.send(res);
      }
      if (!files) {
        Response.setError(422, 'Please upload file evidence');
        return Response.send(res);
      }
      const isTaskExist = await db.TaskAssignment.findOne({
        where: {id: TaskAssignmentId, UserId: req.user.id}
      });
      if (!isTaskExist) {
        Response.setError(422, 'Task Assignment Not Found');
        return Response.send(res);
      }
      if (isTaskExist.status === 'completed') {
        Response.setError(409, 'Evidence already uploaded');
        return Response.send(res);
      }
      if (files.length > 5) {
        Response.setError(200, 'Only Five(5) Files Allowed');
        return Response.send(res);
      }

      await Promise.all(
        files.map(async file => {
          const extension = file.mimetype.split('/').pop();
          const url = await uploadFile(
            file,
            'u-' +
              environ +
              '-' +
              TaskAssignmentId +
              '' +
              file.originalname +
              '-i.' +
              extension,
            'convexity-progress-evidence'
          );
          uploadArray.push(url);
        })
      );

      if (uploadArray.length) {
        if (isTaskExist.status === 'rejected') {
          await db.TaskAssignmentEvidence.update(
            {
              ...req.body,
              uploads: uploadArray
            },
            {where: {id: TaskAssignmentId}}
          );
        }
        await db.TaskAssignmentEvidence.create({
          uploads: uploadArray,
          TaskAssignmentId,
          comment,
          type,
          source: 'beneficiary'
        });
        await db.TaskAssignment.update(
          {
            uploaded_evidence: true
          },
          {where: {UserId: isTaskExist.UserId}}
        );
        await db.TaskAssignment.update(
          {status: 'completed'},
          {where: {id: TaskAssignmentId}}
        );
        Response.setSuccess(
          200,
          'Success Uploading  Task Evidence',
          uploadArray
        );
        return Response.send(res);
      }
    } catch (error) {
      Response.setError(500, 'Internal Server Error.test' + error);
      return Response.send(res);
    }
  }

  static async uploadProgreeEvidenceFieldAgent(req, res) {
    const {TaskAssignmentId, comment, type} = req.body;
    let uploadArray = [];
    let {beneficiaryId} = req.params;
    const files = req.files;
    const rules = {
      'location.longitude': 'required|numeric',
      'location.latitude': 'required|numeric',
      'location.time_stamp': 'required|date',
      TaskAssignmentId: 'required|numeric',
      comment: 'required|string',
      type: 'required|string'
    };

    try {
      Logger.info(`Request Body Object ${JSON.stringify(req.body)}`);
      const validation = new Validator(req.body, rules);
      if (validation.fails()) {
        Response.setError(422, Object.values(validation.errors.errors)[0][0]);
        return Response.send(res);
      }
      if (!files) {
        Response.setError(422, 'Please upload file evidence');
        return Response.send(res);
      }
      const isTaskExist = await db.TaskAssignment.findOne({
        where: {id: TaskAssignmentId, UserId: beneficiaryId}
      });
      if (!isTaskExist) {
        Response.setError(422, 'Task Assignment Not Found');
        return Response.send(res);
      }
      if (isTaskExist.status === 'completed') {
        Response.setError(409, 'Evidence already uploaded');
        return Response.send(res);
      }

      if (files.length > 5) {
        Response.setError(200, 'Only Five(5) Files Allowed');
        return Response.send(res);
      }

      await Promise.all(
        files.map(async file => {
          const extension = file.mimetype.split('/').pop();
          const url = await uploadFile(
            file,
            'u-' +
              environ +
              '-' +
              TaskAssignmentId +
              '' +
              file.originalname +
              '-i.' +
              extension,
            'convexity-progress-evidence'
          );
          uploadArray.push(url);
        })
      );

      if (uploadArray.length) {
        if (isTaskExist.status === 'rejected') {
          await db.TaskAssignmentEvidence.update(
            {
              ...req.body,
              uploads: uploadArray
            },
            {where: {id: TaskAssignmentId}}
          );
        }
        await db.TaskAssignmentEvidence.create({
          uploads: uploadArray,
          TaskAssignmentId,
          comment,
          type,
          source: 'field_agent'
        });
        await db.TaskAssignment.update(
          {
            uploaded_evidence: true
          },
          {where: {UserId: isTaskExist.UserId}}
        );
        await db.TaskAssignment.update(
          {status: 'completed'},
          {where: {id: TaskAssignmentId}}
        );
        Response.setSuccess(
          200,
          'Success Uploading  Task Evidence',
          uploadArray
        );
        return Response.send(res);
      }
    } catch (error) {
      Response.setError(500, 'Internal Server Error.test' + error);
      return Response.send(res);
    }
  }

  static async uploadProgreeEvidenceVendor(req, res) {
    try {
      const {TaskAssignmentId, comment, type} = req.body;
      const files = req.file;
      const rules = {
        TaskAssignmentId: 'required|numeric',
        comment: 'required|string',
        type: 'required|string'
      };
      const validation = new Validator(req.body, rules);
      if (validation.fails()) {
        Response.setError(422, validation.errors);
        return Response.send(res);
      } else {
        if (!files) {
          Response.setError(422, 'Task Assignment Evidence Required');
          return Response.send(res);
        } else {
          const task = await db.TaskAssignment.findOne({
            where: {TaskId: TaskAssignmentId}
          });
          if (task) {
            const extension = req.file.mimetype.split('/').pop();
            await uploadFile(
              files,
              'pge-' + environ + '-' + TaskAssignmentId + '-i.' + extension,
              'convexity-progress-evidence'
            )
              .then(async url => {
                await db.TaskAssignmentEvidence.create({
                  uploads: [url],
                  TaskAssignmentId,
                  comment,
                  type,
                  source: 'vendor'
                });
              })
              .catch(err => {
                console.log(err);
              });
            Response.setSuccess(200, 'Success Uploading  Task Evidence');
            return Response.send(res);
          } else {
            Response.setError(422, 'Task Not Found');
            return Response.send(res);
          }
        }
      }
    } catch (error) {
      console.log(error.message);
      util.setError(500, 'Internal Server Error');
      return util.send(res);
    }
  }

  static async viewTaskById(req, res) {
    const {taskId} = req.params;

    try {
      const tasks = await db.TaskAssignment.findAll({
        where: {TaskId: taskId},
        include: {model: db.Task, as: 'Task'}
      });
      if (tasks.length <= 0) {
        Response.setSuccess(200, 'No Task Recieved', tasks);
        return Response.send(res);
      }

      Response.setSuccess(200, 'Task Recieved', tasks);
      return Response.send(res);
    } catch (error) {
      console.log(error.message);
      util.setError(500, 'Internal Server Error' + error);
      return util.send(res);
    }
  }

  static async viewCash4WorkTask(req, res) {
    const {taskId} = req.body;

    try {
      const tasks = await CampaignService.cashForWorkCampaignByApprovedBeneficiary;
      if (tasks.length <= 0) {
        Response.setSuccess(200, 'No Task Recieved', tasks);
        return Response.send(res);
      }
      Response.setSuccess(200, 'Task Recieved', tasks);
      return Response.send(res);
    } catch (error) {
      console.log(error.message);
      util.setError(500, 'Internal Server Error' + error);
      return util.send(res);
    }
  }

  static async viewTaskUserSubmission(req, res) {
    const {UserId} = req.body;
    try {
      const rules = {
        UserId: 'required|numeric'
      };
      const validation = new Validator(req.body, rules);
      if (validation.fails()) {
        Response.setError(422, validation.errors);
        return Response.send(res);
      } else {
        const tasks = await db.TaskAssignment.findAll({
          where: {UserId},
          include: [
            {model: db.Task, as: 'Task'},
            {model: db.TaskAssignmentEvidence, as: 'SubmittedEvidences'}
          ]
        });
        if (tasks.length <= 0) {
          Response.setSuccess(200, 'No Task Recieved', tasks);
          return Response.send(res);
        }
        Response.setSuccess(200, 'Task Recieved', tasks);
        return Response.send(res);
      }
    } catch (error) {
      console.log(error.message);
      util.setError(500, 'Internal Server Error' + error);
      return util.send(res);
    }
  }

  static async viewSubmittedEvidence(req, res) {
    const {user_id, task_id} = req.params;
    try {
      const rules = {
        user_id: 'required|numeric',
        task_id: 'required|numeric'
      };

      const validation = new Validator(req.params, rules);
      if (validation.fails()) {
        Response.setError(422, validation.errors);
        return Response.send(res);
      }

      const user = await db.User.findByPk(user_id, {
        attributes: userConst.publicAttr
      });
      const assignment = await db.TaskAssignment.findOne({
        where: {UserId: user_id, TaskId: task_id}
      });
      const task_exist = await db.Task.findByPk(task_id);
      const submittedEvidence = await db.TaskAssignmentEvidence.findOne({
        where: {TaskAssignmentId: assignment.id}
      });
      const beneficiaryWallet = await WalletService.findUserCampaignWallet(
        user_id,
        task_exist.CampaignId
      );
      if (!beneficiaryWallet) {
        await QueueService.createWallet(user_id, 'user', task_exist.CampaignId);
      }
      if (!assignment) {
        Response.setSuccess(404, 'No Task Found', []);
        return Response.send(res);
      }

      submittedEvidence.dataValues.task_name = task_exist.name;
      submittedEvidence.dataValues.beneficiaryId = user.id;
      submittedEvidence.dataValues.beneficiary_first_name = user.first_name;
      submittedEvidence.dataValues.beneficiary_last_name = user.last_name;
      assignment.dataValues.SubmittedEvidences = [submittedEvidence];
      user.dataValues.Assignments = [assignment];

      Response.setSuccess(200, 'Task Recieved', user);
      return Response.send(res);
    } catch (error) {
      console.log(error.message);
      util.setError(500, 'Internal Server Error' + error);
      return util.send(res);
    }
  }
  static async approveSubmissionAgent(req, res) {
    const {UserId, approved_by, approved_at} = req.body;
    try {
      const rules = {
        UserId: 'required|numeric'
      };
      const validation = new Validator(req.body, rules);
      if (validation.fails()) {
        Response.setError(422, validation.errors);
        return Response.send(res);
      } else {
        const tasks = await db.TaskAssignment.findOne({where: {UserId}});
        if (!tasks) {
          Response.setError(
            404,
            `User With This ID ${UserId}: Not Found`,
            tasks
          );
          return Response.send(res);
        }
        await db.TaskAssignment.update(
          {
            approved: true,
            approved_by,
            approved_by_agent: true,
            approved_at
          },
          {where: {UserId}}
        );
        Response.setSuccess(200, 'Task Approved Success');
        return Response.send(res);
      }
    } catch (error) {
      console.log(error.message);
      util.setError(500, 'Internal Server Error' + error);
      return util.send(res);
    }
  }

  static async approveSubmissionVendor(req, res) {
    const {UserId, approved_by, approved_at} = req.body;
    try {
      const rules = {
        UserId: 'required|numeric'
      };
      const validation = new Validator(req.body, rules);
      if (validation.fails()) {
        Response.setError(422, validation.errors);
        return Response.send(res);
      } else {
        const tasks = await db.TaskAssignment.findOne({where: {UserId}});
        if (!tasks) {
          Response.setError(
            404,
            `User With This ID ${UserId}: Not Found`,
            tasks
          );
          return Response.send(res);
        }
        await db.TaskAssignment.update(
          {
            approved: true,
            approved_by,
            approved_by_vendor: true,
            approved_at
          },
          {where: {UserId}}
        );
        Response.setSuccess(200, 'Task Approved Success');
        return Response.send(res);
      }
    } catch (error) {
      console.log(error.message);
      util.setError(500, 'Internal Server Error' + error);
      return util.send(res);
    }
  }

  static async getAllCashForWorkTask(req, res) {
    const {campaignId} = req.params;
    try {
      const tasks = await CampaignService.cash4work(req.user.id, campaignId);
      if (!tasks) {
        Response.setError(404, `No task retrieved`, tasks);
        return Response.send(res);
      }
      Response.setSuccess(200, `Cash for work task retrieved`, tasks);
      return Response.send(res);
    } catch (error) {
      util.setError(500, 'Internal Server Error' + error);
      return util.send(res);
    }
  }
  static async getAllCashForWorkTaskFieldAgent(req, res) {
    const {campaignId} = req.params;
    try {
      const tasks = await CampaignService.cash4workfield(campaignId);
      if (!tasks) {
        Response.setError(404, `No task retrieved`, tasks);
        return Response.send(res);
      }
      tasks.Jobs.forEach(data => {
        data.dataValues.OrganisationId = tasks.OrganisationId;
      });
      Response.setSuccess(200, `Cash for work task retrieved`, tasks);
      return Response.send(res);
    } catch (error) {
      util.setError(500, 'Internal Server Error');
      return util.send(res);
    }
  }
}

module.exports = CashForWorkController;
