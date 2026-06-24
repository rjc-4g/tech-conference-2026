package com.example.todoapp.config;

import com.example.todoapp.entity.Category;
import com.example.todoapp.repository.CategoryRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class DataInitializer {
    @Bean
    CommandLineRunner initCategories(CategoryRepository categoryRepository) {
        return args -> {
            if (categoryRepository.count() > 0) {
                return;
            }

            createCategory(categoryRepository, "仕事", "#2563eb");
            createCategory(categoryRepository, "学習", "#16a34a");
            createCategory(categoryRepository, "家事", "#f97316");
            createCategory(categoryRepository, "買い物", "#a855f7");
            createCategory(categoryRepository, "健康", "#dc2626");
            createCategory(categoryRepository, "その他", "#64748b");
        };
    }

    private void createCategory(CategoryRepository repository, String name, String color) {
        Category category = new Category();
        category.setName(name);
        category.setColor(color);
        repository.save(category);
    }
}
