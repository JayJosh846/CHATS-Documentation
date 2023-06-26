'use strict';

const {BOOLEAN, FLOAT, ENUM} = require('sequelize');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Plans', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false
      },
      conditional_voucher_number: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      is_unlimited_conditional_voucher: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      beneficiaries_number: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      is_unlimited_beneficiaries: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      plan_cost: {
        type: Sequelize.FLOAT,
        allowNull: false,
        defaultValue: 0.0
      },
      campaign_cost_cap: {
        type: Sequelize.FLOAT,
        allowNull: false
      },
      is_unlimited_campaign_cost: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      unconditional_voucher_number: {
        type: Sequelize.INTEGER,
        defaultValue: 0.0
      },
      is_unlimited_unconditional_voucher: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      beneficiaries_onboarding: {
        type: Sequelize.ENUM('FIELD AGENTS', 'SELF ONBOARDING')
      },
      features: {
        type: Sequelize.JSON,
        allowNull: false
      },
      isActive: {
        type: Sequelize.BOOLEAN
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('Plans');
  }
};
