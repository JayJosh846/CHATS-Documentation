const moment = require('moment');

exports.formInputToDate = (value) => {
  return moment(`${value.split('-').reverse().join('-')}`).toDate();
} 