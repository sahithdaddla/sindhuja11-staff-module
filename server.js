const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// PostgreSQL connection configuration
const pool = new Pool({
    user: 'postgres', // Replace with your PostgreSQL username
    host: 'localhost',
    database: 'staff_management',
    password: 'root', // Replace with your PostgreSQL password
    port: 5432,
});

// Helper function to validate inputs
function validateEmployeeData(data) {
    const errors = [];
    
    // Validate name
    if (!/^[A-Za-z\s]+$/.test(data.name) || data.name.replace(/\s/g, '').length < 3 || data.name.replace(/\s/g, '').length > 50) {
        errors.push('Name must contain only alphabetical characters, 3-50 characters (excluding spaces).');
    }
    
    // Validate employeeId
    if (!/^ATS0(?!000)\d{3}$/.test(data.empId)) {
        errors.push('Employee ID must follow the format ATS0 followed by exactly 3 digits.');
    }
    
    // Validate email
    const emailRegex = /^[a-zA-Z0-9]+(\.[a-zA-Z0-9]+)?@astrolitetech\.com$/;
    const emailPrefix = data.email.split('@')[0];
    const emailLength = emailPrefix ? emailPrefix.replace(/\s/g, '').length : 0;
    if (!emailRegex.test(data.email) || emailLength < 3 || emailLength > 40) {
        errors.push('Email must have 3-40 alphanumeric characters with at most one dot before @astrolitetech.com.');
    }
    
    // Validate role
    if (!/^[A-Za-z\s]+$/.test(data.role) || data.role.replace(/\s/g, '').length < 5 || data.role.replace(/\s/g, '').length > 30) {
        errors.push('Role must contain only alphabetical characters, 5-30 characters (excluding spaces).');
    }
    
    // Validate joining date
    const minDate = new Date('1980-01-01');
    const currentDate = new Date();
    const joiningDate = new Date(data.joiningDate);
    if (isNaN(joiningDate) || joiningDate < minDate || joiningDate > currentDate) {
        errors.push('Joining date must be between January 1, 1980, and today.');
    }
    
    // Validate training status
    if (!['ongoing', 'done'].includes(data.training)) {
        errors.push('Training status must be either "ongoing" or "done".');
    }
    
    // Validate project status and name
    if (data.training === 'done') {
        if (!['on-bench', 'in-project'].includes(data.projectStatus)) {
            errors.push('Project status must be either "on-bench" or "in-project".');
        }
        if (data.projectStatus === 'in-project') {
            if (!/^[A-Za-z\s]+$/.test(data.projectName) || data.projectName.replace(/\s/g, '').length < 5 || data.projectName.replace(/\s/g, '').length > 70) {
                errors.push('Project name must contain only alphabetical characters, 5-70 characters (excluding spaces).');
            }
        }
    }
    
    return errors;
}

// Get all employees
app.get('/api/employees', async (req, res) => {
    try {
        const searchTerm = req.query.search ? req.query.search.toLowerCase() : '';
        let query = 'SELECT * FROM employees ORDER BY date_added DESC';
        let values = [];
        
        if (searchTerm) {
            query = `
                SELECT * FROM employees 
                WHERE LOWER(name) LIKE $1 
                OR LOWER(emp_id) LIKE $1 
                OR LOWER(email) LIKE $1 
                OR LOWER(role) LIKE $1 
                OR LOWER(joining_date::text) LIKE $1 
                OR LOWER(training) LIKE $1 
                OR LOWER(project_status) LIKE $1 
                OR LOWER(project_name) LIKE $1
                ORDER BY date_added DESC
            `;
            values = [`%${searchTerm}%`];
        }
        
        const result = await pool.query(query, values);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching employees:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get single employee by ID
app.get('/api/employees/:empId', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM employees WHERE emp_id = $1', [req.params.empId]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Employee not found' });
        }
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error fetching employee:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Add new employee
app.post('/api/employees', async (req, res) => {
    const employeeData = req.body;
    
    // Validate input data
    const validationErrors = validateEmployeeData(employeeData);
    if (validationErrors.length > 0) {
        return res.status(400).json({ errors: validationErrors });
    }
    
    try {
        // Check for duplicates
        const duplicateCheck = await pool.query(
            'SELECT * FROM employees WHERE emp_id = $1 OR email = $2',
            [employeeData.empId, employeeData.email]
        );
        
        if (duplicateCheck.rows.length > 0) {
            const errors = [];
            if (duplicateCheck.rows.some(row => row.emp_id === employeeData.empId)) {
                errors.push('Employee ID already exists.');
            }
            if (duplicateCheck.rows.some(row => row.email === employeeData.email)) {
                errors.push('Email already exists.');
            }
            return res.status(400).json({ errors });
        }
        
        const query = `
            INSERT INTO employees (name, emp_id, email, role, joining_date, training, project_status, project_name, date_added)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
            RETURNING *
        `;
        const values = [
            employeeData.name,
            employeeData.empId,
            employeeData.email,
            employeeData.role,
            employeeData.joiningDate,
            employeeData.training,
            employeeData.projectStatus,
            employeeData.projectStatus === 'in-project' ? employeeData.projectName : null
        ];
        
        const result = await pool.query(query, values);
        res.status(201).json({ message: 'Employee added successfully', employee: result.rows[0] });
    } catch (error) {
        console.error('Error adding employee:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Update employee
app.put('/api/employees/:empId', async (req, res) => {
    const employeeData = req.body;
    const empId = req.params.empId;
    
    // Validate input data
    const validationErrors = validateEmployeeData(employeeData);
    if (validationErrors.length > 0) {
        return res.status(400).json({ errors: validationErrors });
    }
    
    try {
        // Check for duplicates (excluding current employee)
        const duplicateCheck = await pool.query(
            'SELECT * FROM employees WHERE (emp_id = $1 OR email = $2) AND emp_id != $3',
            [employeeData.empId, employeeData.email, empId]
        );
        
        if (duplicateCheck.rows.length > 0) {
            const errors = [];
            if (duplicateCheck.rows.some(row => row.emp_id === employeeData.empId)) {
                errors.push('Employee ID already exists.');
            }
            if (duplicateCheck.rows.some(row => row.email === employeeData.email)) {
                errors.push('Email already exists.');
            }
            return res.status(400).json({ errors });
        }
        
        const query = `
            UPDATE employees 
            SET name = $1, emp_id = $2, email = $3, role = $4, joining_date = $5, 
                training = $6, project_status = $7, project_name = $8
            WHERE emp_id = $9
            RETURNING *
        `;
        const values = [
            employeeData.name,
            employeeData.empId,
            employeeData.email,
            employeeData.role,
            employeeData.joiningDate,
            employeeData.training,
            employeeData.projectStatus,
            employeeData.projectStatus === 'in-project' ? employeeData.projectName : null,
            empId
        ];
        
        const result = await pool.query(query, values);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Employee not found' });
        }
        res.json({ message: 'Employee updated successfully', employee: result.rows[0] });
    } catch (error) {
        console.error('Error updating employee:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Delete employee
app.delete('/api/employees/:empId', async (req, res) => {
    try {
        const result = await pool.query('DELETE FROM employees WHERE emp_id = $1 RETURNING *', [req.params.empId]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Employee not found' });
        }
        res.json({ message: 'Employee deleted successfully' });
    } catch (error) {
        console.error('Error deleting employee:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Start server
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});