require('dotenv').config();
const db = require('../models');
const {util, Response, Logger} = require('../libs');
const {HttpStatusCode} = require('../utils');
const Validator = require('validatorjs');
const {UserService, PlanService} = require('../services');
const {SanitizeObject} = require('../utils');
const environ = process.env.NODE_ENV == 'development' ? 'd' : 'p';
const axios = require('axios');

class PlanController {
  static async createPlan(req, res) {
    const data = req.body;
    const features = JSON.stringify(req.body.features);
    const {
      name,
      conditional_voucher_number,
      is_unlimited_conditional_voucher,
      beneficiaries_number,
      is_unlimited_beneficiaries,
      plan_cost,
      campaign_cost_cap,
      is_unlimited_campaign_cost,
      unconditional_voucher_number,
      is_unlimited_unconditional_voucher,
      beneficiaries_onboarding
    } = req.body;
    try {
      const rules = {
        name: 'required|numeric',
        conditional_voucher_number: 'required|string',
        beneficiaries_number: 'required|string',
        campaign_cost_cap: 'required|string',
        plan_cost: 'required|string',
        unconditional_voucher_number: 'required|string',
        beneficiaries_onboarding: 'required|string'
      };
      const validation = new Validator(data, rules);
      if (validation.fails()) {
        Response.setError(422, Object.values(validation.errors.errors)[0][0]);
        return Response.send(res);
      } else {
        const plan = await PlanService.addPlan(data);

        if (!plan) {
          Response.setError(
            HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR,
            'Internal Server Error. Please try again.'
          );
          return Response.send(res);
        }
        Response.setSuccess(
          HttpStatusCode.STATUS_CREATED,
          'A New Plan Created Successfully',
          {
            plan: plan.toObject()
          }
        );
        return Response.send(res);
      }
    } catch (err) {
      Response.setError(
        HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR,
        'Internal Server Error. Please try again.'
      );
      return Response.send(res);
    }
  }
  static async listPlans() {}
  static async getAllPlans(req, res) {
    try {
      const plans = await PlanService.getAllPlans();
      if (!plans) {
        Response.setError(HttpStatusCode.STATUS_NOT_FOUND, 'No plans found');
        return Response.send(res);
      } else {
        Response.setSuccess(
          HttpStatusCode.STATUS_OK,
          'All Plans Retrieved',
          plans
        );
        return Response.send(res);
      }
    } catch (error) {
      Response.setError(
        HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR,
        'Internal error occured. Please try again.' + error
      );
      return Response.send(res);
    }
  }
  /**
   * @param {id} id the id of the request
   */
  static async getAPlan(req, res) {
    const {id} = req.params;
    try {
      if (!Number(id)) {
        Response.setError(
          HttpStatusCode.STATUS_BAD_REQUEST,
          'Please input a valid numeric value'
        );
        return Response.send(res);
      }
      const plan = await PlanService.getAPlan(id);
      if (!plan) {
        Response.setError(HttpStatusCode.STATUS_NOT_FOUND, 'No such plan');
        return Response.send(res);
      } else {
        Response.setSuccess(HttpStatusCode.STATUS_OK, 'Plan Retrieved', plan);
        return Response.send(res);
      }
    } catch (error) {
      Response.setError(
        HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR,
        'Internal error occured. Please try again.' + error
      );
      return Response.send(res);
    }
  }
  static async updatePlan(req, res) {
    const planData = req.body;
    const {id} = req.params;
    if (!Number(id)) {
      Response.setError(
        HttpStatusCode.STATUS_BAD_REQUEST,
        'Please input a valid numeric value'
      );
      return Response.send(res);
    }
    try {
      const updatedPlan = PlanService.updatePlan(id, planData);
      if (!updatedPlan) {
        Response.setError(
          HttpStatusCode.STATUS_UNPROCESSABLE_ENTITY,
          `Plan Cannot Be Updated`
        );
        return Response.send(res);
      } else {
        Response.setSuccess(
          HttpStatusCode.STATUS_OK,
          'Plan updated',
          updatedPlan
        );
      }
      return Response.send(res);
    } catch (error) {
      Response.setError(
        HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR,
        'Internal error occured. Please try again.' + error
      );
      return Response.send(res);
    }
  }
  /**
   * @param {id} id The id of the plan
   *Plans should not be deleted but rather deactivated
   */
  static async deletePlan(req, res) {
    const {id} = req.params;

    try {
      if (!Number(id)) {
        Response.setError(
          HttpStatusCode.STATUS_BAD_REQUEST,
          'Please input a valid numeric value'
        );
        return Response.send(res);
      }
      const plan = await PlanService.deletePlan(id);
      if (!plan) {
        Response.setError(HttpStatusCode.STATUS_NOT_FOUND, 'Plan Not Deleted');
        return Response.send(res);
      }
      Response.setSuccess(HttpStatusCode.STATUS_OK, 'Plan Deleted', plan);
      return Response.send(res);
    } catch (error) {
      Response.setError(
        HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR,
        'Internal error occured. Please try again.' + error
      );
      return Response.send(res);
    }
  }
}

module.exports = PlanController;
