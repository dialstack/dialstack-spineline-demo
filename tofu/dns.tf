# DNS configuration for blue/green deployment with Route53

# Route53 hosted zone for the domain
resource "aws_route53_zone" "main" {
  name = var.domain_name

  tags = {
    Name = "${var.project_name}-zone"
  }
}

# Main A record that switches between blue and green environments
# Uses 60-second TTL for faster rollback capability
resource "aws_route53_record" "main" {
  zone_id = aws_route53_zone.main.zone_id
  name    = var.domain_name
  type    = "A"
  ttl     = 60  # Fast rollback capability

  # Point to the active environment's public IP
  records = [
    var.active_environment == "blue" ?
      (var.deploy_blue ? aws_eip.blue[0].public_ip : "") :
      (var.deploy_green ? aws_eip.green[0].public_ip : "")
  ]
}

# WWW redirect to main domain
resource "aws_route53_record" "www" {
  zone_id = aws_route53_zone.main.zone_id
  name    = "www.${var.domain_name}"
  type    = "A"
  ttl     = 300  # Standard TTL for www redirect

  # Point to the same active environment
  records = [
    var.active_environment == "blue" ?
      (var.deploy_blue ? aws_eip.blue[0].public_ip : "") :
      (var.deploy_green ? aws_eip.green[0].public_ip : "")
  ]
}

# Blue environment specific record (for testing/staging)
resource "aws_route53_record" "blue" {
  count = var.deploy_blue ? 1 : 0

  zone_id = aws_route53_zone.main.zone_id
  name    = "blue.${var.domain_name}"
  type    = "A"
  ttl     = 300

  records = [aws_eip.blue[0].public_ip]
}

# Green environment specific record (for testing/staging)
resource "aws_route53_record" "green" {
  count = var.deploy_green ? 1 : 0

  zone_id = aws_route53_zone.main.zone_id
  name    = "green.${var.domain_name}"
  type    = "A"
  ttl     = 300

  records = [aws_eip.green[0].public_ip]
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