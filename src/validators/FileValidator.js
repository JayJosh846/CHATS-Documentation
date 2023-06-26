const { check } = require("express-validator");
const { maxFileUploadSize } = require("../constants/file.constant");
const multer = require("../middleware/multer");
const BaseValidator = require("./BaseValidator");
const {
Logger
} = require('../libs')

class FileValidator extends BaseValidator {
  static checkLogoFile() {
    return [
      multer.single('logo'),
      check('logo')
      .custom((value, {req}) => new Promise((resolve, reject) => {
        const ext = req.file.mimetype.split('/').pop();
        const allowedExt = ['png', 'jpg', 'jpeg'];
        if(req.file.size > maxFileUploadSize) {
          reject('Maximum upload size [10 MB] exceeded.');
        }
        if(!allowedExt.includes(ext)) {
          reject(`Allowed file type are ${allowedExt.join(',')}.`)
        }
        resolve(true);
      })),
      this.validate
    ]
  }
  static checkTaskProgressEvidenceFile(){
    return [
    multer.any('uploads'),
      check('uploads')
      .custom((value, {req}) => new Promise((resolve, reject) => {
        
        req.files.map((file)=> {
          Logger.info(`Uploading files ${JSON.stringify(file)}`)
          const ext = file.mimetype.split('/').pop();
        
        const allowedExt = ['png', 'jpg', 'jpeg'];
        if(file.size > maxFileUploadSize) {
          Logger.info('Maximum upload size [10 MB] exceeded.')
          reject('Maximum upload size [10 MB] exceeded.');
        }
        if(!allowedExt.includes(ext)) {
          Logger.info(`Allowed file type are ${allowedExt.join(',')}.`)
          reject(`Allowed file type are ${allowedExt.join(',')}.`)
        }
        resolve(true);
        })
        
      })),
      this.validate
    ]
  }


  static checkProfilePic(){
    return [
    multer.single('profile_pic'),
      check('profile_pic')
      .custom((value, {req}) => new Promise((resolve, reject) => {
        const ext = req.file.mimetype.split('/').pop();
        console.log(req.file, 'file')
        const allowedExt = ['png', 'jpg', 'jpeg'];
        if(!allowedExt.includes(ext)) {
          reject(`Allowed file type are ${allowedExt.join(',')}.`)
        }
        resolve(true);
      })),
      this.validate
    ]
  }
  static checkProfileSelfie(){
    return [
    multer.single('selfie_image'),
      check('selfie_image')
      .custom((value, {req}) => new Promise((resolve, reject) => {
        const ext = req.file.mimetype.split('/').pop();
        const allowedExt = ['png', 'jpg', 'jpeg'];
        if(!allowedExt.includes(ext)) {
          reject(`Allowed file type are ${allowedExt.join(',')}.`)
        }
        resolve(true);
      })),
      this.validate
    ]
  }
  static checkTaskProgressFile(){
    return [
    multer.single('imageUrl'),
      check('imageUrl')
      .custom((value, {req}) => new Promise((resolve, reject) => {
        const ext = req.file.mimetype.split('/').pop();

       
        const allowedExt = ['png', 'jpg', 'jpeg'];
        if(req.file.size > maxFileUploadSize) {
          reject('Maximum upload size [10 MB] exceeded.');
        }
        if(!allowedExt.includes(ext)) {
          reject(`Allowed file type are ${allowedExt.join(',')}.`)
        }
        resolve(true);
      })),
      this.validate
    ]
  }
}

module.exports = FileValidator;