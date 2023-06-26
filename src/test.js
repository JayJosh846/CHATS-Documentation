require("dotenv").config();
const { generateKeyPair } = require("crypto");
const EncryptController = require("./libs/Encryption");

const config = {
  PRIVATE_KEY: process.env.ENCRYPTION_PRIVATE_KEY,
  PUBLIC_KEY: process.env.ENCRYPTION_PUBLIC_KEY,
  CONVEXITY_BASE_URL: process.env.CONVEXITY_MAIN_API,
};

// generateKeyPair(
//   "rsa",
//   {
//     modulusLength: 2048, // key size in bits
//     publicKeyEncoding: {
//       type: "spki",
//       format: "pem",
//     },
//     privateKeyEncoding: {
//       type: "pkcs8",
//       format: "pem",
//     },
//   },
//   (err, publicKey, privateKey) => {
//     console.log(publicKey);
//     console.log(privateKey);
//   }
// );

const decrypted = EncryptController.decrypt(
  "hV9G+iwB9SNlfHx6SXCZnuEwzPivEFewaUWA4lqef1Me213qCJbN8b+4E3sYMVpsqlzDnAJtQLF32QNZ7yoXzjt7mQsh4BUHAvJGPFXga9i8/qo3Hq7EmqWXnJhyAZVGe9pHYR31YI6tcIXiQlbehlr3ZJDnE3UxaAl7zFCJ1+2AIqjJY4fm7MReO3Lq2mtgMRghtnAoC/khLwPtN1ug4PGnDCbgHWpaMm/JNYPvfEmM/rcGUap9NTSisgyvWwOqoAWvrkEN5Az6MGBrNgyFjrh2V8HLgKXMuNbY86GT+nYgUc4H2Z3QYzc/ybmVABdYjVzpDZk+bkoQqcRN1kc6KdzkGZjjo5X5zM3AGDBKn+NM3Uv/hJPBQWd8EzECEHEQ6WbtbXb+Pb9SAw8v+XpeWceKDF8PTXsoiLCJJtTPX7p5PREBEnYtjAf8Y3bR3FxJ1ENMEhZ1/JyYu9xbQr+S9X7+GUVxN6VHRUFuvDHbUIQdpwr0xojnaSHflKpxM/8z3/H+qKLtzF4ZCNDkr9EU0ypWIQrnlTgerRx2umowcfSIZerzzU3HZOc0iQ4DXJvWQPjcboksQDBj4JLBsJ+6xCZ4fllSzcgESrxZBHbyapGSbjO86qBPui1DIPmGciggqNwkxScrQcT6fxmMuBkDDDSiD1YefdliEMCEHFEfE2w="
);

console.log(decrypted);
