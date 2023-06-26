'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    /**
     * Add altering commands here.
     *
     * Example:
     * await queryInterface.createTable('users', { id: Sequelize.INTEGER });
     */
    await queryInterface.removeColumn('Campaigns', 'OrganisationMemberId');
    await queryInterface.addColumn(
      'Campaigns',
      'OrganisationId', {
        allowNull: true,
        type: Sequelize.INTEGER,
        references: {
          model: {
            tableName: "Organisations",
          },
          key: "id",
        },
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
     await queryInterface.removeColumn('Campaigns', 'OrganisationId');
     await queryInterface.addColumn(
      'Campaigns',
      'OrganisationMemberId', {
        allowNull: true,
        type: Sequelize.INTEGER,
        references: {
          model: {
            tableName: "OrganisationMembers",
          },
          key: "id",
        },
      }
    );
  }
};