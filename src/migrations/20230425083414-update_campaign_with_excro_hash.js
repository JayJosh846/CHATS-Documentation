'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    /**
     * Add altering commands here.
     *
     * Example:
     * await queryInterface.createTable('users', { id: Sequelize.INTEGER });
     */
    //await queryInterface.removeColumn('Campaigns', 'type');
    await queryInterface.addColumn('Campaigns', 'escrow_hash', {
      type: Sequelize.STRING,
      allowNull: true
    });
    // await queryInterface.addColumn('Campaigns', 'minting_limit', {
    //   type: Sequelize.INTEGER,
    //   allowNull: true,
    //   defaultValue: 0
    // });
  },

  down: async (queryInterface, Sequelize) => {
    /**
     * Add reverting commands here.
     *
     * Example:
     * await queryInterface.dropTable('users');
     */
    // await queryInterface.removeColumn('Campaigns', 'type');
    await queryInterface.removeColumn('Campaigns', 'escrow_hash');
  }
};
