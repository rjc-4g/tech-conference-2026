import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { createApp } from "./app";
import { TodoStore } from "./store";

describe("tasks api", () => {
  let store: TodoStore;
  let app: ReturnType<typeof createApp>;

  beforeEach(() => {
    store = new TodoStore();
    app = createApp(store);
  });

  it("lists seeded tasks with progress", async () => {
    const response = await request(app).get("/api/tasks").expect(200);

    expect(response.body).toHaveLength(4);
    expect(response.body[0]).toHaveProperty("progress");
  });

  it("creates and completes a task", async () => {
    const created = await request(app)
      .post("/api/tasks")
      .send({
        title: "テストを書く",
        priority: "high",
        isToday: true,
        firstAction: "失敗するテストを1つ書く",
      })
      .expect(201);

    expect(created.body.title).toBe("テストを書く");
    expect(created.body.firstAction).toBe("失敗するテストを1つ書く");

    const completed = await request(app)
      .patch(`/api/tasks/${created.body.id}/complete`)
      .expect(200);

    expect(completed.body.status).toBe("done");
    expect(completed.body.completedAt).toBeTruthy();
  });

  it("filters by keyword and sorts by priority", async () => {
    await request(app)
      .post("/api/tasks")
      .send({ title: "重要な見積もり", priority: "high", isToday: false })
      .expect(201);
    await request(app)
      .post("/api/tasks")
      .send({ title: "重要なメモ", priority: "low", isToday: false })
      .expect(201);

    const response = await request(app).get("/api/tasks?q=重要&sort=priority").expect(200);

    expect(response.body).toHaveLength(2);
    expect(response.body[0].priority).toBe("high");
  });

  it("rejects invalid parent relationships", async () => {
    const parent = await request(app)
      .post("/api/tasks")
      .send({ title: "親タスク", priority: "medium", isToday: false })
      .expect(201);
    const child = await request(app)
      .post("/api/tasks")
      .send({
        title: "子タスク",
        priority: "medium",
        isToday: false,
        parentTaskId: parent.body.id,
      })
      .expect(201);

    const response = await request(app)
      .put(`/api/tasks/${parent.body.id}`)
      .send({
        title: "親タスク",
        priority: "medium",
        isToday: false,
        parentTaskId: child.body.id,
      })
      .expect(400);

    expect(response.body.message).toContain("descendant");
  });

  it("creates categories and assigns them to tasks", async () => {
    const category = await request(app)
      .post("/api/categories")
      .send({ name: "学習", color: "#7c3aed" })
      .expect(201);

    expect(category.body.name).toBe("学習");

    const task = await request(app)
      .post("/api/tasks")
      .send({
        title: "TypeScriptを読む",
        priority: "medium",
        isToday: false,
        categoryId: category.body.id,
      })
      .expect(201);

    expect(task.body.categoryId).toBe(category.body.id);
  });

  it("updates settings and rejects invalid values", async () => {
    const updated = await request(app)
      .put("/api/settings")
      .send({ todayTaskLimit: 5, staleTaskDays: 7 })
      .expect(200);

    expect(updated.body).toEqual({ todayTaskLimit: 5, staleTaskDays: 7 });

    const response = await request(app)
      .put("/api/settings")
      .send({ todayTaskLimit: 0, staleTaskDays: 7 })
      .expect(400);

    expect(response.body.message).toContain("todayTaskLimit");
  });
});
