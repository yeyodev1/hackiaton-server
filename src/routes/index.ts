import express, { Application } from 'express'
import auth from './auth.route'
import workspace from './workspace.route'
import analysis from './analysis.route'
import agent from './agent.route'
import document from './document.route'
import conversation from './conversation.route'

function routerApi(app: Application) {
  const router = express.Router();
  
  router.use('/auth', auth);

  router.use('/workspace', workspace)

  router.use('/analysis', analysis)

  router.use('/agent', agent)

  router.use('/document', document)

  router.use('/conversations', conversation)

  app.use('/api', router);
}

export default routerApi;
