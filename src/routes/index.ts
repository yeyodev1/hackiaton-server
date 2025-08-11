import express, { Application } from 'express'
import auth from './auth.route'
import workspace from './workspace.route'
import analysis from './analysis.route'
import agent from './agent.route'

function routerApi(app: Application) {
  const router = express.Router();
  
  router.use('/auth', auth);

  router.use('/workspace', workspace)

  router.use('/analysis', analysis)

  router.use('/agent', agent)

  app.use('/api', router);
}

export default routerApi;
