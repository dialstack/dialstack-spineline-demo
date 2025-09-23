# OpenTofu provider and backend configuration

terraform {
  required_version = ">= 1.6"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.1"
    }
    tls = {
      source  = "hashicorp/tls"
      version = "~> 4.0"
    }
  }

  # Backend configuration - will be filled in after bootstrap
  # Uncomment and update after running bootstrap
  # backend "s3" {
  #   bucket         = "spineline-tofu-state-xxxxxxxx"
  #   key            = "infrastructure/tofu.tfstate"
  #   region         = "us-east-1"
  #   dynamodb_table = "spineline-tofu-state-lock"
  #   encrypt        = true
  # }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = var.project_name
      Environment = var.environment
      ManagedBy   = "OpenTofu"
    }
  }
}