import { beforeEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { DELETE as deleteTask } from "@/app/api/tasks/[id]/route";
import { GET as getTasks } from "@/app/api/tasks/route";
import { PATCH as completeTask } from "@/app/api/tasks/[id]/complete/route";
import { DELETE as deleteCategory } from "@/app/api/categories/[id]/route";
import { PATCH as reorderTasks } from "@/app/api/tasks/reorder/route";

function context(id: string) {
  return { params: Promise.resolve({ id }) };
}

function jsonRequest(url: string, method: string, body: unknown) {
  return new NextRequest(url, {
    method,
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });
}

async function createTask(data: {
  id: string;
  title?: string;
  parentId?: string | null;
  categoryId?: string | null;
  sortOrder?: number;
}) {
  return prisma.task.create({
    data: {
      id: data.id,
      title: data.title ?? data.id,
      parentId: data.parentId ?? null,
      categoryId: data.categoryId ?? null,
      nextAction: `${data.title ?? data.id}を進める`,
      sortOrder: data.sortOrder ?? 10
    }
  });
}

beforeEach(async () => {
  await prisma.task.deleteMany();
  await prisma.category.deleteMany();
});

describe("task and category API routes", () => {
  it("親タスクに未削除の子タスクがある場合、通常削除は409を返す", async () => {
    await createTask({ id: "parent", title: "親タスク" });
    await createTask({ id: "child", title: "子タスク", parentId: "parent" });

    const response = await deleteTask(
      new NextRequest("http://localhost/api/tasks/parent", { method: "DELETE" }),
      context("parent")
    );

    expect(response.status).toBe(409);
    const body = await response.json();
    expect(body.error).toBe("CHILD_TASK_EXISTS");

    const parent = await prisma.task.findUniqueOrThrow({ where: { id: "parent" } });
    const child = await prisma.task.findUniqueOrThrow({ where: { id: "child" } });
    expect(parent.deletedAt).toBeNull();
    expect(child.deletedAt).toBeNull();
  });

  it("cascade=trueの場合、親タスクと未削除の子タスクをまとめて論理削除する", async () => {
    await createTask({ id: "parent", title: "親タスク" });
    await createTask({ id: "child", title: "子タスク", parentId: "parent" });

    const response = await deleteTask(
      new NextRequest("http://localhost/api/tasks/parent?cascade=true", { method: "DELETE" }),
      context("parent")
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.deletedTaskIds).toEqual(["parent", "child"]);

    const parent = await prisma.task.findUniqueOrThrow({ where: { id: "parent" } });
    const child = await prisma.task.findUniqueOrThrow({ where: { id: "child" } });
    expect(parent.deletedAt).toBeInstanceOf(Date);
    expect(child.deletedAt).toBeInstanceOf(Date);
  });

  it("カテゴリ削除時はカテゴリを論理削除し、未削除タスクのcategoryIdをnullにする", async () => {
    await prisma.category.create({
      data: {
        id: "category",
        name: "学習",
        color: "#60a5fa",
        sortOrder: 10
      }
    });
    await createTask({ id: "task", title: "カテゴリ付きタスク", categoryId: "category" });

    const response = await deleteCategory(
      new NextRequest("http://localhost/api/categories/category", { method: "DELETE" }),
      context("category")
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.deletedCategoryId).toBe("category");
    expect(body.unassignedTaskCount).toBe(1);

    const category = await prisma.category.findUniqueOrThrow({ where: { id: "category" } });
    const task = await prisma.task.findUniqueOrThrow({ where: { id: "task" } });
    expect(category.deletedAt).toBeInstanceOf(Date);
    expect(task.categoryId).toBeNull();
  });

  it("カテゴリフィルタは指定カテゴリのタスクを表示し、子だけ一致した場合は親をcontextOnlyで含める", async () => {
    await prisma.category.createMany({
      data: [
        { id: "category-a", name: "学習", color: "#60a5fa", sortOrder: 10 },
        { id: "category-b", name: "仕事", color: "#f97316", sortOrder: 20 }
      ]
    });
    await createTask({ id: "parent", title: "親タスク" });
    await createTask({ id: "child-a", title: "学習カテゴリの子", parentId: "parent", categoryId: "category-a" });
    await createTask({ id: "task-b", title: "仕事カテゴリ", categoryId: "category-b" });

    const response = await getTasks(
      new NextRequest("http://localhost/api/tasks?categoryId=category-a", { method: "GET" })
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.meta.categoryId).toBe("category-a");
    expect(body.tasks.map((task: { id: string }) => task.id)).toEqual(["parent", "child-a"]);

    const parent = body.tasks.find((task: { id: string }) => task.id === "parent");
    const child = body.tasks.find((task: { id: string }) => task.id === "child-a");
    expect(parent.contextOnly).toBe(true);
    expect(parent.matchedByFilter).toBe(false);
    expect(child.contextOnly).toBe(false);
    expect(child.matchedByFilter).toBe(true);
  });

  it("タスクを完了するとstatusをdoneにし、startedAt・lastWorkedAt・completedAtを設定する", async () => {
    await createTask({ id: "task", title: "完了するタスク" });

    const response = await completeTask(
      jsonRequest("http://localhost/api/tasks/task/complete", "PATCH", { completed: true }),
      context("task")
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.completed).toBe(true);

    const task = await prisma.task.findUniqueOrThrow({ where: { id: "task" } });
    expect(task.status).toBe("done");
    expect(task.startedAt).toBeInstanceOf(Date);
    expect(task.lastWorkedAt).toBeInstanceOf(Date);
    expect(task.completedAt).toBeInstanceOf(Date);
  });

  it("子タスクを完了すると親タスクのstartedAtとlastWorkedAtも更新する", async () => {
    await createTask({ id: "parent", title: "親タスク" });
    await createTask({ id: "child", title: "子タスク", parentId: "parent" });

    const response = await completeTask(
      jsonRequest("http://localhost/api/tasks/child/complete", "PATCH", { completed: true }),
      context("child")
    );

    expect(response.status).toBe(200);

    const child = await prisma.task.findUniqueOrThrow({ where: { id: "child" } });
    const parent = await prisma.task.findUniqueOrThrow({ where: { id: "parent" } });

    expect(child.status).toBe("done");
    expect(child.startedAt).toBeInstanceOf(Date);
    expect(child.lastWorkedAt).toBeInstanceOf(Date);
    expect(child.completedAt).toBeInstanceOf(Date);
    expect(parent.startedAt).toBeInstanceOf(Date);
    expect(parent.lastWorkedAt).toBeInstanceOf(Date);
    expect(parent.completedAt).toBeNull();
  });

  it("完了を取り消すとstatusをtodoに戻し、completedAtをnullにする", async () => {
    await prisma.task.create({
      data: {
        id: "task",
        title: "完了取り消しタスク",
        nextAction: "チェックを外す",
        status: "done",
        startedAt: new Date("2026-07-29T10:00:00+09:00"),
        lastWorkedAt: new Date("2026-07-29T10:00:00+09:00"),
        completedAt: new Date("2026-07-29T10:00:00+09:00"),
        sortOrder: 10
      }
    });

    const response = await completeTask(
      jsonRequest("http://localhost/api/tasks/task/complete", "PATCH", { completed: false }),
      context("task")
    );

    expect(response.status).toBe(200);
    const task = await prisma.task.findUniqueOrThrow({ where: { id: "task" } });
    expect(task.status).toBe("todo");
    expect(task.completedAt).toBeNull();
    expect(task.startedAt).toBeInstanceOf(Date);
    expect(task.lastWorkedAt).toBeInstanceOf(Date);
  });

  it("並べ替えAPIは表示中タスクのスロットだけを入れ替え、同一親配下の全体順序を返す", async () => {
    await createTask({ id: "task_1", sortOrder: 10 });
    await createTask({ id: "task_2", sortOrder: 20 });
    await createTask({ id: "task_3", sortOrder: 30 });
    await createTask({ id: "task_4", sortOrder: 40 });
    await createTask({ id: "task_5", sortOrder: 50 });

    const response = await reorderTasks(
      jsonRequest("http://localhost/api/tasks/reorder", "PATCH", {
        parentId: null,
        orderedTaskIds: ["task_3", "task_1", "task_5"]
      })
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.tasks).toEqual([
      { id: "task_3", sortOrder: 10 },
      { id: "task_2", sortOrder: 20 },
      { id: "task_1", sortOrder: 30 },
      { id: "task_4", sortOrder: 40 },
      { id: "task_5", sortOrder: 50 }
    ]);

    const tasks = await prisma.task.findMany({
      where: { deletedAt: null },
      orderBy: { sortOrder: "asc" },
      select: { id: true, sortOrder: true }
    });
    expect(tasks).toEqual(body.tasks);
  });
});
