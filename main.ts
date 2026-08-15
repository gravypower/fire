import { App, staticFiles } from "fresh";

export const app = new App();

app.use(staticFiles());

// Include file-system based routes (routes/**)
app.fsRoutes();
