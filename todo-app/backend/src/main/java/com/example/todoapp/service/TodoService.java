package com.example.todoapp.service;

import com.example.todoapp.dto.TodoReorderRequest;
import com.example.todoapp.dto.TodoRequest;
import com.example.todoapp.dto.TodoResponse;
import com.example.todoapp.entity.Category;
import com.example.todoapp.entity.Todo;
import com.example.todoapp.exception.ResourceNotFoundException;
import com.example.todoapp.mapper.TodoMapper;
import com.example.todoapp.repository.CategoryRepository;
import com.example.todoapp.repository.TodoRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class TodoService {
    private final TodoRepository todoRepository;
    private final CategoryRepository categoryRepository;

    public TodoService(TodoRepository todoRepository, CategoryRepository categoryRepository) {
        this.todoRepository = todoRepository;
        this.categoryRepository = categoryRepository;
    }

    @Transactional(readOnly = true)
    public List<TodoResponse> findAll() {
        return todoRepository.findAllByOrderBySortOrderAscIdAsc()
                .stream()
                .map(TodoMapper::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public TodoResponse findById(Long id) {
        return TodoMapper.toResponse(findTodo(id));
    }

    @Transactional
    public TodoResponse create(TodoRequest request) {
        Todo todo = new Todo();
        applyRequest(todo, request);

        if (request.sortOrder() == null) {
            todo.setSortOrder((int) todoRepository.count() + 1);
        }

        return TodoMapper.toResponse(todoRepository.save(todo));
    }

    @Transactional
    public TodoResponse update(Long id, TodoRequest request) {
        Todo todo = findTodo(id);
        applyRequest(todo, request);

        return TodoMapper.toResponse(todoRepository.save(todo));
    }

    @Transactional
    public void delete(Long id) {
        if (!todoRepository.existsById(id)) {
            throw new ResourceNotFoundException("TODOが見つかりません");
        }

        todoRepository.deleteById(id);
    }

    @Transactional
    public TodoResponse toggleComplete(Long id) {
        Todo todo = findTodo(id);
        boolean nextCompleted = !todo.isCompleted();
        todo.setCompleted(nextCompleted);

        if (nextCompleted) {
            todo.setProgress(100);
        }

        return TodoMapper.toResponse(todoRepository.save(todo));
    }

    @Transactional
    public void reorder(TodoReorderRequest request) {
        for (TodoReorderRequest.TodoOrderItem item : request.items()) {
            Todo todo = findTodo(item.id());
            todo.setSortOrder(item.sortOrder());
            todoRepository.save(todo);
        }
    }

    private Todo findTodo(Long id) {
        return todoRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("TODOが見つかりません"));
    }

    private void applyRequest(Todo todo, TodoRequest request) {
        Category category = null;
        if (request.categoryId() != null) {
            category = categoryRepository.findById(request.categoryId())
                    .orElseThrow(() -> new ResourceNotFoundException("カテゴリが見つかりません"));
        }

        todo.setTitle(request.title());
        todo.setDescription(request.description());
        todo.setCategory(category);
        todo.setParentId(request.parentId());
        todo.setPriority(request.priority());
        todo.setDueDate(request.dueDate());
        todo.setToday(request.isToday());
        todo.setCompleted(request.isCompleted());
        todo.setProgress(request.isCompleted() ? 100 : request.progress());
        todo.setFirstAction(request.firstAction());

        if (request.sortOrder() != null) {
            todo.setSortOrder(request.sortOrder());
        }
    }
}
