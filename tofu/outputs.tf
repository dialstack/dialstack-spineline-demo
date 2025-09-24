# Output values from the blue/green infrastructure

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
  value       = [
    aws_subnet.private_app_a.id,
    aws_subnet.private_app_b.id,
    aws_subnet.private_db_a.id,
    aws_subnet.private_db_b.id,
  ]
}

# Blue Environment Outputs
output "blue_instance_id" {
  description = "ID of the blue EC2 instance"
  value       = var.deploy_blue ? aws_instance.blue[0].id : null
}

output "blue_public_ip" {
  description = "Public IP address of the blue environment"
  value       = var.deploy_blue ? aws_eip.blue[0].public_ip : null
}

output "blue_database_endpoint" {
  description = "Blue RDS instance endpoint"
  value       = var.deploy_blue ? aws_db_instance.blue[0].endpoint : null
  sensitive   = true
}

output "blue_database_name" {
  description = "Blue database name"
  value       = var.deploy_blue ? aws_db_instance.blue[0].db_name : null
}

# Green Environment Outputs
output "green_instance_id" {
  description = "ID of the green EC2 instance"
  value       = var.deploy_green ? aws_instance.green[0].id : null
}

output "green_public_ip" {
  description = "Public IP address of the green environment"
  value       = var.deploy_green ? aws_eip.green[0].public_ip : null
}

output "green_database_endpoint" {
  description = "Green RDS instance endpoint"
  value       = var.deploy_green ? aws_db_instance.green[0].endpoint : null
  sensitive   = true
}

output "green_database_name" {
  description = "Green database name"
  value       = var.deploy_green ? aws_db_instance.green[0].db_name : null
}

# Active Environment Information
output "active_environment" {
  description = "Currently active environment"
  value       = var.active_environment
}

output "active_public_ip" {
  description = "Public IP of the currently active environment"
  value       = var.active_environment == "blue" ? (var.deploy_blue ? aws_eip.blue[0].public_ip : null) : (var.deploy_green ? aws_eip.green[0].public_ip : null)
}

output "inactive_environment" {
  description = "Currently inactive environment"
  value       = var.active_environment == "blue" ? "green" : "blue"
}

output "inactive_public_ip" {
  description = "Public IP of the currently inactive environment"
  value       = var.active_environment == "blue" ? (var.deploy_green ? aws_eip.green[0].public_ip : null) : (var.deploy_blue ? aws_eip.blue[0].public_ip : null)
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

# Database Passwords (sensitive)
output "blue_database_password" {
  description = "Blue database password"
  value       = var.deploy_blue ? random_password.blue_db_password[0].result : null
  sensitive   = true
}

output "green_database_password" {
  description = "Green database password"
  value       = var.deploy_green ? random_password.green_db_password[0].result : null
  sensitive   = true
}

# Connection Information for Deployments
output "deployment_info" {
  description = "Information needed for deployments"
  value = {
    blue = var.deploy_blue ? {
      instance_ip       = aws_eip.blue[0].public_ip
      database_endpoint = aws_db_instance.blue[0].endpoint
      database_name     = aws_db_instance.blue[0].db_name
      database_username = aws_db_instance.blue[0].username
    } : null

    green = var.deploy_green ? {
      instance_ip       = aws_eip.green[0].public_ip
      database_endpoint = aws_db_instance.green[0].endpoint
      database_name     = aws_db_instance.green[0].db_name
      database_username = aws_db_instance.green[0].username
    } : null

    active_environment   = var.active_environment
    ssh_user            = "ec2-user"
    ssh_key_name        = aws_key_pair.deployer.key_name
    domain_name         = var.domain_name
  }
  sensitive = true
}