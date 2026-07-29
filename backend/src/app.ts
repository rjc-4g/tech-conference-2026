import cors from "cors";
import express from "express";
import { NotFoundError, TodoStore, ValidationError } from "./store";

export function createApp(store = new TodoStore()) {
  const app = express();

  app.use(cors());
  app.use(express.json());

  app.get("/api/tasks", (req, res) => {
    const tasks = store.listTasks({
      q: asString(req.query.q),
      categoryId: asString(req.query.categoryId),
      status: asString(req.query.status),
      isToday: asString(req.query.isToday),
      sort: asString(req.query.sort),
    });
    res.json(
      tasks.map((task) => ({
        ...task,
        progress: store.getProgress(task.id),
        parentTaskTitle: store.getParentTaskTitle(task.id),
      })),
    );
  });

  app.post("/api/tasks", (req, res, next) => {
    try {
      res.status(201).json(store.createTask(req.body));
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/tasks/:id", (req, res, next) => {
    try {
      const task = store.getTask(req.params.id);
      res.json({ ...task, progress: store.getProgress(task.id), parentTaskTitle: store.getParentTaskTitle(task.id) });
    } catch (error) {
      next(error);
    }
  });

  app.put("/api/tasks/:id", (req, res, next) => {
    try {
      res.json(store.updateTask(req.params.id, req.body));
    } catch (error) {
      next(error);
    }
  });

  app.delete("/api/tasks/:id", (req, res, next) => {
    try {
      store.deleteTask(req.params.id);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  });

  app.patch("/api/tasks/:id/complete", (req, res, next) => {
    try {
      res.json(store.completeTask(req.params.id));
    } catch (error) {
      next(error);
    }
  });

  app.patch("/api/tasks/:id/start", (req, res, next) => {
    try {
      res.json(store.startTask(req.params.id));
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/categories", (_req, res) => {
    res.json(store.listCategories());
  });

  app.post("/api/categories", (req, res, next) => {
    try {
      res.status(201).json(store.createCategory(req.body));
    } catch (error) {
      next(error);
    }
  });

  app.put("/api/categories/:id", (req, res, next) => {
    try {
      res.json(store.updateCategory(req.params.id, req.body));
    } catch (error) {
      next(error);
    }
  });

  app.delete("/api/categories/:id", (req, res, next) => {
    try {
      store.deleteCategory(req.params.id);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/settings", (_req, res) => {
    res.json(store.getSettings());
  });

  app.put("/api/settings", (req, res, next) => {
    try {
      res.json(store.updateSettings(req.body));
    } catch (error) {
      next(error);
    }
  });

  app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    if (error instanceof ValidationError) {
      res.status(400).json({ message: error.message });
      return;
    }
    if (error instanceof NotFoundError) {
      res.status(404).json({ message: error.message });
      return;
    }
    res.status(500).json({ message: "Internal server error" });
  });

  return app;
}

function asString(value: unknown) {
  return typeof value === "string" ? value : undefined;
}
