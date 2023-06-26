const {
  body,
  param,
} = require('express-validator');
const BaseValidator = require('./BaseValidator');

class TaskValidator extends BaseValidator {

  static createCashForWorkTaskRule() {
    return [
      body().isArray({ min: 1 }).withMessage('minimum of 1 task is required.'),
      body('*.name').notEmpty().isString().withMessage('name is required.'),
      body('*.description').notEmpty().isString().withMessage('description is required.'),
      body('*.amount').notEmpty().isNumeric().withMessage('amount is required.'),
      body('*.assignment_count').isNumeric().withMessage('Numeric value expected.').notEmpty().withMessage('assigment count is required.'),
      body('*.require_vendor_approval').notEmpty().withMessage('vendor approval requirement not set.'),
      body('*.require_agent_approval').notEmpty().withMessage('agent approval requirement not set.'),
      body('*.require_evidence').notEmpty().withMessage('evidence upload requirement not set.')
    ]
  }

  static updateCashForWorkTaskRule() {
    return [
      param('task_id').isNumeric().notEmpty(),
      body('name').optional().isString().withMessage('name must be a valid string.'),
      body('description').optional().isString().withMessage('description name must be a valid string.'),
      body('amount').optional().isNumeric().withMessage('amount name must be a valid amount.'),
      body('assignment_count').optional().isNumeric().withMessage('Numeric value expected.'),
      body('require_vendor_approval').optional().isBoolean().withMessage('vendor approval requirement must be a boolean.'),
      body('require_agent_approval').optional().isBoolean().withMessage('agent approval requirement must be a boolean.'),
      body('require_evidence').optional().isBoolean().withMessage('evidence upload requirement must be a boolean.')
    ]
  }

  static taskProgressId(){
    return [
      param('taskProgressId').isNumeric().withMessage('task progress Id must be numeric')
      .notEmpty()
      .withMessage('task progress Id must not be empty.'),
     
    ]
  }

  static taskId(){
    return [
      param('task_id').isNumeric().withMessage('task Id must be numeric')
      .notEmpty()
      .withMessage('task Id must not be empty.'),
     
    ]
  }

}

module.exports = TaskValidator;