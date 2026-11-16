import { createApp } from "./app";
import { env } from "./config/env";

const app = createApp();

if (!process.env.VERCEL) {
  app.listen(env.PORT, () => {
    console.log(`LifeSync Wellness API running at http://localhost:${env.PORT}`);
  });
}

export default app;
