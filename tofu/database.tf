# RDS PostgreSQL databases for blue/green deployment (independent instances)

# Generate random passwords for database instances
resource "random_password" "blue_db_password" {
  count = var.deploy_blue ? 1 : 0

  length  = 32
  special = true
}

resource "random_password" "green_db_password" {
  count = var.deploy_green ? 1 : 0

  length  = 32
  special = true
}

# Store database passwords in Systems Manager
resource "aws_ssm_parameter" "blue_db_password" {
  count = var.deploy_blue ? 1 : 0

  name  = "/${var.project_name}/blue/database_password"
  type  = "SecureString"
  value = random_password.blue_db_password[0].result

  tags = {
    Name        = "${var.project_name}-blue-db-password"
    Environment = "blue"
  }
}

resource "aws_ssm_parameter" "green_db_password" {
  count = var.deploy_green ? 1 : 0

  name  = "/${var.project_name}/green/database_password"
  type  = "SecureString"
  value = random_password.green_db_password[0].result

  tags = {
    Name        = "${var.project_name}-green-db-password"
    Environment = "green"
  }
}

# Blue Environment RDS Instance
resource "aws_db_instance" "blue" {
  count = var.deploy_blue ? 1 : 0

  identifier = "${var.project_name}-blue"

  # Engine configuration
  engine         = "postgres"
  engine_version = var.db_engine_version
  instance_class = var.db_instance_class

  # Database configuration
  db_name  = var.db_name
  username = var.db_username
  password = random_password.blue_db_password[0].result

  # Storage configuration
  allocated_storage     = var.db_allocated_storage
  max_allocated_storage = 100  # Auto-scaling limit
  storage_type         = "gp3"
  storage_encrypted    = true

  # Network configuration
  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.database.id]
  publicly_accessible    = false

  # Backup configuration
  backup_retention_period = 7
  backup_window          = "03:00-04:00"  # UTC
  maintenance_window     = "Sun:04:00-Sun:05:00"  # UTC

  # Performance and monitoring
  performance_insights_enabled = true
  monitoring_interval         = 60
  monitoring_role_arn        = local.rds_monitoring_role_arn

  # Production safety settings
  deletion_protection = true   # Prevent accidental deletion
  skip_final_snapshot = false  # Always take final snapshot

  # Parameter group for PostgreSQL optimization
  parameter_group_name = aws_db_parameter_group.postgres.name

  tags = {
    Name        = "${var.project_name}-blue-db"
    Environment = "blue"
  }

  lifecycle {
    # Prevent accidental destruction via Terraform
    prevent_destroy = true
  }
}

# Green Environment RDS Instance
resource "aws_db_instance" "green" {
  count = var.deploy_green ? 1 : 0

  identifier = "${var.project_name}-green"

  # Engine configuration
  engine         = "postgres"
  engine_version = var.db_engine_version
  instance_class = var.db_instance_class

  # Database configuration
  db_name  = var.db_name
  username = var.db_username
  password = random_password.green_db_password[0].result

  # Storage configuration
  allocated_storage     = var.db_allocated_storage
  max_allocated_storage = 100  # Auto-scaling limit
  storage_type         = "gp3"
  storage_encrypted    = true

  # Network configuration
  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.database.id]
  publicly_accessible    = false

  # Backup configuration
  backup_retention_period = 7
  backup_window          = "03:00-04:00"  # UTC
  maintenance_window     = "Sun:04:00-Sun:05:00"  # UTC

  # Performance and monitoring
  performance_insights_enabled = true
  monitoring_interval         = 60
  monitoring_role_arn        = local.rds_monitoring_role_arn

  # Production safety settings
  deletion_protection = true   # Prevent accidental deletion
  skip_final_snapshot = false  # Always take final snapshot

  # Parameter group for PostgreSQL optimization
  parameter_group_name = aws_db_parameter_group.postgres.name

  tags = {
    Name        = "${var.project_name}-green-db"
    Environment = "green"
  }

  lifecycle {
    # Prevent accidental destruction via Terraform
    prevent_destroy = true
  }
}

# PostgreSQL parameter group for performance optimization
resource "aws_db_parameter_group" "postgres" {
  family = "postgres17"
  name   = "${var.project_name}-postgres17"

  # Basic PostgreSQL optimizations for t3.micro
  parameter {
    name  = "shared_preload_libraries"
    value = "pg_stat_statements"
  }

  parameter {
    name  = "log_statement"
    value = "all"
  }

  parameter {
    name  = "log_min_duration_statement"
    value = "1000"  # Log queries taking longer than 1 second
  }

  tags = {
    Name = "${var.project_name}-postgres-params"
  }
}


# Store database connection strings in Systems Manager
resource "aws_ssm_parameter" "blue_database_url" {
  count = var.deploy_blue ? 1 : 0

  name = "/${var.project_name}/blue/database_url"
  type = "SecureString"
  value = "postgresql://${var.db_username}:${random_password.blue_db_password[0].result}@${aws_db_instance.blue[0].endpoint}/${var.db_name}"

  tags = {
    Name        = "${var.project_name}-blue-database-url"
    Environment = "blue"
  }
}

resource "aws_ssm_parameter" "green_database_url" {
  count = var.deploy_green ? 1 : 0

  name = "/${var.project_name}/green/database_url"
  type = "SecureString"
  value = "postgresql://${var.db_username}:${random_password.green_db_password[0].result}@${aws_db_instance.green[0].endpoint}/${var.db_name}"

  tags = {
    Name        = "${var.project_name}-green-database-url"
    Environment = "green"
  }
}