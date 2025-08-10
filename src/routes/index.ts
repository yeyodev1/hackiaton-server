import express, { Application } from 'express'

function routerApi(app: Application) {
  const router = express.Router();

  app.use("/api", router);

  // router.use(payments); mockup data
}

export default routerApi;
