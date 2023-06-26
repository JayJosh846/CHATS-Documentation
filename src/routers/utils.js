const router = require('express').Router();
const {UtilController} = require('../controllers');
const {UtilValidator} = require('../validators');

router.get('/banks', UtilValidator.getBanksValidator, UtilController.getBanks);
router.get('/countries', UtilController.getCountries);
router.get(
  '/resolve_account',
  UtilValidator.resolveAccountValidator,
  UtilController.resolveAccountNumber
);
router.get('/exchange-rate', UtilController.getexchangeRates);

module.exports = router;
