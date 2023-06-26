const router = require('express').Router();
const HomeController = require('../controllers/HomeController');

router.get('/', HomeController.generateOtp);
router.post('/dashboard', HomeController.dashboard);

module.exports = router;
