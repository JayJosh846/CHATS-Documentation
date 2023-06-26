const {AppController} = require('../controllers');

const router = require('express').Router();

router.get('/test/sms/:phone', AppController.testSms);

module.exports = router;
