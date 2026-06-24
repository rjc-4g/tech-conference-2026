package com.example.todoapp.dto;

import jakarta.validation.constraints.NotBlank;

public record CategoryRequest(
        @NotBlank(message = "カテゴリ名を入力してください")
        String name,
        String color
) {
}
