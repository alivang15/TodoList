const express = require('express');
const mysql = require('mysql2');
const path = require('path');
const session = require('express-session');
const app = express();
const bcrypt = require('bcrypt');

// Middleware setup
app.use(express.static(path.join(__dirname, 'static')));
app.use(express.urlencoded({ extended: true }))
app.use(express.json());

// Database connection
const connection = mysql.createConnection({
    host: 'cse-mysql-classes-01.cse.umn.edu',
    user: 'C4131S25S01U49',
    password: 'Jay@1220',
    database: 'C4131S25S01U49',
    port: '3306'
});

connection.connect(err => {
    if (err) {
        console.error('MySQL connection error: ', err);
        throw err;
    }
});

// Session setup
app.use(session({
    secret: 'something-change-later',
    saveUninitialized: false,
    resave: false}
));

// View engine setup
app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));

// Authentication middleware
const requireAuth = (req, res, next) => {
    if (!req.session.user) {
        return res.redirect('/login');
    }
    next();
};

// Routes
app.get('/', (req, res) => {
    res.render('index', { user: req.session.user || null });
});

// Login page
app.get('/login', (req, res) => {
    if (req.session.user) {
        return res.redirect('/todos');
    }
    res.render('login', { error: null });
});

// Login handler
app.post('/login', (req, res) => {
    const username = req.body.username;
    const password = req.body.password;

    if (!username || !password) {
        return res.status(400).json({ 
            status: 'fail', 
            message: 'Username and password are required' 
        });
    }

    connection.query(
        'SELECT * FROM users WHERE username = ?',
        [username],
        (err, results) => {
            if (err) {
                console.error('Login error:', err);
                return res.status(500).json({ 
                    status: 'fail', 
                    message: 'An error occurred during login' 
                });
            }

            if (results.length >= 1) {
                const user = results[0];

                if (bcrypt.compareSync(password, user.password)) {
                    req.session.user = {
                        id: user.id,
                        username: user.username,
                        firstName: user.first_name,
                        lastName: user.last_name
                    };
                    res.json({ status: 'success' });
                } else {
                    res.status(401).json({ 
                        status: 'fail', 
                        message: 'Wrong username or password' 
                    });
                }
            } else {
                res.status(401).json({ 
                    status: 'fail', 
                    message: 'Wrong username or password' 
                });
            }
        }
    );
});

// Logout handler
app.get('/logout', (req, res) => {
    // Destroy the session
    req.session.destroy((err) => {
        if (err) {
            console.error('Error destroying session:', err);
        }
        // Redirect to the login page
        res.redirect('/login');
    });
});

// Protected routes (require authentication)
app.get('/todos', requireAuth, (req, res) => {
    const userId = req.session.user.id;
    
    connection.query(
        'SELECT * FROM todos WHERE user_id = ? ORDER BY created_at DESC',
        [userId],
        (err, rows) => {
            if (err) {
                console.error('Error fetching todos: ', err);
                return res.status(500).json({ error: 'Database error' });
            }
            
            res.render('todos', { 
                todos: rows,
                user: req.session.user 
            });
        }
    );
});

// Signup page
app.get('/signup', (req, res) => {
    // If user is already logged in, redirect to todos
    if (req.session.user) {
        return res.redirect('/todos');
    }
    // Otherwise, render the signup page
    res.render('signup', { error: null });
});

// Singup handler
app.post('/signup', (req, res) => {
    console.log('Received signup request:', req.body); // test
    const firstName = req.body.firstName;
    const lastName = req.body.lastName;
    const username = req.body.username;
    const password = req.body.password;
    const confirmPassword = req.body.confirmPassword;

    // Input validation
    if (!firstName || !lastName || !username || !password) {
        return res.status(400).json({ 
            status: 'fail', 
            message: 'All fields are required' 
        });
    }

    if (password !== confirmPassword) {
        return res.status(400).json({ 
            status: 'fail', 
            message: 'Passwords do not match' 
        });
    }

    // Check if username exists
    connection.query(
        'SELECT * FROM users WHERE username = ?',
        [username],
        (err, selectResults) => {
            if (err) {
                console.error('Signup error:', err);
                return res.status(500).json({ 
                    status: 'fail', 
                    message: 'An error occurred during signup' 
                });
            }

            if (selectResults.length > 0) {
                return res.status(409).json({ 
                    status: 'fail', 
                    message: 'Username already exists' 
                });
            }

            // Hash the password
            const hashedPassword = bcrypt.hashSync(password, 10);

            // Insert new user
            connection.query(
                'INSERT INTO users (username, first_name, last_name, password) VALUES (?, ?, ?, ?)',
                [username, firstName, lastName, hashedPassword],
                (err, insertResults) => {
                    if (err) {
                        console.error('Error creating user:', err);
                        return res.status(500).json({ 
                            status: 'fail', 
                            message: 'An error occurred during signup' 
                        });
                    }

                    req.session.user = {
                        id: insertResults.insertId,
                        username: username,
                        firstName: firstName,
                        lastName: lastName
                    };
                    
                    res.status(201).json({ status: 'success' });
                }
            );
        }
    );
});

// Add new todo
app.post('/todos', requireAuth, (req, res) => {
    const title = req.body.title;
    const description = req.body.description;
    const dueDate = req.body.dueDate;
    const userId = req.session.user.id;

    if (!title || title.trim().length === 0) {
        return res.status(400).json({ 
            status: 'fail', 
            message: 'Title is required' 
        });
    }

    connection.query(
        'INSERT INTO todos (user_id, title, description, due_date, status) VALUES (?, ?, ?, ?, ?)',
        [userId, title.trim(), description?.trim() || '', dueDate || null, 'new'],
        (err, result) => {
            if (err) {
                console.error('Error adding todo:', err);
                return res.status(500).json({ 
                    status: 'fail', 
                    message: 'Database error' 
                });
            }

            connection.query(
                'SELECT * FROM todos WHERE id = ?',
                [result.insertId],
                (err, rows) => {
                    if (err) {
                        console.error('Error fetching new todo:', err);
                        return res.status(500).json({ 
                            status: 'fail', 
                            message: 'Error fetching new todo' 
                        });
                    }

                    res.status(201).json({ 
                        status: 'success', 
                        todo: rows[0]
                    });
                }
            );
        }
    );
});

// Get todo with comments
app.get('/todos/:id', requireAuth, (req, res) => {
    const todoId = req.params.id;

    connection.query(
        'SELECT * FROM todos WHERE id = ?',
        [todoId],
        (err, todoResults) => {
            if (err) {
                console.error('Error fetching todo:', err);
                return res.status(500).json({ error: 'Database error' });
            }

            if (todoResults.length === 0) {
                return res.status(404).json({ error: 'Todo not found' });
            }

            // Get comments for this todo
            connection.query(
                'SELECT * FROM comments WHERE todo_id = ? ORDER BY created_at ASC',
                [todoId],
                (err, commentResults) => {
                    if (err) {
                        console.error('Error fetching comments:', err);
                        return res.status(500).json({ error: 'Database error' });
                    }
                    res.render('todo-detail', {
                        todo: todoResults[0],
                        comments: commentResults
                    });
                }
            );
        }
    );
});

// Add comment to todo task
app.post('/todos/:id/comments', requireAuth, (req, res) => {
    const todoId = req.params.id;
    const userId = req.session.user.id;
    const content = req.body.content;

    if (!content) {
        return res.status(400).json({ status: 'fail', message: 'Comment is required' });
    }

    connection.query(
        'INSERT INTO comments (todo_id, user_id, content) VALUES (?, ?, ?)',
        [todoId, userId, content],
        (err) => {
            if (err) {
                console.error('Error adding comment:', err);
                return res.status(500).json({ status: 'fail', message: 'Database error' });
            }
            res.json({ status: 'success' });
        }
    );
});

// Delete todo task
app.delete('/todos/:id', requireAuth, (req, res) => {
    const todoId = req.params.id;
    const userId = req.session.user.id;

    connection.query(
        'DELETE FROM todos WHERE id = ? AND user_id = ?',
        [todoId, userId],
        (err, result) => {
            if (err) {
                console.error('Error deleting todo task:', err);
                return res.json({ 
                    status: 'fail', 
                    message: 'Database error' 
                });
            }

            if (result.affectedRows === 0) {
                return res.json({ 
                    status: 'fail', 
                    message: 'Todo not found or unauthorized' 
                });
            }

            res.json({ 
                status: 'success', 
                message: 'Todo deleted successfully' 
            });
        }
    );
});

// Update todo
app.put('/todos/:id', requireAuth, (req, res) => {
    const todoId = req.params.id;
    const { title, description, dueDate } = req.body;
    const userId = req.session.user.id;

    // Server-side validation
    if (!title) {
        return res.json({ status: 'fail', message: 'Title is required' });
    }

    // First, get the current todo to preserve existing due_date if none provided
    connection.query(
        'SELECT due_date FROM todos WHERE id = ? AND user_id = ?',
        [todoId, userId],
        (err, results) => {
            if (err) {
                console.error('Error fetching current todo:', err);
                return res.json({ status: 'fail', message: 'Database error' });
            }

            if (results.length === 0) {
                return res.json({ status: 'fail', message: 'Todo not found or unauthorized' });
            }

            // Use the provided dueDate if it exists, otherwise keep the existing one
            const finalDueDate = dueDate || results[0].due_date;

            // Now update the todo
            connection.query(
                'UPDATE todos SET title = ?, description = ?, due_date = ? WHERE id = ? AND user_id = ?',
                [title, description || '', finalDueDate, todoId, userId],
                (err, result) => {
                    if (err) {
                        console.error('Error updating todo:', err);
                        return res.json({ status: 'fail', message: 'Database error' });
                    }

                    if (result.affectedRows === 0) {
                        return res.json({ status: 'fail', message: 'Todo not found or unauthorized' });
                    }

                    res.json({ status: 'success', message: 'Todo updated successfully' });
                }
            );
        }
    );
});

// Update todo status
app.put('/todos/:id/status', requireAuth, (req, res) => {
    const todoId = req.params.id;
    const { status } = req.body;
    const userId = req.session.user.id;

    // Validate status
    if (!['new', 'in_progress', 'done'].includes(status)) {
        return res.json({ status: 'fail', message: 'Invalid status' });
    }

    connection.query(
        'UPDATE todos SET status = ? WHERE id = ? AND user_id = ?',
        [status, todoId, userId],
        (err, result) => {
            if (err) {
                console.error('Error updating todo status:', err);
                return res.json({ status: 'fail', message: 'Database error' });
            }

            if (result.affectedRows === 0) {
                return res.json({ status: 'fail', message: 'Todo not found or unauthorized' });
            }

            res.json({ status: 'success', message: 'Status updated successfully' });
        }
    );
});

// Get comments for a todo
app.get('/todos/:id/comments', requireAuth, (req, res) => {
    const todoId = req.params.id;
    connection.query(
        'SELECT c.*, u.first_name AS firstName, u.last_name AS lastName FROM comments c JOIN users u ON c.user_id = u.id WHERE c.todo_id = ? ORDER BY c.create_at ASC',
        [todoId],
        (err, results) => {
            if (err) {
                console.error('DB error:', err);
                return res.status(500).json({ status: 'fail', message: 'Database error' });
            }
            res.json({ status: 'success', comments: results });
        }
    );
});

// Delete a comment
app.delete('/comments/:id', requireAuth, (req, res) => {
    const commentId = req.params.id;
    const userId = req.session.user.id;

    if (!commentId) {
        return res.status(400).json({ 
            status: 'fail', 
            message: 'Comment ID is required' 
        });
    }

    connection.query(
        'DELETE FROM comments WHERE id = ? AND user_id = ?',
        [commentId, userId],
        (err, result) => {
            if (err) {
                console.error('Error deleting comment:', err);
                return res.status(500).json({ 
                    status: 'fail', 
                    message: 'Database error' 
                });
            }
            if (result.affectedRows === 0) {
                return res.status(403).json({ 
                    status: 'fail', 
                    message: 'Not authorized or comment not found' 
                });
            }
            res.json({ status: 'success' });
        }
    );
});

// Delete user account
app.post('/delete-account', requireAuth, (req, res) => {
    const userId = req.session.user.id;

    connection.query(
        'DELETE FROM users WHERE id = ?',
        [userId],
        (err, result) => {
            if (err) {
                console.error('Error deleting user:', err);
                return res.status(500).json({ 
                    status: 'fail', 
                    message: 'Database error' 
                });
            }
            req.session.destroy(() => {
                res.json({ status: 'success' });
            });
        }
    );
});

// Start server
const PORT = 4131;
app.listen(PORT, () => {
    console.log('Server is running on port ' + PORT);
});
