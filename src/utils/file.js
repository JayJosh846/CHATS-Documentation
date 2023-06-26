exports.getFileExtension = (fileName) => fileName.substring(
  fileName.lastIndexOf(".") + 1
);