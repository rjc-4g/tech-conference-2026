package com.example.todoapp.mapper;

import com.example.todoapp.dto.TodoResponse;
import com.example.todoapp.entity.Todo;

public class TodoMapper {
    private TodoMapper() {
    }

    public static TodoResponse toResponse(Todo todo) {
        return new TodoResponse(
                todo.getId(),
                todo.getTitle(),
                todo.getDescription(),
                CategoryMapper.toResponse(todo.getCategory()),
                todo.getParentId(),
                todo.getPriority(),
                todo.getDueDate(),
                todo.isToday(),
                todo.isCompleted(),
                todo.getProgress(),
                todo.getFirstAction(),
                todo.getSortOrder(),
                todo.getCreatedAt(),
                todo.getUpdatedAt()
        );
    }
}
