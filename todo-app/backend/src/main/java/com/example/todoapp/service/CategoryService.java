package com.example.todoapp.service;

import com.example.todoapp.dto.CategoryRequest;
import com.example.todoapp.dto.CategoryResponse;
import com.example.todoapp.entity.Category;
import com.example.todoapp.exception.ResourceNotFoundException;
import com.example.todoapp.mapper.CategoryMapper;
import com.example.todoapp.repository.CategoryRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class CategoryService {
    private final CategoryRepository categoryRepository;

    public CategoryService(CategoryRepository categoryRepository) {
        this.categoryRepository = categoryRepository;
    }

    @Transactional(readOnly = true)
    public List<CategoryResponse> findAll() {
        return categoryRepository.findAll()
                .stream()
                .map(CategoryMapper::toResponse)
                .toList();
    }

    @Transactional
    public CategoryResponse create(CategoryRequest request) {
        Category category = new Category();
        category.setName(request.name());
        category.setColor(request.color());

        return CategoryMapper.toResponse(categoryRepository.save(category));
    }

    @Transactional
    public CategoryResponse update(Long id, CategoryRequest request) {
        Category category = categoryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("カテゴリが見つかりません"));

        category.setName(request.name());
        category.setColor(request.color());

        return CategoryMapper.toResponse(categoryRepository.save(category));
    }

    @Transactional
    public void delete(Long id) {
        if (!categoryRepository.existsById(id)) {
            throw new ResourceNotFoundException("カテゴリが見つかりません");
        }

        categoryRepository.deleteById(id);
    }
}
