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

  validation {
    condition     = contains(var.deployed_environments, var.active_environment)
    error_message = "The active environment must be included in the deployed environments list."
  }
}

variable "deployed_environments" {
  description = "List of environments to deploy (blue, green, or both)"
  type        = list(string)
  default     = ["blue"]

  validation {
    condition     = length(var.deployed_environments) > 0 && length(var.deployed_environments) <= 2
    error_message = "Must deploy at least one environment and at most two environments."
  }

  validation {
    condition     = length(setintersection(var.deployed_environments, ["blue", "green"])) == length(var.deployed_environments)
    error_message = "All deployed environments must be either 'blue' or 'green'."
  }

}

# Instance Configuration
variable "instance_type" {
  description = "EC2 instance type"
  type        = string
  default     = "t3.micro" # Free tier eligible
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
  default     = "db.t3.micro" # Free tier eligible
}

variable "db_engine_version" {
  description = "PostgreSQL engine version"
  type        = string
  default     = "17.6"
}

variable "db_allocated_storage" {
  description = "RDS allocated storage in GB"
  type        = number
  default     = 20 # Free tier eligible
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
  default     = ["0.0.0.0/0"] # Allow from anywhere - restrict in production as needed
}

variable "ssh_allowed_cidr_blocks" {
  description = "CIDR blocks allowed SSH access"
  type        = list(string)
  default     = ["0.0.0.0/0"] # Restrict this to your IP in production
}

# Availability Zones
variable "availability_zones" {
  description = "Availability zones to use"
  type        = list(string)
  default     = ["us-east-1a", "us-east-1b"]
}