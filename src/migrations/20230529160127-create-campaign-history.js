'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('CampaignHistories', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      extension_period: {
        allowNull: false,
        type: Sequelize.INTEGER
      },
      new_end_date: {
        allowNull: false,
        type: Sequelize.DATE
      },
      additional_budget: {
        defaultValue: 0,
        type: Sequelize.INTEGER
      },
      beneficiaries: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      campaign_id: {
        allowNull: false,
        type: Sequelize.INTEGER,
        references: {
          model: {
            tableName: 'Campaigns'
          },
          key: 'id'
        }
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
    await queryInterface.dropTable('CampaignHistories');
  }
};
