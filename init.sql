

CREATE TABLE employees (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL CHECK (name ~ '^[A-Za-z\s]+$'),
    emp_id VARCHAR(7) NOT NULL UNIQUE CHECK (emp_id ~ '^ATS0(?!000)\d{3}$'),
    email VARCHAR(60) NOT NULL UNIQUE CHECK (email ~ '^[a-zA-Z0-9]+(\.[a-zA-Z0-9]+)?@astrolitetech\.com$'),
    role VARCHAR(30) NOT NULL CHECK (role ~ '^[A-Za-z\s]+$'),
    joining_date DATE NOT NULL CHECK (joining_date >= '1980-01-01' AND joining_date <= CURRENT_DATE),
    training VARCHAR(10) NOT NULL CHECK (training IN ('ongoing', 'done')),
    project_status VARCHAR(20) CHECK (project_status IN ('on-bench', 'in-project')),
    project_name VARCHAR(70) CHECK (project_name ~ '^[A-Za-z\s]+$'),
    date_added TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


CREATE INDEX idx_emp_id ON employees(emp_id);
CREATE INDEX idx_email ON employees(email);
CREATE INDEX idx_name ON employees(name);


COMMENT ON TABLE employees IS 'Stores employee information for the staff management portal';
COMMENT ON COLUMN employees.name IS 'Employee full name (alphabetical characters only, 3-50 chars excluding spaces)';
COMMENT ON COLUMN employees.emp_id IS 'Unique employee ID (format: ATS0 followed by 3 digits)';
COMMENT ON COLUMN employees.email IS 'Employee email (3-40 chars before @astrolitetech.com)';
COMMENT ON COLUMN employees.role IS 'Employee role (alphabetical characters only, 5-30 chars excluding spaces)';
COMMENT ON COLUMN employees.joining_date IS 'Employee joining date (between 1980-01-01 and current date)';
COMMENT ON COLUMN employees.training IS 'Training status (ongoing or done)';
COMMENT ON COLUMN employees.project_status IS 'Project status (on-bench or in-project)';
COMMENT ON COLUMN employees.project_name IS 'Project name (alphabetical characters only, 5-70 chars excluding spaces, required if project_status is in-project)';
COMMENT ON COLUMN employees.date_added IS 'Timestamp when employee record was created';
