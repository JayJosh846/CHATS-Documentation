'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    /**
     * Add altering commands here.
     *
     * Example:
     * await queryInterface.createTable('users', { id: Sequelize.INTEGER });
     */
    //await queryInterface.removeColumn('Users', 'iris');
    await queryInterface.addColumn('Users', 'iris', {
      type: Sequelize.JSON,
      allowNull: true
    });
    await queryInterface.addColumn('Users', 'tfa_binded_date', {
      allowNull: true,
      type: Sequelize.DATE,
      after: 'tfa_secret'
    });
    await queryInterface.addColumn('Users', 'is_verified', {
      allowNull: true,
      type: Sequelize.BOOLEAN,
      defaultValue: false
    });

    await queryInterface.addColumn('Users', 'is_verified_all', {
      allowNull: true,
      type: Sequelize.BOOLEAN,
      defaultValue: false
    });
    await queryInterface.addColumn('Users', 'registration_type', {
      type: Sequelize.ENUM('individual', 'organisation'),
      allowNull: true
    });
  },

  down: async (queryInterface, Sequelize) => {
    /**
     * Add reverting commands here.
     *
     * Example:
     * await queryInterface.dropTable('users');
     */
    await queryInterface.removeColumn('Users', 'iris');
    await queryInterface.removeColumn('Users', 'tfa_binded_date');
    await queryInterface.removeColumn('Users', 'is_verified');
    await queryInterface.removeColumn('Users', 'is_verified_all');
    await queryInterface.removeColumn('Users', 'registration_type');
  }
};
