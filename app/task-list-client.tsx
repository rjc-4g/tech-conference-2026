"use client";

import { type CSSProperties, FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Priority } from "@prisma/client";
import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { APP_TIMEZONE } from "@/lib/date";
import { buildTaskHierarchy, type TaskFilter, type TaskListMeta, type TaskViewDto } from "@/lib/task-view";

export type CategoryOption = {
  id: string;
  name: string;
  color: string | null;
  sortOrder: number;
};

type CategoryFormState = {
  name: string;
  color: string;
  colorEnabled: boolean;
};

type TaskFormState = {
  title: string;
  description: string;
  parentId: string;
  categoryId: string;
  dueDate: string;
  priority: Priority;
  isToday: boolean;
  nextAction: string;
  estimateMinutes: string;
};

type ApiErrorResponse = {
  error?: string;
  message?: string;
};

type ReorderResponse = {
  parentId: string | null;
  reorderedTaskIds: string[];
  tasks: Array<{ id: string; sortOrder: number }>;
};

type TaskRowDragHandle = Pick<
  ReturnType<typeof useSortable>,
  "attributes" | "listeners" | "setActivatorNodeRef"
> & {
  disabled: boolean;
};

const priorityLabel = {
  high: "高",
  medium: "中",
  low: "低"
} as const;

const priorityClassName = {
  high: "border-red-200 bg-red-50 text-red-700",
  medium: "border-amber-200 bg-amber-50 text-amber-700",
  low: "border-slate-200 bg-slate-50 text-slate-600"
} as const;

const emptyForm: TaskFormState = {
  title: "",
  description: "",
  parentId: "",
  categoryId: "",
  dueDate: "",
  priority: "medium",
  isToday: false,
  nextAction: "",
  estimateMinutes: ""
};

const emptyCategoryForm: CategoryFormState = {
  name: "",
  color: "#60a5fa",
  colorEnabled: true
};

function toDateInputValue(dateText: string | null) {
  if (!dateText) return "";

  return new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date(dateText));
}

function formatDate(dateText: string | null) {
  if (!dateText) return "期限なし";

  return new Intl.DateTimeFormat("ja-JP", {
    timeZone: APP_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date(dateText));
}

function formatMinutes(minutes: number | null) {
  if (minutes === null) return "未設定";
  return `${minutes}分`;
}

function formStateFromTask(task: TaskViewDto): TaskFormState {
  return {
    title: task.title,
    description: task.description ?? "",
    parentId: task.parentId ?? "",
    categoryId: task.categoryId ?? "",
    dueDate: toDateInputValue(task.dueDate),
    priority: task.priority,
    isToday: task.isToday,
    nextAction: task.nextAction,
    estimateMinutes: task.estimateMinutes === null ? "" : String(task.estimateMinutes)
  };
}

function ProgressBar({ value }: { value: number }) {
  const safeValue = Math.min(100, Math.max(0, value));

  return (
    <div className="flex items-center gap-3">
      <div
        className="h-2 w-28 overflow-hidden rounded-full bg-slate-200"
        role="progressbar"
        aria-label={`進捗 ${safeValue}%`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={safeValue}
      >
        <div
          className="h-full rounded-full bg-slate-900"
          style={{ width: `${safeValue}%` }}
        />
      </div>
      <span className="w-10 text-right text-xs font-semibold text-slate-600">{safeValue}%</span>
    </div>
  );
}

function CategoryBadge({ task }: { task: TaskViewDto }) {
  if (!task.category) {
    return (
      <span className="inline-flex rounded-full border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-500">
        カテゴリなし
      </span>
    );
  }

  return (
    <span
      className="inline-flex rounded-full border px-2.5 py-1 text-xs font-medium text-slate-700"
      style={{
        borderColor: task.category.color ?? "#e2e8f0",
        backgroundColor: `${task.category.color ?? "#e2e8f0"}22`
      }}
    >
      {task.category.name}
    </span>
  );
}

function TaskRow({
  task,
  isChild = false,
  isDeleting,
  isReordering = false,
  isWorking = false,
  isCompleting = false,
  dragHandle,
  onWork,
  onToggleComplete,
  onEdit,
  onDelete
}: {
  task: TaskViewDto;
  isChild?: boolean;
  isDeleting: boolean;
  isReordering?: boolean;
  isWorking?: boolean;
  isCompleting?: boolean;
  dragHandle?: TaskRowDragHandle;
  onWork: (task: TaskViewDto) => void;
  onToggleComplete: (task: TaskViewDto, completed: boolean) => void;
  onEdit: (task: TaskViewDto) => void;
  onDelete: (task: TaskViewDto) => void;
}) {
  return (
    <article
      data-testid="task-card"
      data-task-id={task.id}
      data-context-only={task.contextOnly ? "true" : "false"}
      className={`rounded-2xl border bg-white p-4 shadow-sm ${
        isChild ? "ml-8 border-slate-200" : "border-slate-200"
      } ${task.contextOnly ? "border-dashed bg-slate-50/70 opacity-90" : ""}`}
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-3">
            {dragHandle && (
              <button
                type="button"
                ref={dragHandle.setActivatorNodeRef}
                {...dragHandle.attributes}
                {...dragHandle.listeners}
                disabled={dragHandle.disabled}
                aria-label={`${task.title}をドラッグして並べ替える`}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-sm font-bold text-slate-500 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                ↕
              </button>
            )}
            <input
              type="checkbox"
              checked={task.status === "done"}
              onChange={(event) => onToggleComplete(task, event.target.checked)}
              disabled={isCompleting || isWorking || isDeleting || isReordering}
              aria-label={`${task.title}の完了状態を切り替える`}
              className="h-5 w-5 rounded border-slate-300 disabled:cursor-not-allowed disabled:opacity-50"
            />
            <h2
              data-testid="task-title"
              className={`truncate text-base font-bold ${
                task.status === "done" ? "text-slate-400 line-through" : "text-slate-950"
              }`}
            >
              {task.title}
            </h2>
            {isChild && (
              <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-500">
                子タスク
              </span>
            )}
            {task.contextOnly && (
              <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-500">
                関連する親タスク
              </span>
            )}
            {task.hasUnstartedRisk && (
              <span className="rounded-full bg-orange-100 px-2 py-1 text-xs font-semibold text-orange-700">
                未着手リスク
              </span>
            )}
            {task.isOverdue && (
              <span className="rounded-full bg-red-100 px-2 py-1 text-xs font-semibold text-red-700">
                期限切れ
              </span>
            )}
          </div>

          {task.description && (
            <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-600">
              {task.description}
            </p>
          )}

          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2 xl:grid-cols-5">
            <div>
              <dt className="text-xs font-semibold text-slate-400">カテゴリ</dt>
              <dd className="mt-1">
                <CategoryBadge task={task} />
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold text-slate-400">期限</dt>
              <dd className="mt-1 font-medium text-slate-700">{formatDate(task.dueDate)}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold text-slate-400">優先度</dt>
              <dd className="mt-1">
                <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${priorityClassName[task.priority]}`}>
                  {priorityLabel[task.priority]}
                </span>
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold text-slate-400">見積時間</dt>
              <dd className="mt-1 font-medium text-slate-700">{formatMinutes(task.estimateMinutes)}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold text-slate-400">進捗</dt>
              <dd className="mt-2">
                <ProgressBar value={task.progress} />
              </dd>
            </div>
          </dl>

          <p className="mt-3 text-sm text-slate-500">
            次の行動: <span className="font-medium text-slate-700">{task.nextAction}</span>
          </p>
        </div>

        <div className="flex flex-wrap gap-2 lg:justify-end">
          <button
            type="button"
            onClick={() => onWork(task)}
            disabled={isCompleting || isWorking || isDeleting || isReordering}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isWorking ? "更新中..." : task.lastWorkedAt ? "作業した" : "着手"}
          </button>
          <button
            type="button"
            onClick={() => onEdit(task)}
            disabled={isCompleting || isWorking || isDeleting || isReordering}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            編集
          </button>
          <button
            type="button"
            onClick={() => onDelete(task)}
            disabled={isCompleting || isWorking || isDeleting || isReordering}
            className="rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isDeleting ? "削除中..." : "削除"}
          </button>
        </div>
      </div>
    </article>
  );
}

function SortableTaskRow({
  task,
  isChild = false,
  isDeleting,
  isReordering,
  isWorking,
  isCompleting,
  onWork,
  onToggleComplete,
  onEdit,
  onDelete
}: {
  task: TaskViewDto;
  isChild?: boolean;
  isDeleting: boolean;
  isReordering: boolean;
  isWorking: boolean;
  isCompleting: boolean;
  onWork: (task: TaskViewDto) => void;
  onToggleComplete: (task: TaskViewDto, completed: boolean) => void;
  onEdit: (task: TaskViewDto) => void;
  onDelete: (task: TaskViewDto) => void;
}) {
  const isDragDisabled = isDeleting || isWorking || isCompleting || isReordering;
  const {
    attributes,
    listeners,
    setActivatorNodeRef,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({
    id: task.id,
    disabled: isDragDisabled
  });

  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : undefined
  };

  return (
    <div ref={setNodeRef} style={style}>
      <TaskRow
        task={task}
        isChild={isChild}
        isDeleting={isDeleting}
        isReordering={isReordering}
        isWorking={isWorking}
        isCompleting={isCompleting}
        dragHandle={{
          attributes,
          listeners,
          setActivatorNodeRef,
          disabled: isDragDisabled
        }}
        onWork={onWork}
        onToggleComplete={onToggleComplete}
        onEdit={onEdit}
        onDelete={onDelete}
      />
    </div>
  );
}

function ReorderableTaskRow({
  task,
  isChild = false,
  isDeleting,
  isReordering,
  isWorking,
  isCompleting,
  onWork,
  onToggleComplete,
  onEdit,
  onDelete
}: {
  task: TaskViewDto;
  isChild?: boolean;
  isDeleting: boolean;
  isReordering: boolean;
  isWorking: boolean;
  isCompleting: boolean;
  onWork: (task: TaskViewDto) => void;
  onToggleComplete: (task: TaskViewDto, completed: boolean) => void;
  onEdit: (task: TaskViewDto) => void;
  onDelete: (task: TaskViewDto) => void;
}) {
  if (task.contextOnly) {
    return (
      <TaskRow
        task={task}
        isChild={isChild}
        isDeleting={isDeleting}
        isReordering={isReordering}
        isWorking={isWorking}
        isCompleting={isCompleting}
        onWork={onWork}
        onToggleComplete={onToggleComplete}
        onEdit={onEdit}
        onDelete={onDelete}
      />
    );
  }

  return (
    <SortableTaskRow
      task={task}
      isChild={isChild}
      isDeleting={isDeleting}
      isReordering={isReordering}
      isWorking={isWorking}
      isCompleting={isCompleting}
      onWork={onWork}
      onToggleComplete={onToggleComplete}
      onEdit={onEdit}
      onDelete={onDelete}
    />
  );
}

function TaskModal({
  mode,
  form,
  categories,
  parentOptions,
  parentSelectDisabled,
  isSubmitting,
  errorMessage,
  onChange,
  onClose,
  onSubmit
}: {
  mode: "create" | "edit";
  form: TaskFormState;
  categories: CategoryOption[];
  parentOptions: TaskViewDto[];
  parentSelectDisabled: boolean;
  isSubmitting: boolean;
  errorMessage: string | null;
  onChange: (patch: Partial<TaskFormState>) => void;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const titleInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    titleInputRef.current?.focus();
  }, []);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4 py-6"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="task-modal-heading"
        className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl sm:p-8"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-slate-500">
              {mode === "create" ? "新規TODO" : "TODO編集"}
            </p>
            <h2 id="task-modal-heading" className="mt-1 text-2xl font-bold text-slate-950">
              {mode === "create" ? "TODOを登録" : "TODOを編集"}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
          >
            閉じる
          </button>
        </div>

        {errorMessage && (
          <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
            {errorMessage}
          </div>
        )}

        <form onSubmit={onSubmit} className="mt-6 grid gap-5">
          <div className="grid gap-2">
            <label htmlFor="task-title" className="text-sm font-semibold text-slate-700">
              タイトル <span className="text-red-500">*</span>
            </label>
            <input
              ref={titleInputRef}
              id="task-title"
              value={form.title}
              onChange={(event) => onChange({ title: event.target.value })}
              required
              className="rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-500"
              placeholder="例: 英語学習"
            />
          </div>

          <div className="grid gap-2">
            <label htmlFor="task-description" className="text-sm font-semibold text-slate-700">
              説明
            </label>
            <textarea
              id="task-description"
              value={form.description}
              onChange={(event) => onChange({ description: event.target.value })}
              rows={3}
              className="rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-500"
              placeholder="補足があれば入力"
            />
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <div className="grid gap-2">
              <label htmlFor="task-parent" className="text-sm font-semibold text-slate-700">
                親タスク
              </label>
              <select
                id="task-parent"
                value={form.parentId}
                onChange={(event) => onChange({ parentId: event.target.value })}
                disabled={parentSelectDisabled}
                className="rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-500 disabled:bg-slate-100 disabled:text-slate-400"
              >
                <option value="">親タスクなし</option>
                {parentOptions.map((task) => (
                  <option key={task.id} value={task.id}>
                    {task.title}
                  </option>
                ))}
              </select>
              {parentSelectDisabled && (
                <p className="text-xs text-slate-500">
                  子タスクを持つタスクは、別タスクの子タスクには変更できません。
                </p>
              )}
            </div>

            <div className="grid gap-2">
              <label htmlFor="task-category" className="text-sm font-semibold text-slate-700">
                カテゴリ
              </label>
              <select
                id="task-category"
                value={form.categoryId}
                onChange={(event) => onChange({ categoryId: event.target.value })}
                className="rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-500"
              >
                <option value="">カテゴリなし</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid gap-5 md:grid-cols-3">
            <div className="grid gap-2">
              <label htmlFor="task-due-date" className="text-sm font-semibold text-slate-700">
                期限日
              </label>
              <input
                id="task-due-date"
                type="date"
                value={form.dueDate}
                onChange={(event) => onChange({ dueDate: event.target.value })}
                className="rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-500"
              />
            </div>

            <div className="grid gap-2">
              <label htmlFor="task-priority" className="text-sm font-semibold text-slate-700">
                優先度
              </label>
              <select
                id="task-priority"
                value={form.priority}
                onChange={(event) => onChange({ priority: event.target.value as Priority })}
                className="rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-500"
              >
                <option value="high">高</option>
                <option value="medium">中</option>
                <option value="low">低</option>
              </select>
            </div>

            <div className="grid gap-2">
              <label htmlFor="task-estimate" className="text-sm font-semibold text-slate-700">
                見積時間（分）
              </label>
              <input
                id="task-estimate"
                type="number"
                min={0}
                step={1}
                value={form.estimateMinutes}
                onChange={(event) => onChange({ estimateMinutes: event.target.value })}
                className="rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-500"
                placeholder="30"
              />
            </div>
          </div>

          <label className="flex items-center gap-3 rounded-2xl border border-slate-200 p-4 text-sm font-semibold text-slate-700">
            <input
              type="checkbox"
              checked={form.isToday}
              onChange={(event) => onChange({ isToday: event.target.checked })}
              className="h-5 w-5 rounded border-slate-300"
            />
            今日やるTODOにする
          </label>

          <div className="grid gap-2">
            <label htmlFor="task-next-action" className="text-sm font-semibold text-slate-700">
              次にやる具体的な行動 <span className="text-red-500">*</span>
            </label>
            <input
              id="task-next-action"
              value={form.nextAction}
              onChange={(event) => onChange({ nextAction: event.target.value })}
              required
              className="rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-500"
              placeholder="例: 単語帳の1〜20ページを15分読む"
            />
          </div>

          <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              {isSubmitting ? "保存中..." : mode === "create" ? "登録する" : "更新する"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

async function fetchApiError(response: Response) {
  try {
    const data = (await response.json()) as ApiErrorResponse;
    return data.message ?? "APIリクエストに失敗しました。";
  } catch {
    return "APIリクエストに失敗しました。";
  }
}

function CategoryManager({
  categories,
  form,
  editingCategoryId,
  isSubmitting,
  deletingCategoryId,
  errorMessage,
  onChange,
  onSubmit,
  onEdit,
  onCancelEdit,
  onDelete
}: {
  categories: CategoryOption[];
  form: CategoryFormState;
  editingCategoryId: string | null;
  isSubmitting: boolean;
  deletingCategoryId: string | null;
  errorMessage: string | null;
  onChange: (patch: Partial<CategoryFormState>) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onEdit: (category: CategoryOption) => void;
  onCancelEdit: () => void;
  onDelete: (category: CategoryOption) => void;
}) {
  return (
    <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-500">Category</p>
          <h2 className="mt-1 text-2xl font-bold text-slate-950">カテゴリ管理</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            カテゴリを作成・更新・削除できます。削除時はカテゴリだけを論理削除し、参照中TODOは「カテゴリなし」に戻します。
          </p>
        </div>
      </div>

      {errorMessage && (
        <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
          {errorMessage}
        </div>
      )}

      <form onSubmit={onSubmit} className="mt-6 grid gap-4 lg:grid-cols-[1fr_180px_auto] lg:items-end">
        <div className="grid gap-2">
          <label htmlFor="category-name" className="text-sm font-semibold text-slate-700">
            カテゴリ名 <span className="text-red-500">*</span>
          </label>
          <input
            id="category-name"
            value={form.name}
            onChange={(event) => onChange({ name: event.target.value })}
            required
            maxLength={50}
            className="rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-500"
            placeholder="例: 学習"
          />
        </div>

        <div className="grid gap-2">
          <label htmlFor="category-color" className="text-sm font-semibold text-slate-700">
            表示色
          </label>
          <div className="flex items-center gap-3">
            <input
              id="category-color"
              type="color"
              value={form.color}
              onChange={(event) => onChange({ color: event.target.value, colorEnabled: true })}
              disabled={!form.colorEnabled}
              className="h-12 w-16 rounded-xl border border-slate-200 bg-white px-2 py-2 disabled:opacity-40"
              aria-label="カテゴリ表示色"
            />
            <label className="flex items-center gap-2 text-sm font-medium text-slate-600">
              <input
                type="checkbox"
                checked={form.colorEnabled}
                onChange={(event) => onChange({ colorEnabled: event.target.checked })}
                className="h-4 w-4 rounded border-slate-300"
              />
              色を設定する
            </label>
          </div>
        </div>

        <div className="flex gap-2">
          {editingCategoryId && (
            <button
              type="button"
              onClick={onCancelEdit}
              disabled={isSubmitting}
              className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              取消
            </button>
          )}
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            {isSubmitting ? "保存中..." : editingCategoryId ? "更新" : "作成"}
          </button>
        </div>
      </form>

      <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {categories.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-slate-300 p-5 text-sm text-slate-500">
            カテゴリはまだありません。
          </p>
        ) : (
          categories.map((category) => (
            <div
              key={category.id}
              className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 p-4"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span
                    className="h-3 w-3 rounded-full border border-slate-200"
                    style={{ backgroundColor: category.color ?? "#e2e8f0" }}
                    aria-hidden="true"
                  />
                  <p className="truncate text-sm font-bold text-slate-950">{category.name}</p>
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  {category.color ? category.color : "色なし"}
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                <button
                  type="button"
                  onClick={() => onEdit(category)}
                  disabled={Boolean(deletingCategoryId)}
                  aria-label={`${category.name}を編集`}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  編集
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(category)}
                  disabled={Boolean(deletingCategoryId)}
                  aria-label={`${category.name}を削除`}
                  className="rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {deletingCategoryId === category.id ? "削除中..." : "削除"}
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}

export function TaskListClient({
  initialTasks,
  initialCategories,
  initialMeta,
  initialErrorMessage
}: {
  initialTasks: TaskViewDto[];
  initialCategories: CategoryOption[];
  initialMeta: TaskListMeta;
  initialErrorMessage: string | null;
}) {
  const [tasks, setTasks] = useState(initialTasks);
  const [categories, setCategories] = useState(initialCategories);
  const [activeFilter, setActiveFilter] = useState<TaskFilter>(initialMeta.filter);
  const [searchQuery, setSearchQuery] = useState(initialMeta.q);
  const [appliedSearchQuery, setAppliedSearchQuery] = useState(initialMeta.q);
  const [activeCategoryId, setActiveCategoryId] = useState(initialMeta.categoryId ?? "");
  const [listMeta, setListMeta] = useState(initialMeta);
  const [isFilterLoading, setIsFilterLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(initialErrorMessage);
  const [modalMode, setModalMode] = useState<"create" | "edit" | null>(null);
  const [editingTask, setEditingTask] = useState<TaskViewDto | null>(null);
  const [form, setForm] = useState<TaskFormState>(emptyForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingTaskId, setDeletingTaskId] = useState<string | null>(null);
  const [workingTaskId, setWorkingTaskId] = useState<string | null>(null);
  const [completingTaskId, setCompletingTaskId] = useState<string | null>(null);
  const [isReordering, setIsReordering] = useState(false);
  const [formErrorMessage, setFormErrorMessage] = useState<string | null>(null);
  const [categoryForm, setCategoryForm] = useState<CategoryFormState>(emptyCategoryForm);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [isCategorySubmitting, setIsCategorySubmitting] = useState(false);
  const [deletingCategoryId, setDeletingCategoryId] = useState<string | null>(null);
  const [categoryErrorMessage, setCategoryErrorMessage] = useState<string | null>(null);

  const hierarchy = useMemo(() => buildTaskHierarchy(tasks), [tasks]);
  const taskById = useMemo(() => new Map(tasks.map((task) => [task.id, task])), [tasks]);
  const activeCategory = useMemo(
    () => categories.find((category) => category.id === activeCategoryId) ?? null,
    [categories, activeCategoryId]
  );
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );
  const totalEstimateMinutes = listMeta.totalEstimateMinutes;
  const workingParentId = useMemo(() => {
    if (!workingTaskId) return null;
    return taskById.get(workingTaskId)?.parentId ?? null;
  }, [taskById, workingTaskId]);

  const parentOptions = useMemo(
    () => tasks.filter((task) => task.parentId === null && task.id !== editingTask?.id),
    [tasks, editingTask]
  );

  const parentSelectDisabled = Boolean(editingTask && editingTask.childrenCount > 0);

  async function refreshCategories() {
    const response = await fetch("/api/categories", { cache: "no-store" });
    if (!response.ok) {
      throw new Error(await fetchApiError(response));
    }

    const data = (await response.json()) as { categories: CategoryOption[] };
    setCategories(data.categories);
  }

  function openCreateModal() {
    void refreshCategories().catch((error) => {
      console.error(error);
      setErrorMessage(
        error instanceof Error ? error.message : "カテゴリ一覧の再取得に失敗しました。"
      );
    });
    setForm(emptyForm);
    setEditingTask(null);
    setFormErrorMessage(null);
    setModalMode("create");
  }

  function openEditModal(task: TaskViewDto) {
    void refreshCategories().catch((error) => {
      console.error(error);
      setErrorMessage(
        error instanceof Error ? error.message : "カテゴリ一覧の再取得に失敗しました。"
      );
    });
    setForm(formStateFromTask(task));
    setEditingTask(task);
    setFormErrorMessage(null);
    setModalMode("edit");
  }

  const closeModal = useCallback(() => {
    if (isSubmitting) return;
    setModalMode(null);
    setEditingTask(null);
    setFormErrorMessage(null);
  }, [isSubmitting]);

  async function refreshTasks(
    nextFilter: TaskFilter = activeFilter,
    nextSearchQuery = appliedSearchQuery,
    nextCategoryId = activeCategoryId
  ) {
    const params = new URLSearchParams({ filter: nextFilter });
    const normalizedQuery = nextSearchQuery.trim();
    const normalizedCategoryId = nextCategoryId.trim();
    if (normalizedQuery) {
      params.set("q", normalizedQuery);
    }
    if (normalizedCategoryId) {
      params.set("categoryId", normalizedCategoryId);
    }

    const response = await fetch(`/api/tasks?${params.toString()}`, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(await fetchApiError(response));
    }

    const data = (await response.json()) as { tasks: TaskViewDto[]; meta: TaskListMeta };
    setTasks(data.tasks);
    setListMeta(data.meta);
    setActiveFilter(data.meta.filter);
    setAppliedSearchQuery(data.meta.q);
    setActiveCategoryId(data.meta.categoryId ?? "");
  }

  async function handleFilterChange(nextFilter: TaskFilter) {
    if (nextFilter === activeFilter || isFilterLoading) return;

    const previousFilter = activeFilter;
    setActiveFilter(nextFilter);
    setIsFilterLoading(true);
    setErrorMessage(null);

    try {
      await refreshTasks(nextFilter, appliedSearchQuery);
    } catch (error) {
      console.error(error);
      setActiveFilter(previousFilter);
      setErrorMessage(
        error instanceof Error ? error.message : "TODO一覧の再取得に失敗しました。"
      );
    } finally {
      setIsFilterLoading(false);
    }
  }

  async function handleCategoryFilterChange(nextCategoryId: string) {
    if (nextCategoryId === activeCategoryId || isFilterLoading) return;

    const previousCategoryId = activeCategoryId;
    setActiveCategoryId(nextCategoryId);
    setIsFilterLoading(true);
    setErrorMessage(null);

    try {
      await refreshTasks(activeFilter, appliedSearchQuery, nextCategoryId);
    } catch (error) {
      console.error(error);
      setActiveCategoryId(previousCategoryId);
      setErrorMessage(
        error instanceof Error ? error.message : "カテゴリフィルタの適用に失敗しました。"
      );
    } finally {
      setIsFilterLoading(false);
    }
  }

  async function handleSearchSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isFilterLoading) return;

    const previousSearchQuery = appliedSearchQuery;
    const nextSearchQuery = searchQuery.trim();
    setAppliedSearchQuery(nextSearchQuery);
    setIsFilterLoading(true);
    setErrorMessage(null);

    try {
      await refreshTasks(activeFilter, nextSearchQuery);
    } catch (error) {
      console.error(error);
      setAppliedSearchQuery(previousSearchQuery);
      setErrorMessage(
        error instanceof Error ? error.message : "TODO一覧の再取得に失敗しました。"
      );
    } finally {
      setIsFilterLoading(false);
    }
  }

  async function clearSearchQuery() {
    if (isFilterLoading) return;

    if (!appliedSearchQuery) {
      setSearchQuery("");
      return;
    }

    const previousSearchQuery = appliedSearchQuery;
    setSearchQuery("");
    setAppliedSearchQuery("");
    setIsFilterLoading(true);
    setErrorMessage(null);

    try {
      await refreshTasks(activeFilter, "");
    } catch (error) {
      console.error(error);
      setSearchQuery(previousSearchQuery);
      setAppliedSearchQuery(previousSearchQuery);
      setErrorMessage(
        error instanceof Error ? error.message : "TODO一覧の再取得に失敗しました。"
      );
    } finally {
      setIsFilterLoading(false);
    }
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id || isReordering) return;

    const activeTask = taskById.get(String(active.id));
    const overTask = taskById.get(String(over.id));
    if (!activeTask || !overTask) return;

    if (activeTask.contextOnly || overTask.contextOnly) return;
    if (activeTask.parentId !== overTask.parentId) {
      setErrorMessage("親子をまたぐ並べ替えはできません。同じ親配下のタスク同士で並べ替えてください。");
      return;
    }

    const parentId = activeTask.parentId ?? null;
    const visibleSiblingIds = tasks
      .filter((task) => (task.parentId ?? null) === parentId && !task.contextOnly)
      .map((task) => task.id);

    const oldIndex = visibleSiblingIds.indexOf(activeTask.id);
    const newIndex = visibleSiblingIds.indexOf(overTask.id);
    if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return;

    const orderedTaskIds = arrayMove(visibleSiblingIds, oldIndex, newIndex);

    setIsReordering(true);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/tasks/reorder", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          parentId,
          orderedTaskIds
        })
      });

      if (!response.ok) {
        throw new Error(await fetchApiError(response));
      }

      await response.json() as ReorderResponse;
      await refreshTasks(activeFilter, appliedSearchQuery);
    } catch (error) {
      console.error(error);
      setErrorMessage(error instanceof Error ? error.message : "TODOの並び替えに失敗しました。");
    } finally {
      setIsReordering(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    setFormErrorMessage(null);

    const estimateMinutes = form.estimateMinutes === "" ? null : Number(form.estimateMinutes);

    const payload = {
      title: form.title,
      description: form.description,
      parentId: form.parentId || null,
      categoryId: form.categoryId || null,
      dueDate: form.dueDate || null,
      priority: form.priority,
      isToday: form.isToday,
      nextAction: form.nextAction,
      estimateMinutes
    };

    try {
      const isEdit = modalMode === "edit" && editingTask;
      const response = await fetch(isEdit ? `/api/tasks/${editingTask.id}` : "/api/tasks", {
        method: isEdit ? "PATCH" : "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        setFormErrorMessage(await fetchApiError(response));
        return;
      }

      await refreshTasks();
      setModalMode(null);
      setEditingTask(null);
    } catch (error) {
      console.error(error);
      setFormErrorMessage(
        error instanceof Error ? error.message : "TODOの保存中に予期しないエラーが発生しました。"
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleWork(task: TaskViewDto) {
    if (workingTaskId || completingTaskId || deletingTaskId || isReordering) return;

    setWorkingTaskId(task.id);
    setErrorMessage(null);

    try {
      const response = await fetch(`/api/tasks/${task.id}/work`, {
        method: "PATCH"
      });

      if (!response.ok) {
        throw new Error(await fetchApiError(response));
      }

      await response.json();
      await refreshTasks();
    } catch (error) {
      console.error(error);
      setErrorMessage(error instanceof Error ? error.message : "TODOの着手日時更新に失敗しました。");
    } finally {
      setWorkingTaskId(null);
    }
  }

  async function handleToggleComplete(task: TaskViewDto, completed: boolean) {
    if (completingTaskId || workingTaskId || deletingTaskId || isReordering) return;

    setCompletingTaskId(task.id);
    setErrorMessage(null);

    try {
      const response = await fetch(`/api/tasks/${task.id}/complete`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ completed })
      });

      if (!response.ok) {
        throw new Error(await fetchApiError(response));
      }

      await response.json();
      await refreshTasks();
    } catch (error) {
      console.error(error);
      setErrorMessage(error instanceof Error ? error.message : "TODOの完了状態更新に失敗しました。");
    } finally {
      setCompletingTaskId(null);
    }
  }

  async function deleteTask(task: TaskViewDto, cascade: boolean) {
    const response = await fetch(`/api/tasks/${task.id}${cascade ? "?cascade=true" : ""}`, {
      method: "DELETE"
    });

    if (!response.ok) {
      throw new Error(await fetchApiError(response));
    }
  }

  async function handleDelete(task: TaskViewDto) {
    if (deletingTaskId) return;

    const confirmed = window.confirm(
      task.childrenCount > 0
        ? `「${task.title}」と配下の子タスク${task.childrenCount}件を削除します。よろしいですか？`
        : `「${task.title}」を削除します。よろしいですか？`
    );

    if (!confirmed) return;

    setDeletingTaskId(task.id);
    setErrorMessage(null);

    try {
      await deleteTask(task, task.childrenCount > 0);
      await refreshTasks();
    } catch (error) {
      console.error(error);
      setErrorMessage(error instanceof Error ? error.message : "TODOの削除に失敗しました。"
      );
    } finally {
      setDeletingTaskId(null);
    }
  }

  function editCategory(category: CategoryOption) {
    setEditingCategoryId(category.id);
    setCategoryForm({
      name: category.name,
      color: category.color ?? "#60a5fa",
      colorEnabled: category.color !== null
    });
    setCategoryErrorMessage(null);
  }

  function cancelCategoryEdit() {
    if (isCategorySubmitting) return;
    setEditingCategoryId(null);
    setCategoryForm(emptyCategoryForm);
    setCategoryErrorMessage(null);
  }

  async function handleCategorySubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isCategorySubmitting) return;

    setIsCategorySubmitting(true);
    setCategoryErrorMessage(null);

    try {
      const response = await fetch(
        editingCategoryId ? `/api/categories/${editingCategoryId}` : "/api/categories",
        {
          method: editingCategoryId ? "PATCH" : "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            name: categoryForm.name,
            color: categoryForm.colorEnabled ? categoryForm.color : null
          })
        }
      );

      if (!response.ok) {
        setCategoryErrorMessage(await fetchApiError(response));
        return;
      }

      await Promise.all([refreshCategories(), refreshTasks()]);
      setEditingCategoryId(null);
      setCategoryForm(emptyCategoryForm);
    } catch (error) {
      console.error(error);
      setCategoryErrorMessage(
        error instanceof Error ? error.message : "カテゴリの保存中に予期しないエラーが発生しました。"
      );
    } finally {
      setIsCategorySubmitting(false);
    }
  }

  async function handleCategoryDelete(category: CategoryOption) {
    if (deletingCategoryId || isCategorySubmitting) return;

    const confirmed = window.confirm(
      `カテゴリ「${category.name}」を削除します。参照中のTODOは「カテゴリなし」になります。よろしいですか？`
    );

    if (!confirmed) return;

    setDeletingCategoryId(category.id);
    setCategoryErrorMessage(null);

    try {
      const response = await fetch(`/api/categories/${category.id}`, {
        method: "DELETE"
      });

      if (!response.ok) {
        throw new Error(await fetchApiError(response));
      }

      if (editingCategoryId === category.id) {
        setEditingCategoryId(null);
        setCategoryForm(emptyCategoryForm);
      }

      const nextCategoryId = activeCategoryId === category.id ? "" : activeCategoryId;
      await Promise.all([refreshCategories(), refreshTasks(activeFilter, appliedSearchQuery, nextCategoryId)]);
    } catch (error) {
      console.error(error);
      setCategoryErrorMessage(
        error instanceof Error ? error.message : "カテゴリの削除に失敗しました。"
      );
    } finally {
      setDeletingCategoryId(null);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
      <section className="mx-auto max-w-7xl">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-500">AIAD TODO App</p>
              <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
                TODO一覧
              </h1>
              <p className="mt-3 max-w-2xl leading-7 text-slate-600">
                Task / Category のPrismaスキーマを使い、登録済みTODOを一覧表示します。
                登録・編集、カテゴリ管理、今日やるTODOフィルタを確認できます。
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs font-semibold text-slate-500">表示タスク数</p>
                  <p className="mt-1 text-2xl font-bold text-slate-950">{listMeta.totalCount}</p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs font-semibold text-slate-500">未完了</p>
                  <p className="mt-1 text-2xl font-bold text-slate-950">
                    {tasks.filter((task) => task.status === "todo").length}
                  </p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs font-semibold text-slate-500">
                    {activeFilter === "today" ? "今日の見積" : "未完了見積"}
                  </p>
                  <p className="mt-1 text-2xl font-bold text-slate-950">{totalEstimateMinutes}分</p>
                </div>
              </div>

              <button
                type="button"
                onClick={openCreateModal}
                disabled={isReordering}
                className="rounded-2xl bg-slate-950 px-5 py-4 text-sm font-bold text-white shadow-sm hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
              >
                TODO追加
              </button>
            </div>
          </div>
        </div>



        <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-500">Filter</p>
              <h2 className="mt-1 text-lg font-bold text-slate-950">表示フィルタ</h2>
              <p className="mt-1 text-sm text-slate-600">
                今日判定はサーバ側で {listMeta.timezone} 基準です
                {listMeta.today ? `（${listMeta.today}）` : ""}。
                今日表示の合計見積時間には、関連表示のみの親タスクは含めません。
                ドラッグ並べ替えは同一親配下で行い、関連表示のみの親タスクは対象外です。
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {([
                ["all", "すべて"],
                ["today", "今日"]
              ] as const).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => void handleFilterChange(value)}
                  disabled={isFilterLoading}
                  className={`rounded-xl border px-4 py-2 text-sm font-bold ${
                    activeFilter === value
                      ? "border-slate-950 bg-slate-950 text-white"
                      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                  } disabled:cursor-not-allowed disabled:opacity-60`}
                >
                  {isFilterLoading && activeFilter === value ? "読込中..." : label}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-5 grid gap-2 sm:max-w-sm">
            <label htmlFor="task-category-filter" className="text-sm font-semibold text-slate-700">
              カテゴリで絞り込み
            </label>
            <select
              id="task-category-filter"
              value={activeCategoryId}
              onChange={(event) => void handleCategoryFilterChange(event.target.value)}
              disabled={isFilterLoading}
              className="rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-500 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
            >
              <option value="">すべてのカテゴリ</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>

          <form onSubmit={handleSearchSubmit} className="mt-5 flex flex-col gap-3 sm:flex-row">
            <div className="grid flex-1 gap-2">
              <label htmlFor="task-search" className="text-sm font-semibold text-slate-700">
                タスク検索
              </label>
              <input
                id="task-search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-500"
                placeholder="タイトル、説明、次の行動、カテゴリ名で検索"
              />
            </div>
            <div className="flex gap-2 sm:items-end">
              <button
                type="submit"
                disabled={isFilterLoading}
                className="rounded-xl bg-slate-950 px-5 py-3 text-sm font-bold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
              >
                検索
              </button>
              <button
                type="button"
                onClick={() => void clearSearchQuery()}
                disabled={isFilterLoading || (!searchQuery && !appliedSearchQuery)}
                className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                クリア
              </button>
            </div>
          </form>

          {(appliedSearchQuery || activeCategory || listMeta.contextOnlyCount > 0) && (
            <div className="mt-3 space-y-1 text-sm text-slate-500">
              {activeCategory && (
                <p>
                  カテゴリ「{activeCategory.name}」で絞り込み中です。
                </p>
              )}
              {appliedSearchQuery && (
                <p>
                  検索語「{appliedSearchQuery}」で直接一致 {listMeta.directMatchedCount} 件を表示しています。
                </p>
              )}
              {listMeta.contextOnlyCount > 0 && (
                <p>
                  関連する親タスク {listMeta.contextOnlyCount} 件を階層表示のために含めています。
                </p>
              )}
            </div>
          )}
        </div>

        <CategoryManager
          categories={categories}
          form={categoryForm}
          editingCategoryId={editingCategoryId}
          isSubmitting={isCategorySubmitting}
          deletingCategoryId={deletingCategoryId}
          errorMessage={categoryErrorMessage}
          onChange={(patch) => setCategoryForm((current) => ({ ...current, ...patch }))}
          onSubmit={handleCategorySubmit}
          onEdit={editCategory}
          onCancelEdit={cancelCategoryEdit}
          onDelete={handleCategoryDelete}
        />

        {errorMessage && (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-5 text-sm font-medium text-red-700">
            {errorMessage}
          </div>
        )}

        {isReordering && (
          <div className="mt-6 rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sm font-semibold text-sky-700">
            並べ替えを保存しています...
          </div>
        )}

        {!errorMessage && hierarchy.length === 0 && (
          <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
            <h2 className="text-lg font-bold text-slate-950">
              {activeFilter === "today" ? "今日やるTODOはありません" : "TODOがまだありません"}
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs">
                npm run db:seed
              </code>{" "}
              を実行すると、期限日・カテゴリ付きのサンプルタスクを確認できます。
            </p>
          </div>
        )}

        {!errorMessage && hierarchy.length > 0 && (
          <DndContext
            id="task-list-dnd"
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={hierarchy.filter(({ task }) => !task.contextOnly).map(({ task }) => task.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="mt-6 space-y-4">
                {hierarchy.map(({ task, children }) => (
                  <div key={task.id} className="space-y-3">
                    <ReorderableTaskRow
                      task={task}
                      isDeleting={deletingTaskId === task.id}
                      isReordering={isReordering}
                      isWorking={workingTaskId === task.id || workingParentId === task.id}
                      isCompleting={completingTaskId === task.id}
                      onWork={handleWork}
                      onToggleComplete={handleToggleComplete}
                      onEdit={openEditModal}
                      onDelete={handleDelete}
                    />
                    {children.length > 0 && (
                      <SortableContext
                        items={children.filter((child) => !child.contextOnly).map((child) => child.id)}
                        strategy={verticalListSortingStrategy}
                      >
                        <div className="space-y-3">
                          {children.map((child) => (
                            <ReorderableTaskRow
                              key={child.id}
                              task={child}
                              isChild
                              isDeleting={deletingTaskId === child.id || deletingTaskId === task.id}
                              isReordering={isReordering}
                              isWorking={workingTaskId === child.id}
                              isCompleting={completingTaskId === child.id}
                              onWork={handleWork}
                              onToggleComplete={handleToggleComplete}
                              onEdit={openEditModal}
                              onDelete={handleDelete}
                            />
                          ))}
                        </div>
                      </SortableContext>
                    )}
                  </div>
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </section>

      {modalMode && (
        <TaskModal
          mode={modalMode}
          form={form}
          categories={categories}
          parentOptions={parentOptions}
          parentSelectDisabled={parentSelectDisabled}
          isSubmitting={isSubmitting}
          errorMessage={formErrorMessage}
          onChange={(patch) => setForm((current) => ({ ...current, ...patch }))}
          onClose={closeModal}
          onSubmit={handleSubmit}
        />
      )}
    </main>
  );
}
