import express, { Application } from 'express'
import auth from './auth.route'
import workspace from './workspace.route'

function routerApi(app: Application) {
  const router = express.Router();
  
  router.use('/auth', auth);

  router.use('/workspace', workspace)




  app.use('/api', router);
}

export default routerApi;
