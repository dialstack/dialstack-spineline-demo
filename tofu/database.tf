# RDS PostgreSQL databases for blue/green deployment (independent instances)

# Local values to eliminate repetition
locals {
  environments = toset(var.deployed_environments)

  # Common SSM parameter configuration to avoid repetition
  common_ssm_config = {
    type      = "SecureString"              # Security: All parameters encrypted
    key_id    = aws_kms_key.ssm.key_id     # Security: Use CMK for encryption
    overwrite = true                        # Allow updates to existing parameters
  }

  # All SSM parameters defined in one place
  ssm_parameters = merge(
    # Database passwords
    {
      for env in var.deployed_environments : "${env}_db_password" => {
        name  = "/${var.project_name}/${env}/database_password"
        value = random_password.db_password[env].result
        tags = {
          Name        = "${var.project_name}-${env}-db-password"
          Environment = env
        }
      }
    },
    # Database connection URLs
    {
      for env in var.deployed_environments : "${env}_database_url" => {
        name  = "/${var.project_name}/${env}/database_url"
        value = "postgresql://${var.db_username}:${random_password.db_password[env].result}@${aws_db_instance.main[env].endpoint}/${var.db_name}"
        tags = {
          Name        = "${var.project_name}-${env}-database-url"
          Environment = env
        }
      }
    }
  )

  # PostgreSQL parameters to eliminate repeated parameter blocks
  postgres_parameters = [
    {
      name         = "shared_preload_libraries"
      value        = "pg_stat_statements"     # Performance: Enable query statistics
      apply_method = "pending-reboot"
    },
    {
      name         = "log_statement"
      value        = "all"                    # Monitoring: Log all SQL statements
      apply_method = null
    },
    {
      name         = "log_min_duration_statement"
      value        = "1000"                   # Monitoring: Log slow queries (>1s)
      apply_method = null
    }
  ]
}

# Generate random passwords for database instances
resource "random_password" "db_password" {
  for_each = local.environments

  length           = 32
  special          = true
  override_special = "!#$%&*()-_=+[]{}<>:?" # Exclude /, @, ", and space
}

# Unified SSM parameters (passwords + connection URLs)
resource "aws_ssm_parameter" "all" {
  for_each = local.ssm_parameters

  # Parameter-specific configuration from locals
  name  = each.value.name
  value = each.value.value
  tags  = each.value.tags

  # Common configuration applied to all SSM parameters
  type      = local.common_ssm_config.type
  key_id    = local.common_ssm_config.key_id
  overwrite = local.common_ssm_config.overwrite
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
  deletion_protection       = true  # Prevent accidental deletion
  skip_final_snapshot       = false # Always take final snapshot
  final_snapshot_identifier = "${var.project_name}-${each.key}-final-snapshot"

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

  # Dynamic PostgreSQL parameters from locals (eliminates repeated parameter blocks)
  dynamic "parameter" {
    for_each = local.postgres_parameters
    content {
      name         = parameter.value.name
      value        = parameter.value.value
      apply_method = parameter.value.apply_method
    }
  }

  tags = {
    Name = "${var.project_name}-postgres-params"
  }
}

