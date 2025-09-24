variable "project_name" {
  description = "Name of the project (used for resource naming)"
  type        = string
  default     = "spineline"
}

variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "hosted_zone_id" {
  description = "Route53 hosted zone ID for DNS challenges"
  type        = string
}