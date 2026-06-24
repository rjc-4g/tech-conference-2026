package com.example.todoapp.dto;

import jakarta.validation.constraints.NotEmpty;
import java.util.List;

public record TodoReorderRequest(
        @NotEmpty
        List<TodoOrderItem> items
) {
    public record TodoOrderItem(Long id, int sortOrder) {
    }
}
