require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const morgan = require('morgan');
const cors = require('cors');
const {Logger} = require('./libs');

const {Response} = require('./libs');
const {HttpStatusCode} = require('./utils');
//Routers link
const adminRoute = require('./routers/admin');
const usersRoute = require('./routers/users');
const transactionRouter = require('./routers/transaction');
const authRouter = require('./routers/auth');
const campaignRouter = require('./routers/campaign');
const rolesRouter = require('./routers/role');
const ngoAuthRouter = require('./routers/ngo-auth');
const ngosRouter = require('./routers/ngos');
const vendorsAuthRouter = require('./routers/vendors-auth');
const vendorsRouter = require('./routers/vendors');
const beneficiariesRouter = require('./routers/beneficiaries');
const cashforworkRouter = require('./routers/cash-for-work');
const organisationRouter = require('./routers/organisation');
const webhookRouter = require('./routers/webhooks');
const taskRouter = require('./routers/task');
const marketRouter = require('./routers/market');
const utilRouter = require('./routers/utils');
const orderRouter = require('./routers/order');
const appRouter = require('./routers/app');
const productRouter = require('./routers/product');
const planRouter = require('./routers/plan');
const subscriptionRouter = require('./routers/subscription');
const impactReportRouter = require('./routers/impact');

const app = express();

app.use(cors({origin: '*'}));
app.use(helmet());
app.use(morgan('combined'));
app.use(express.json());
app.use(express.urlencoded({extended: true}));
// const adminRouter = require("./routers/admin");

// Routing endpoint
app.use('/v1/admin', adminRoute);
app.use('/v1/market', marketRouter);
app.use('/v1/users', usersRoute);
app.use('/v1/transactions', transactionRouter);
app.use('/v1/auth', authRouter);
app.use('/v1/campaigns', campaignRouter);
app.use('/v1/roles', rolesRouter);
app.use('/v1/ngo/auth', ngoAuthRouter);
app.use('/v1/ngos', ngosRouter);
app.use('/v1/vendors', vendorsRouter);
app.use('/v1/vendors/auth', vendorsAuthRouter);
app.use('/v1/beneficiaries', beneficiariesRouter);
app.use('/v1/cash-for-work', cashforworkRouter);
app.use('/v1/organisation', organisationRouter);
app.use('/v1/organisations', organisationRouter);
app.use('/v1/webhooks', webhookRouter);
app.use('/v1/tasks', taskRouter);
app.use('/v1/orders', orderRouter);
app.use('/v1/utils', utilRouter);
app.use('/v1/app', appRouter);
app.use('/v1/products', productRouter);
app.use('/v1/plans', planRouter);
app.use('/v1/subscriptions', subscriptionRouter);
app.use('/v1/impact-reports', impactReportRouter);

app.get('/', (req, res) => {
  try {
    Response.setSuccess(HttpStatusCode.STATUS_OK, 'Welcome to CHATS App ');
    return Response.send(res);
  } catch (error) {
    const message =
      process.env.NODE_ENV === 'production'
        ? 'Internal Server Error.'
        : error.toString();
    Response.setError(HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR, message);
    return Response.send(res);
  }
});
app.all('*', (req, res) => {
  try {
    Logger.info('trying to get an unknown route');
    Response.setError(
      HttpStatusCode.STATUS_RESOURCE_NOT_FOUND,
      'Requested resource not found.'
    );
    return Response.send(res);
  } catch (error) {
    const message =
      process.env.NODE_ENV === 'production'
        ? 'Internal Server Error.'
        : error.toString();
    Logger.error(message);
    Response.setError(HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR, message);
    return Response.send(res);
  }
});

module.exports = app;
