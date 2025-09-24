# RDS PostgreSQL databases for blue/green deployment (independent instances)

# Local value to determine which environments to deploy
locals {
  environments = toset(var.deployed_environments)
}

# Generate random passwords for database instances
resource "random_password" "db_password" {
  for_each = local.environments

  length           = 32
  special          = true
  override_special = "!#$%&*()-_=+[]{}<>:?" # Exclude /, @, ", and space
}

# Store database passwords in Systems Manager
resource "aws_ssm_parameter" "db_password" {
  for_each = local.environments

  name  = "/${var.project_name}/${each.key}/database_password"
  type  = "SecureString"
  value = random_password.db_password[each.key].result

  tags = {
    Name        = "${var.project_name}-${each.key}-db-password"
    Environment = each.key
  }
}

# RDS Database Instances (Blue/Green)
resource "aws_db_instance" "main" {
  for_each = local.environments

  identifier = "${var.project_name}-${each.key}"

  # Engine configuration
  engine         = "postgres"
  engine_version = var.db_engine_version
  instance_class = var.db_instance_class

  # Database configuration
  db_name  = var.db_name
  username = var.db_username
  password = random_password.db_password[each.key].result

  # Storage configuration
  allocated_storage     = var.db_allocated_storage
  max_allocated_storage = 100 # Auto-scaling limit
  storage_type          = "gp3"
  storage_encrypted     = true

  # Network configuration
  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.database.id]
  publicly_accessible    = false

  # Backup configuration
  backup_retention_period = 7
  backup_window           = "03:00-04:00"         # UTC
  maintenance_window      = "Sun:04:00-Sun:05:00" # UTC

  # Performance and monitoring
  performance_insights_enabled = true
  monitoring_interval          = 60
  monitoring_role_arn          = local.rds_monitoring_role_arn

  # Production safety settings
  deletion_protection = true  # Prevent accidental deletion
  skip_final_snapshot = false # Always take final snapshot

  # Parameter group for PostgreSQL optimization
  parameter_group_name = aws_db_parameter_group.postgres.name

  tags = {
    Name        = "${var.project_name}-${each.key}-db"
    Environment = each.key
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
    name         = "shared_preload_libraries"
    value        = "pg_stat_statements"
    apply_method = "pending-reboot"
  }

  parameter {
    name  = "log_statement"
    value = "all"
  }

  parameter {
    name  = "log_min_duration_statement"
    value = "1000" # Log queries taking longer than 1 second
  }

  tags = {
    Name = "${var.project_name}-postgres-params"
  }
}


# Store database connection strings in Systems Manager
resource "aws_ssm_parameter" "database_url" {
  for_each = local.environments

  name  = "/${var.project_name}/${each.key}/database_url"
  type  = "SecureString"
  value = "postgresql://${var.db_username}:${random_password.db_password[each.key].result}@${aws_db_instance.main[each.key].endpoint}/${var.db_name}"

  tags = {
    Name        = "${var.project_name}-${each.key}-database-url"
    Environment = each.key
  }
}