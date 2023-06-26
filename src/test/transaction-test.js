const chai = require("chai");
const chaiHttp = chai.use(require("chai-http"));
const expect = require("chai").expect;
const app = require('../app');
var email, password, userId, token;

describe('SMS2Profit Transaction Endpoint Testing', () => {

    before(() => {

    });

    after(() => {

    });
    describe('Testing Creating a Transaction', () => {
        it('should Test Creating a Transaction /api/v1/transaction', (done) => {
            chai.request(app).post('/api/v1/transaction/').send({
                "amount": 145,
                "user_id": 1
            }).end((err, res) => {
                expect(res.status).to.equal(201);
                expect(res.body.status).to.equals("success");
                done();
            });
        });
    });

    describe('Verifying a Transaction', () => {
        it('Should Test Verifying a Transaction /api/v1/transaction/verify-transaction/:transactionId', (done) => {
            chai.request(app).get('/api/v1/transaction/verify-transaction/' + 1)
                .set('Accept', 'application/json')
                .end((err, res) => {
                    expect(res.status).to.equal(200);
                    expect(res.body.status).to.equals("success");
                    done();
                });
        });
    });
    describe('Testing Get All Transactions', () => {
        it('should Test Get All Transactions /api/v1/transactions/', (done) => {
            chai.request(app).get('/api/v1/transactions/')
                .set('Accept', 'application/json')
                .end((err, res) => {
                    expect(res.status).to.equal(200);
                    expect(res.body.status).to.equals("success");
                    done();
                });
        });
    });
    describe('Testing Get A Transactions', () => {
        it('should Test Get A Transactions /api/v1/transactions/:id', (done) => {
            chai.request(app).get('/api/v1/transactions/' + 1)
                .set('Accept', 'application/json')
                .end((err, res) => {
                    expect(res.status).to.equal(200);
                    expect(res.body.status).to.equals("success");
                    done();
                });
        });
    });

});