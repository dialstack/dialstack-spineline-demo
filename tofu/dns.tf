# DNS configuration for blue/green deployment with Route53

# CloudWatch log group for DNS query logging
resource "aws_cloudwatch_log_group" "dns_query_log" {
  name              = "/aws/route53/${var.domain_name}"
  retention_in_days = 14 # Security: Retain DNS query logs for 2 weeks

  tags = {
    Name = "${var.project_name}-dns-query-log"
  }
}

# Route53 hosted zone for the domain
resource "aws_route53_zone" "main" {
  name = var.domain_name

  tags = {
    Name = "${var.project_name}-zone"
  }
}

# Security: Enable DNS query logging
resource "aws_route53_query_log" "main" {
  depends_on = [aws_cloudwatch_log_group.dns_query_log]

  cloudwatch_log_group_arn = aws_cloudwatch_log_group.dns_query_log.arn
  zone_id                  = aws_route53_zone.main.zone_id
}

# Main A record that switches between blue and green environments
# Uses 60-second TTL for faster rollback capability
resource "aws_route53_record" "main" {
  zone_id = aws_route53_zone.main.zone_id
  name    = var.domain_name
  type    = "A"
  ttl     = 60 # Fast rollback capability

  # Point to the active environment's public IP
  records = [
    contains(var.deployed_environments, var.active_environment) ?
    aws_eip.main[var.active_environment].public_ip : ""
  ]
}

# WWW redirect to main domain
resource "aws_route53_record" "www" {
  zone_id = aws_route53_zone.main.zone_id
  name    = "www.${var.domain_name}"
  type    = "A"
  ttl     = 300 # Standard TTL for www redirect

  # Point to the same active environment
  records = [
    contains(var.deployed_environments, var.active_environment) ?
    aws_eip.main[var.active_environment].public_ip : ""
  ]
}

# Dynamic environment-specific records (for testing/staging)
resource "aws_route53_record" "environments" {
  for_each = local.environments

  zone_id = aws_route53_zone.main.zone_id
  name    = "${each.key}.${var.domain_name}"
  type    = "A"
  ttl     = 300

  records = [aws_eip.main[each.key].public_ip]
}

# Bastion host record for SSH access
resource "aws_route53_record" "bastion" {
  zone_id = aws_route53_zone.main.zone_id
  name    = "bastion.${var.domain_name}"
  type    = "A"
  ttl     = 300

  records = [aws_eip.bastion.public_ip]
}

# CAA record for Let's Encrypt certificate authority authorization
resource "aws_route53_record" "caa" {
  zone_id = aws_route53_zone.main.zone_id
  name    = var.domain_name
  type    = "CAA"
  ttl     = 3600

  records = [
    "0 issue \"letsencrypt.org\"",
    "0 issuewild \"letsencrypt.org\"",
    "0 iodef \"mailto:admin@${var.domain_name}\""
  ]
}