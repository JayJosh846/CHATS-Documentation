const chai = require("chai");
const chaiHttp = chai.use(require("chai-http"));
const expect = require("chai").expect;
const app = require('../app');

var articleId, userId;

describe('CHATS Endpoint Testing', () => {

    before(() => {

    });

    after(() => {

    });
    /** 
     * 
        describe('createUser', () => {
            it('should test /api/v1/auth/create-user', (done) => {
                chai.request(app).post('/api/v1/auth/create-user').send({
                    firstName: "Test_FirstName",
                    lastName: "Test_LastName",
                    email: "test_email@mail.com",
                    password: "S3cretPassword",
                    gender: "Female",
                    jobRole: "sleeping",
                    department: "Bedroom",
                    address: "Test Users Avenue"
                }).end((err, res) => {
                    expect(res.status).to.equal(201);
                    expect(res.body.status).to.equals("success");
                    done();
                });
            });
        });
    
        describe('SignIn', () => {
            it('should test employee login /api/v1/auth/signin', (done) => {
                chai.request(app).post('/api/v1/auth/signin').send({
                    email: "test_email@mail.com",
                    password: "S3cretPassword",
                }).end((err, res) => {
                    expect(res.status).to.equal(200);
                    expect(res.body.status).to.equals("success");
                    done();
                });
            });
        });
        // Articles Test
        describe('postArticle', () => {
            it('should test /api/v1/articles', (done) => {
                chai.request(app).post('/api/v1/articles').send({
                    title: "Test Title",
                    article: "Body of the Test Article",
                    user_id: 1,
                    slug: 'test-title'
                }).end((err, res) => {
                    articleId = res.body.data.articleId;
                    // console.log('Created Article with Id: ' + res.body.data.articleId);
                    expect(res.status).to.equal(201);
                    expect(res.body.status).to.equals("success");
                    done();
                });
            });
        });
        describe('patch article or update and article with id', () => {
            it('should test /api/v1/articles/:id', (done) => {
                //    console.log('Update Article with Id: ' + articleId);
                chai.request(app).patch('/api/v1/articles/' + articleId).send({
                    title: "Updating The Test Title",
                    article: "Updating the Body of the Test Article",
                    user_id: 1,
                    slug: 'updating-the-test-title',
                    modifiedOn: (new Date())
                }).end((err, res) => {
                    // console.log('Updated Article with Id: ' + res.body.data.articleId);
                    expect(res.status).to.equal(201);
                    expect(res.body.status).to.equals("success");
                    done();
                });
            });
        });
        describe('getArticles', () => {
            it('should get all /api/v1/articles', (done) => {
                chai.request(app).get('/api/v1/articles')
                    .set('Accept', 'application/json')
                    .end((err, res) => {
                        // console.log(res.body);
                        expect(res.status).to.equal(200);
                        expect(res.body.status).to.equals("success");
                        done();
                    });
            });
        });
        describe('Get a single article with id', () => {
            // console.log('Get Article with Id: ' + articleId);
            it('should get a article /api/v1/articles/:id', (done) => {
                chai.request(app).get('/api/v1/articles/' + articleId)
                    .set('Accept', 'application/json')
                    .end((err, res) => {
                        // console.log('Get Article with Id: ' + res.body.data.articleId);
                        expect(res).to.have.status(200);
                        expect(res.body.status).to.equals("success");
                        done();
                    });
            });
        });
        describe('Delete a Single article with id', () => {
            // const id = 6;
            //   console.log('Delete Article with Id: ' + articleId);
            it('should get a article /api/v1/articles/:id', (done) => {
                chai.request(app).delete('/api/v1/articles/' + articleId)
                    .set('Accept', 'application/json')
                    .end((err, res) => {
                        // console.log('Deleted Article with Id: ' + res.body.data.articleId);
                        expect(res).to.have.status(200);
                        expect(res.body.status).to.equals("success");
                        done();
                    });
            });
        });
        //GIFs Test
        describe('postGifs', () => {
            it('should test /api/v1/gifs', (done) => {
                chai.request(app).post('/api/v1/gifs').send({
                    title: "Test Gif",
                    article: "Body of the Test Article",
                    user_id: 1,
                }).end((err, res) => {
                    expect(res.status).to.equal(201);
                    expect(res.body.status).to.equals("success");
                    done();
                });
            });
        });
        //Comments Test
       */
});
