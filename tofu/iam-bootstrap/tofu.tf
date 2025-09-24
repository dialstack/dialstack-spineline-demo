terraform {
  required_version = ">= 1.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  # Use local state for IAM bootstrap - this should be run manually
  # Do not use remote state backends for this sensitive configuration
}

provider "aws" {
  region = var.aws_region
}