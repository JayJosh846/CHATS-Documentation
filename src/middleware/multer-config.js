const multer = require('multer');
const fs = require('fs');
const MIME_TYPE = {
  'image/jpeg': 'jpeg',
  'image/jpg': 'jpg',
  'image/png': 'png',
};

const storage = multer.diskStorage({
  destination: (req, file, callback) => {
    callback(null, './files/images');
  },
  filename: (req, file, callback) => {
    // console.log(file);
    const name = file.originalname.split(' ').join('-');
    const ext = MIME_TYPE[file.mimetype]; //file exstention
    const finalName = new Date().getTime() + '-' + name;
    callback(null, finalName);
  },
});

const uploader = multer({
  storage: storage,
}).fields([
  {name: 'left_fingers', maxCount: 3},
  {name: 'right_fingers', maxCount: 3},
  {name: 'profile_pic', maxCount: 1},
]);

module.exports = uploader;
