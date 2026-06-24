package com.example.todoapp.mapper;

import com.example.todoapp.dto.CategoryResponse;
import com.example.todoapp.entity.Category;

public class CategoryMapper {
    private CategoryMapper() {
    }

    public static CategoryResponse toResponse(Category category) {
        if (category == null) {
            return null;
        }

        return new CategoryResponse(
                category.getId(),
                category.getName(),
                category.getColor(),
                category.getCreatedAt(),
                category.getUpdatedAt()
        );
    }
}
