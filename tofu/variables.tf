# Input variables for blue/green infrastructure

variable "aws_region" {
  description = "AWS region for resources"
  type        = string
  default     = "us-east-1"
}

variable "project_name" {
  description = "Name of the project"
  type        = string
  default     = "spineline"
}

variable "environment" {
  description = "Environment name (production, staging, etc.)"
  type        = string
  default     = "production"
}

variable "domain_name" {
  description = "Domain name for the application"
  type        = string
  default     = "spineline.dev"
}

# Blue/Green Configuration
variable "active_environment" {
  description = "Currently active environment (blue or green)"
  type        = string
  default     = "blue"

  validation {
    condition     = contains(["blue", "green"], var.active_environment)
    error_message = "Active environment must be either 'blue' or 'green'."
  }
}

variable "deploy_blue" {
  description = "Whether to deploy blue environment"
  type        = bool
  default     = true
}

variable "deploy_green" {
  description = "Whether to deploy green environment"
  type        = bool
  default     = false
}

# Instance Configuration
variable "instance_type" {
  description = "EC2 instance type"
  type        = string
  default     = "t3.micro"  # Free tier eligible
}

variable "key_pair_name" {
  description = "Name for the SSH key pair"
  type        = string
  default     = "spineline-deployer"
}

# Database Configuration
variable "db_instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.t3.micro"  # Free tier eligible
}

variable "db_engine_version" {
  description = "PostgreSQL engine version"
  type        = string
  default     = "14.10"
}

variable "db_allocated_storage" {
  description = "RDS allocated storage in GB"
  type        = number
  default     = 20  # Free tier eligible
}

variable "db_name" {
  description = "Name of the database"
  type        = string
  default     = "spineline"
}

variable "db_username" {
  description = "Database username"
  type        = string
  default     = "spineline_user"
}

# Security Configuration
variable "allowed_cidr_blocks" {
  description = "CIDR blocks allowed to access the application via HTTPS"
  type        = list(string)
  default     = ["0.0.0.0/0"]  # Allow from anywhere - restrict in production as needed
}

variable "ssh_allowed_cidr_blocks" {
  description = "CIDR blocks allowed SSH access"
  type        = list(string)
  default     = ["0.0.0.0/0"]  # Restrict this to your IP in production
}

# Availability Zones
variable "availability_zones" {
  description = "Availability zones to use"
  type        = list(string)
  default     = ["us-east-1a", "us-east-1b"]
}