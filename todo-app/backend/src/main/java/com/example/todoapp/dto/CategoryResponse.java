package com.example.todoapp.dto;

import java.time.LocalDateTime;

public record CategoryResponse(
        Long id,
        String name,
        String color,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
}
