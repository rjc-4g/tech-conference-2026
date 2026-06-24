package com.example.todoapp.dto;

import com.example.todoapp.entity.Priority;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;

public record TodoRequest(
        @NotBlank(message = "タスク名を入力してください")
        String title,

        String description,

        Long categoryId,

        Long parentId,

        @NotNull(message = "優先度を選択してください")
        Priority priority,

        LocalDate dueDate,

        boolean isToday,

        boolean isCompleted,

        @Min(value = 0, message = "進捗率は0〜100で入力してください")
        @Max(value = 100, message = "進捗率は0〜100で入力してください")
        int progress,

        String firstAction,

        Integer sortOrder
) {
}
