const chai = require("chai");
const chaiHttp = chai.use(require("chai-http"));
const expect = require("chai").expect;
const app = require('../app');
var email, password, userId, token;

describe('SMS2Profit Message Sending Endpoint Testing', () => {

    before(() => {

    });

    after(() => {

    });

    describe('Testing Get Sent Messages', () => {
        it('should get all Sent Messages /api/v1/messages', (done) => {
            chai.request(app).get('/api/v1/messages')
                .set('Accept', 'application/json')
                .end((err, res) => {
                    expect(res.status).to.equal(200);
                    expect(res.body.status).to.equals("success");
                    done();
                });
        });
    });
    describe('Testing Get A Sent Messages', () => {
        it('should get A Sent Messages /api/v1/messages/:id', (done) => {
            chai.request(app).get('/api/v1/messages/' + 1)
                .set('Accept', 'application/json')
                .end((err, res) => {
                    expect(res.status).to.equal(200);
                    expect(res.body.status).to.equals("success");
                    done();
                });
        });
    });
    describe('Sending a Message', () => {
        it('should test sending of a new messages /api/v1/messages', (done) => {
            chai.request(app).post('/api/v1/messages').send({
                "send_name": "SMS2Profit",
                "message_body": "This is another Test Message on the SMS2Profit",
                "recipients": "08064620492",
                "user_id": 1
            }).end((err, res) => {
                expect(res.status).to.equal(201);
                expect(res.body.status).to.equals("success");
                done();
            });
        });
    });

});