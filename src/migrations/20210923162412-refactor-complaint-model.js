'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    /**
     * Add altering commands here.
     *
     * Example:
     * await queryInterface.createTable('users', { id: Sequelize.INTEGER });
     */
    await queryInterface.removeColumn('Complaints', 'BeneficiaryId');
    await queryInterface.addColumn(
      'Complaints',
      'CampaignId', {
        after: 'status',
        allowNull: false,
        type: Sequelize.INTEGER,
        references: {
          model: {
            tableName: 'Campaigns',
          },
          key: 'id'
        }
      }
    );
    await queryInterface.addColumn(
      'Complaints',
      'UserId', {
        after: 'CampaignId',
        allowNull: false,
        type: Sequelize.INTEGER,
        references: {
          model: {
            tableName: 'Users',
          },
          key: 'id'
        }
      }
    );

  },

  down: async (queryInterface, Sequelize) => {
    /**
     * Add reverting commands here.
     *
     * Example:
     * await queryInterface.dropTable('users');
     */
     await queryInterface.addColumn(
      'Complaints',
      'BeneficiaryId', {
        allowNull: false,
        type: Sequelize.INTEGER,
        references: {
          model: {
            tableName: 'Beneficiaries',
          },
          key: 'id'
        }
      }
    );
    await queryInterface.removeColumn('Complaints', 'CampaignId');
    await queryInterface.removeColumn('Complaints', 'UserId');
  }
};