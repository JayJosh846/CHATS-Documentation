const chai = require("chai");
const chaiHttp = chai.use(require("chai-http"));
const expect = require("chai").expect;
const app = require('../app');
var email, password, userId, token;

describe('CHATS Auth Endpoint Testing', () => {

    before(() => {

    });

    after(() => {

    });

    describe('Testing User Signup', () => {
        it('should test /api/v1/auth/sign-up', (done) => {
            chai.request(app).post('/api/v1/auth/sign-up').send({
                "email": "test.user@gmail.com",
                "password": "@S3cr3tPassword",
                "firstName": "Tester",
                "lastName": "Tester1",
                "phone": "08066665555"
            }).end((err, res) => {
                expect(res.status).to.equal(201);
                expect(res.body.status).to.equals("success");
                done();
            });
        });
    });
    describe('Testing User SignIn', () => {
        it('should test users login /api/v1/auth/signin', (done) => {
            chai.request(app).post('/api/v1/auth/signin').send({
                "email": "test.user@gmail.com",
                "password": "@S3cr3tPassword"
            }).end((err, res) => {
                expect(res.status).to.equal(200);
                expect(res.body.status).to.equals("success");
                done();
            });
        });
    });
    /*
   describe('Testing User Update Profile', () => {
       it('should test users login /api/v1/auth/update-profile', (done) => {
           chai.request(app).post('/api/v1/auth/update-profile').send({
               "firstName": "TesterFirstNameUpdate",
               "lastName": "TesterLastNameUpdate",
               "phone": "08077778888"
           }).end((err, res) => {
               expect(res.status).to.equal(201);
               expect(res.body.status).to.equals("success");
               done();
           });
       });
   });
 
   describe('Testing User Update Password', () => {
       it('should test users update Password /api/v1/auth/update-profile', (done) => {
           chai.request(app).post('/api/v1/auth/update-profile').send({
               "oldPassword": "@S3cr3tPassword",
               "newPassword": "@S3cr3tPassw0rd",
               "confirmPassword": "@S3cr3tPassw0rd",
           }).end((err, res) => {
               expect(res.status).to.equal(200);
               expect(res.body.status).to.equals("success");
               done();
           });
       });
   });

   describe('Testing User Reset Password', () => {
       it('should test users Reset Password /api/v1/auth/reset-password', (done) => {
           chai.request(app).post('/api/v1/auth/reset-password').send({
               "userId": 5,
               "oldPassword": "@S3cr3tPassword",
               "newPassword": "@S3cr3tPassw0rd",
               "confirmPassword": "@S3cr3tPassw0rd",
               'userId': 1
           }).end((err, res) => {
               expect(res.status).to.equal(200);
               expect(res.body.status).to.equals("success");
               done();
           });
       });
   });
   describe('Testing Getting Users Details', () => {
       it('should test Getting Users Details /api/v1/auth/user-detail/:id', (done) => {
           chai.request(app).get('/api/v1/auth/user-detail/' + 1)
               .set('Accept', 'application/json')
               .end((err, res) => {
                   expect(res.status).to.equal(200);
                   expect(res.body.status).to.equals("success");
                   done();
               });
       });
   });
*/
});