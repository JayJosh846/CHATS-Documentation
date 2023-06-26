'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    /**
     * Add altering commands here.
     *
     * Example:
     * await queryInterface.createTable('users', { id: Sequelize.INTEGER });
     */
    await queryInterface.removeColumn('Organisations', 'verificationMode');
    await queryInterface.addColumn('Organisations', 'profile_completed', {
      type: Sequelize.BOOLEAN,
      defaultValue: false
    });
    await queryInterface.addColumn('Beneficiaries', 'approved', {
      type: Sequelize.BOOLEAN,
      defaultValue: false
    });
  },

  down: async (queryInterface, Sequelize) => {
    /**
     * Add reverting commands here.
     *
     * Example:
     * await queryInterface.dropTable('users');
     */
     await queryInterface.removeColumn('Beneficiaries', 'approved');
     await queryInterface.removeColumn('Organisations', 'profile_completed');
     await queryInterface.addColumn('Organisations', 'verificationMode', {
      type: Sequelize.ENUM("1", "2"),
        defaultValue: "1",
    });
  }
};
