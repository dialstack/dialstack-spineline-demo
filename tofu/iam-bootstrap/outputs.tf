# Output the ARNs and names that the main infrastructure needs
output "app_role_arn" {
  description = "ARN of the application EC2 instance role"
  value       = aws_iam_role.app.arn
}

output "app_instance_profile_name" {
  description = "Name of the application instance profile"
  value       = aws_iam_instance_profile.app.name
}

output "rds_monitoring_role_arn" {
  description = "ARN of the RDS monitoring role"
  value       = aws_iam_role.rds_monitoring.arn
}

output "github_actions_access_key_id" {
  description = "Access key ID for GitHub Actions user"
  value       = aws_iam_access_key.github_actions.id
  sensitive   = true
}

output "github_actions_secret_access_key" {
  description = "Secret access key for GitHub Actions user"
  value       = aws_iam_access_key.github_actions.secret
  sensitive   = true
}