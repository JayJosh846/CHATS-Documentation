const {maxFileUploadSize} = require('../constants/file.constant');
const multer = require('multer');
// const storage = multer.memoryStorage();

module.exports = multer({
  dest: 'temp/',
  limits: {
    fieldSize: maxFileUploadSize
  }
});
