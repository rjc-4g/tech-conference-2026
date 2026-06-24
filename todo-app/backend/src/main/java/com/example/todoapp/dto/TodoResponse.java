package com.example.todoapp.dto;

import com.example.todoapp.entity.Priority;

import java.time.LocalDate;
import java.time.LocalDateTime;

public record TodoResponse(
        Long id,
        String title,
        String description,
        CategoryResponse category,
        Long parentId,
        Priority priority,
        LocalDate dueDate,
        boolean isToday,
        boolean isCompleted,
        int progress,
        String firstAction,
        int sortOrder,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
}
