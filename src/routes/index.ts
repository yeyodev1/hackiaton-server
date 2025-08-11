import express, { Application } from 'express'
import auth from './auth.route'
import workspace from './workspace.route'
import analysis from './analysis.route'

function routerApi(app: Application) {
  const router = express.Router();
  
  router.use('/auth', auth);

  router.use('/workspace', workspace)

  router.use('/analysis', analysis)

  app.use('/api', router);
}

export default routerApi;
