# Output values from the blue/green infrastructure

locals {
  # Create outputs for each deployed environment
  environment_outputs = {
    for env in local.environments : env => {
      instance_id       = aws_instance.main[env].id
      public_ip         = aws_eip.main[env].public_ip
      database_endpoint = can(aws_db_instance.main[env]) ? aws_db_instance.main[env].endpoint : null
      database_name     = can(aws_db_instance.main[env]) ? aws_db_instance.main[env].db_name : null
      database_password = can(random_password.db_password[env]) ? random_password.db_password[env].result : null
      database_username = can(aws_db_instance.main[env]) ? aws_db_instance.main[env].username : null
    }
  }

  # Calculate active/inactive environment information
  active_env_output    = local.environment_outputs[var.active_environment]
  inactive_environment = var.active_environment == "blue" ? "green" : "blue"
  inactive_env_output  = local.environment_outputs[local.inactive_environment]
}

# VPC Information
output "vpc_id" {
  description = "ID of the VPC"
  value       = aws_vpc.main.id
}

output "public_subnet_ids" {
  description = "IDs of the public subnets"
  value       = [aws_subnet.public_a.id, aws_subnet.public_b.id]
}

output "private_subnet_ids" {
  description = "IDs of the private subnets"
  value = [
    aws_subnet.private_app_a.id,
    aws_subnet.private_app_b.id,
    aws_subnet.private_db_a.id,
    aws_subnet.private_db_b.id,
  ]
}

output "environment_instance_ids" {
  description = "EC2 instance IDs for each deployed environment"
  value = {
    for env, config in local.environment_outputs : env => config != null ? config.instance_id : null
  }
}

output "environment_public_ips" {
  description = "Public IP addresses for each deployed environment"
  value = {
    for env, config in local.environment_outputs : env => config != null ? config.public_ip : null
  }
}

output "environment_database_endpoints" {
  description = "RDS instance endpoints for each deployed environment"
  value = {
    for env, config in local.environment_outputs : env => config != null ? config.database_endpoint : null
  }
  sensitive = true
}

output "environment_database_names" {
  description = "Database names for each deployed environment"
  value = {
    for env, config in local.environment_outputs : env => config != null ? config.database_name : null
  }
}


# Active Environment Information
output "active_environment" {
  description = "Currently active environment"
  value       = var.active_environment
}

output "active_public_ip" {
  description = "Public IP of the currently active environment"
  value       = local.active_env_output != null ? local.active_env_output.public_ip : null
}

output "inactive_environment" {
  description = "Currently inactive environment"
  value       = local.inactive_environment
}

output "inactive_public_ip" {
  description = "Public IP of the currently inactive environment"
  value       = local.inactive_env_output != null ? local.inactive_env_output.public_ip : null
}

# DNS Configuration
output "route53_zone_id" {
  description = "Route53 hosted zone ID"
  value       = aws_route53_zone.main.zone_id
}

output "route53_nameservers" {
  description = "Route53 nameservers to configure in GoDaddy"
  value       = aws_route53_zone.main.name_servers
}

output "domain_name" {
  description = "Domain name for the application"
  value       = var.domain_name
}

# SSH Access
output "ssh_key_name" {
  description = "Name of the SSH key pair"
  value       = aws_key_pair.deployer.key_name
}

# Dynamic Environment Database Passwords
output "environment_database_passwords" {
  description = "Database passwords for each deployed environment"
  value = {
    for env, config in local.environment_outputs : env => config != null ? config.database_password : null
  }
  sensitive = true
}


# Connection Information for Deployments
output "deployment_info" {
  description = "Information needed for deployments"
  value = merge(
    {
      for env, config in local.environment_outputs : env => config != null ? {
        instance_ip       = config.public_ip
        database_endpoint = config.database_endpoint
        database_name     = config.database_name
        database_username = config.database_username
      } : null
    },
    {
      active_environment = var.active_environment
      ssh_user           = "ec2-user"
      ssh_key_name       = aws_key_pair.deployer.key_name
      domain_name        = var.domain_name
    }
  )
  sensitive = true
}
