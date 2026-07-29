import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function jstDateOnly(offsetDays = 0) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(new Date());

  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;

  if (!year || !month || !day) {
    throw new Error("Asia/Tokyoの日付生成に失敗しました。");
  }

  const date = new Date(`${year}-${month}-${day}T00:00:00+09:00`);
  date.setUTCDate(date.getUTCDate() + offsetDays);
  return date;
}

async function main() {
  const learningCategory = await prisma.category.upsert({
    where: { id: "seed-category-learning" },
    update: {},
    create: {
      id: "seed-category-learning",
      name: "学習",
      color: "#60a5fa",
      sortOrder: 10
    }
  });

  const workCategory = await prisma.category.upsert({
    where: { id: "seed-category-work" },
    update: {},
    create: {
      id: "seed-category-work",
      name: "仕事",
      color: "#34d399",
      sortOrder: 20
    }
  });

  await prisma.task.upsert({
    where: { id: "seed-task-english" },
    update: {
      dueDate: jstDateOnly(0)
    },
    create: {
      id: "seed-task-english",
      title: "英語学習",
      description: "TOEIC対策の最初のタスク",
      priority: "medium",
      dueDate: jstDateOnly(0),
      isToday: true,
      categoryId: learningCategory.id,
      nextAction: "単語帳の1〜20ページを15分読む",
      estimateMinutes: 30,
      sortOrder: 10
    }
  });

  await prisma.task.upsert({
    where: { id: "seed-task-english-vocab" },
    update: {
      status: "done",
      dueDate: jstDateOnly(0),
      completedAt: new Date(),
      lastWorkedAt: new Date()
    },
    create: {
      id: "seed-task-english-vocab",
      title: "英単語を読む",
      description: "親タスクの進捗バー確認用の完了済み子タスク",
      status: "done",
      priority: "medium",
      dueDate: jstDateOnly(0),
      isToday: true,
      parentId: "seed-task-english",
      categoryId: learningCategory.id,
      nextAction: "単語帳の1〜20ページを読む",
      estimateMinutes: 15,
      sortOrder: 10,
      startedAt: new Date(),
      lastWorkedAt: new Date(),
      completedAt: new Date()
    }
  });

  await prisma.task.upsert({
    where: { id: "seed-task-english-listening" },
    update: {
      dueDate: jstDateOnly(0)
    },
    create: {
      id: "seed-task-english-listening",
      title: "リスニングを1問解く",
      description: "親タスクの進捗バー確認用の未完了子タスク",
      priority: "medium",
      dueDate: jstDateOnly(0),
      isToday: true,
      parentId: "seed-task-english",
      categoryId: learningCategory.id,
      nextAction: "Part 1の問題を1問だけ解く",
      estimateMinutes: 10,
      sortOrder: 20
    }
  });

  await prisma.task.upsert({
    where: { id: "seed-task-overdue-report" },
    update: {
      dueDate: jstDateOnly(-1)
    },
    create: {
      id: "seed-task-overdue-report",
      title: "期限切れサンプル",
      description: "今日フィルタで期限切れ未完了タスクを確認するためのデータ",
      priority: "high",
      dueDate: jstDateOnly(-1),
      isToday: false,
      categoryId: workCategory.id,
      nextAction: "レポートの見出しだけ先に作る",
      estimateMinutes: 20,
      sortOrder: 20
    }
  });

  await prisma.task.upsert({
    where: { id: "seed-task-future-cleanup" },
    update: {
      dueDate: jstDateOnly(7)
    },
    create: {
      id: "seed-task-future-cleanup",
      title: "来週の整理タスク",
      description: "今日フィルタに出ない期限付きタスクのサンプル",
      priority: "low",
      dueDate: jstDateOnly(7),
      isToday: false,
      nextAction: "不要なメモを5件削除する",
      estimateMinutes: 15,
      sortOrder: 30
    }
  });

  await prisma.task.upsert({
    where: { id: "seed-task-context-parent" },
    update: {
      dueDate: jstDateOnly(7)
    },
    create: {
      id: "seed-task-context-parent",
      title: "関連表示される親タスク",
      description: "子タスクだけが今日対象の場合にcontextOnly表示を確認するための親タスク",
      priority: "medium",
      dueDate: jstDateOnly(7),
      isToday: false,
      categoryId: workCategory.id,
      nextAction: "全体の段取りを確認する",
      estimateMinutes: 60,
      sortOrder: 40
    }
  });

  await prisma.task.upsert({
    where: { id: "seed-task-context-child-today" },
    update: {
      dueDate: jstDateOnly(0)
    },
    create: {
      id: "seed-task-context-child-today",
      title: "今日対象の子タスク",
      description: "親タスクは今日対象外だが、この子タスクだけ今日フィルタに表示される",
      priority: "high",
      dueDate: jstDateOnly(0),
      isToday: true,
      parentId: "seed-task-context-parent",
      categoryId: workCategory.id,
      nextAction: "最初の確認項目を1つだけ見る",
      estimateMinutes: 20,
      sortOrder: 10
    }
  });

  await prisma.task.upsert({
    where: { id: "seed-task-parent-only-today" },
    update: {
      dueDate: jstDateOnly(0)
    },
    create: {
      id: "seed-task-parent-only-today",
      title: "親だけ今日対象のタスク",
      description: "親タスクのみ今日条件に一致し、子タスクは今日表示に出ないケース",
      priority: "medium",
      dueDate: jstDateOnly(0),
      isToday: true,
      categoryId: learningCategory.id,
      nextAction: "全体方針を5分で決める",
      estimateMinutes: 40,
      sortOrder: 50
    }
  });

  await prisma.task.upsert({
    where: { id: "seed-task-parent-only-future-child" },
    update: {
      dueDate: jstDateOnly(5)
    },
    create: {
      id: "seed-task-parent-only-future-child",
      title: "今日対象外の子タスク",
      description: "親だけ今日対象の逆ケースで、今日フィルタには表示されない子タスク",
      priority: "low",
      dueDate: jstDateOnly(5),
      isToday: false,
      parentId: "seed-task-parent-only-today",
      categoryId: learningCategory.id,
      nextAction: "後日作業する項目を確認する",
      estimateMinutes: 30,
      sortOrder: 10
    }
  });

  const unstartedCreatedAt = new Date(Date.now() - 25 * 60 * 60 * 1000);
  await prisma.task.upsert({
    where: { id: "seed-task-unstarted-risk" },
    update: {
      createdAt: unstartedCreatedAt,
      status: "todo",
      lastWorkedAt: null,
      startedAt: null,
      completedAt: null
    },
    create: {
      id: "seed-task-unstarted-risk",
      title: "未着手リスクサンプル",
      description: "作成から24時間以上経過し、まだ着手されていないタスクの表示確認用データ",
      priority: "medium",
      dueDate: jstDateOnly(1),
      isToday: false,
      categoryId: workCategory.id,
      nextAction: "最初の1行だけメモを書く",
      estimateMinutes: 10,
      sortOrder: 60,
      createdAt: unstartedCreatedAt
    }
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
