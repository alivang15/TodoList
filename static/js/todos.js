// static/js/todos.js
// Modal functionality
const modal = document.getElementById('taskModal');
const addTaskBtn = document.getElementById('addTaskBtn');
const closeBtn = document.querySelector('.close');
const cancelBtn = document.getElementById('cancelTask');

// Open modal
addTaskBtn?.addEventListener('click', function() {
    modal.style.display = "block";
});

// Close modal
closeBtn?.addEventListener('click', function() {
    modal.style.display = "none";
});

cancelBtn?.addEventListener('click', function() {
    modal.style.display = "none";
});

// Close modal when clicking outside
window.addEventListener('click', function(event) {
    if (event.target == modal) {
        modal.style.display = "none";
    }
});

// Form submission
document.getElementById('todoForm')?.addEventListener('submit', function(e) {
    e.preventDefault();
    
    const title = document.getElementById('todoTitle').value;
    const description = document.getElementById('todoDescription').value;
    const dueDate = document.getElementById('todoDate').value;
    
    fetch('/todos', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            title: title,
            description: description,
            dueDate: dueDate
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.status === 'success') {
            document.getElementById('todoForm').reset();
            modal.style.display = "none";
            window.location.reload();
        } else {
            alert('Error adding todo: ' + (data.message || 'Unknown error'));
        }
    })
    .catch(error => {
        console.error('Error:', error);
        alert('Error adding todo. Please try again.');
    });
});

// Edit Modal functionality
const editModal = document.getElementById('editModal');
const closeEditBtn = document.querySelector('.close-edit');
const cancelEditBtn = document.getElementById('cancelEdit');

// Function to open edit modal with todo data
function openEditModal(todoId, title, description, dueDate) {
    document.getElementById('editTodoId').value = todoId;
    document.getElementById('editTodoTitle').value = title;
    document.getElementById('editTodoDescription').value = description;
    document.getElementById('editTodoDate').value = dueDate;
    editModal.style.display = "block";
}

// Close edit modal
closeEditBtn.onclick = function() {
    editModal.style.display = "none";
}

cancelEditBtn.onclick = function() {
    editModal.style.display = "none";
}

// Close edit modal when clicking outside
window.onclick = function(event) {
    if (event.target == editModal) {
        editModal.style.display = "none";
    }
}

// Edit form submission
document.getElementById('editTodoForm').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const todoId = document.getElementById('editTodoId').value;
    const title = document.getElementById('editTodoTitle').value;
    const description = document.getElementById('editTodoDescription').value;
    const dueDate = document.getElementById('editTodoDate').value;
    
    // Add debug logging
    console.log('Updating todo:', {
        todoId,
        title,
        description,
        dueDate
    });
    
    fetch(`/todos/${todoId}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            title: title,
            description: description,
            dueDate: dueDate
        })
    })
    .then(response => {
        // Add response logging
        console.log('Response status:', response.status);
        return response.json();
    })
    .then(data => {
        // Add data logging
        console.log('Response data:', data);
        if (data.status === 'success') {
            editModal.style.display = "none";
            window.location.reload();
        } else {
            alert('Error updating todo: ' + (data.message || 'Unknown error'));
        }
    })
    .catch(error => {
        console.error('Error details:', error);
        alert('Error updating todo. Please try again.');
    });
});

// Update the todo-item template to include data attributes and edit button functionality
document.querySelectorAll('.todo-item').forEach(item => {
    const editBtn = item.querySelector('.btn-secondary');
    const title = item.querySelector('h3').textContent;
    const description = item.querySelector('p').textContent;
    const dueDateElement = item.querySelector('.due-date');
    const dueDate = dueDateElement ? 
        new Date(dueDateElement.textContent.replace('Due: ', '')).toISOString().split('T')[0] : 
        '';
    const todoId = item.dataset.todoId;

    editBtn.onclick = function() {
        openEditModal(todoId, title, description, dueDate);
    };
});

// Status update functionality
document.querySelectorAll('.status-select').forEach(select => {
    select.addEventListener('change', function() {
        const todoId = this.closest('.todo-item').dataset.todoId;
        const newStatus = this.value;
        
        fetch(`/todos/${todoId}/status`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                status: newStatus
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success') {
                // Update the todo item's data-status attribute
                this.closest('.todo-item').dataset.status = newStatus;
                // Apply current filter
                applyCurrentFilter();
            } else {
                alert('Error updating status: ' + (data.message || 'Unknown error'));
                // Reset the select to its previous value
                this.value = this.dataset.previousValue;
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert('Error updating status. Please try again.');
            // Reset the select to its previous value
            this.value = this.dataset.previousValue;
        });
    });

    // Store the initial value
    select.dataset.previousValue = select.value;
});

// Filter functionality
const navItems = document.querySelectorAll('.nav-item');
const todoItems = document.querySelectorAll('.todo-item');

function applyCurrentFilter() {
    const activeFilter = document.querySelector('.nav-item.active').dataset.filter;
    
    todoItems.forEach(item => {
        const status = item.dataset.status;
        
        switch(activeFilter) {
            case 'all':
                // Show both 'new' and 'in_progress' tasks
                item.style.display = (status === 'new' || status === 'in_progress') ? 'flex' : 'none';
                break;
            case 'active':
                // Show only 'in_progress' tasks
                item.style.display = status === 'in_progress' ? 'flex' : 'none';
                break;
            case 'completed':
                // Show only 'done' tasks
                item.style.display = status === 'done' ? 'flex' : 'none';
                break;
        }
    });
}

navItems.forEach(item => {
    item.addEventListener('click', function() {
        // Update active state
        navItems.forEach(nav => nav.classList.remove('active'));
        this.classList.add('active');
        
        // Apply filter
        applyCurrentFilter();
    });
});

// Initial filter application
applyCurrentFilter();

// Delete functionality
document.querySelectorAll('.btn-danger').forEach(button => {
    button.addEventListener('click', function() {
        const todoItem = this.closest('.todo-item');
        const todoId = todoItem.dataset.todoId;
        
        // Confirm before deleting
        if (confirm('Are you sure you want to delete this task?')) {
            fetch(`/todos/${todoId}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                }
            })
            .then(response => response.json())
            .then(data => {
                if (data.status === 'success') {
                    // Remove the todo item from the DOM
                    todoItem.remove();
                } else {
                    alert('Error deleting task: ' + (data.message || 'Unknown error'));
                }
            })
            .catch(error => {
                console.error('Error:', error);
                alert('Error deleting task. Please try again.');
            });
        }
    });
});

document.querySelectorAll('.toggle-comments').forEach(btn => {
    btn.addEventListener('click', function() {
        const todoItem = this.closest('.todo-item');
        const commentsSection = todoItem.querySelector('.comments-section');
        if (commentsSection.style.display === 'none') {
            commentsSection.style.display = 'block';
            loadComments(todoItem.dataset.todoId, commentsSection);
        } else {
            commentsSection.style.display = 'none';
        }
    });
});

function loadComments(todoId, section) {
    const commentsList = section.querySelector('.comments-list');
    commentsList.innerHTML = 'Loading...';
    fetch(`/todos/${todoId}/comments`)
        .then(res => res.json())
        .then(data => {
            if (data.status === 'success') {
                commentsList.innerHTML = '';
                if (data.comments.length === 0) {
                    commentsList.innerHTML = '<div>No comments yet.</div>';
                } else {
                    data.comments.forEach(comment => {
                        const commentDiv = document.createElement('div');
                        commentDiv.className = 'comment';
                        commentDiv.innerHTML = `
                            <div style="display:flex;align-items:center;justify-content:space-between;">
                                <div>
                                    <strong>${comment.firstName} ${comment.lastName[0]}.</strong>
                                    <span style="color:gray;font-size:0.9em;">${new Date(comment.create_at).toLocaleString()}</span>
                                </div>
                                ${comment.user_id === CURRENT_USER_ID ? `
                                    <div class="comment-menu" style="position:relative;">
                                        <button class="comment-dots" style="background:none;border:none;cursor:pointer;font-size:1.2em;">&#8942;</button>
                                        <div class="comment-dropdown" style="display:none;position:absolute;right:0;background:white;border:1px solid #ccc;z-index:10;">
                                            <button class="delete-comment-btn" data-comment-id="${comment.id}" style="color:red;background:none;border:none;cursor:pointer;padding:0.5em 1em;width:100%;">Delete</button>
                                        </div>
                                    </div>
                                ` : ''}
                            </div>
                            <div>${comment.content}</div>
                        `;
                        commentsList.appendChild(commentDiv);

                        // Add event listeners for the 3 dots and delete
                        const dotsBtn = commentDiv.querySelector('.comment-dots');
                        const dropdown = commentDiv.querySelector('.comment-dropdown');
                        if (dotsBtn && dropdown) {
                            dotsBtn.addEventListener('click', (e) => {
                                e.stopPropagation();
                                dropdown.style.display = dropdown.style.display === 'block' ? 'none' : 'block';
                            });
                            // Hide dropdown when clicking outside
                            document.addEventListener('click', () => {
                                dropdown.style.display = 'none';
                            });
                        }
                        const deleteBtn = commentDiv.querySelector('.delete-comment-btn');
                        if (deleteBtn) {
                            deleteBtn.addEventListener('click', function() {
                                if (confirm('Delete this comment?')) {
                                    fetch(`/comments/${this.dataset.commentId}`, {
                                        method: 'DELETE',
                                        headers: { 'Content-Type': 'application/json' }
                                    })
                                    .then(res => res.json())
                                    .then(data => {
                                        if (data.status === 'success') {
                                            loadComments(todoId, section); // reload comments
                                        } else {
                                            alert('Failed to delete comment');
                                        }
                                    });
                                }
                            });
                        }
                    });
                }
            } else {
                commentsList.innerHTML = 'Failed to load comments.';
            }
        });
}

document.querySelectorAll('.comment-form').forEach(form => {
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        const todoItem = this.closest('.todo-item');
        const todoId = todoItem.dataset.todoId;
        const textarea = this.querySelector('textarea');
        const content = textarea.value.trim();
        if (!content) return;
        fetch(`/todos/${todoId}/comments`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content })
        })
        .then(res => res.json())
        .then(data => {
            if (data.status === 'success') {
                textarea.value = '';
                loadComments(todoId, this.closest('.comments-section'));
            } else {
                alert('Failed to add comment');
            }
        });
    });
});

const deleteAccountBtn = document.getElementById('deleteAccountBtn');
if (deleteAccountBtn) {
    deleteAccountBtn.addEventListener('click', function() {
        if (confirm('Are you sure you want to delete your account? This cannot be undone!')) {
            fetch('/delete-account', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            })
            .then(res => res.json())
            .then(data => {
                if (data.status === 'success') {
                    alert('Account deleted. Goodbye!');
                    window.location.href = '/signup'; // or your homepage
                } else {
                    alert('Failed to delete account: ' + (data.message || 'Unknown error'));
                }
            });
        }
    });
};
