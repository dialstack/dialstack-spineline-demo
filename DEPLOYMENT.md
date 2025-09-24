# Deployment Guide

This document outlines the deployment process for the Spineline application infrastructure.

## Architecture Overview

The deployment uses a **two-stage approach** for enhanced security:

1. **IAM Bootstrap** - One-time setup of IAM resources (requires admin credentials)
2. **Infrastructure Deployment** - Application resources (uses limited GitHub Actions credentials)

## Prerequisites

- AWS account with appropriate permissions
- Route53 hosted zone configured and DNS delegated
- GitHub repository with Actions enabled
- OpenTofu/Terraform installed locally

## Initial Setup (One-Time)

### 1. IAM Bootstrap Setup

⚠️ **This step requires AWS administrator or IAM-capable credentials**

```bash
# Navigate to the IAM bootstrap directory
cd tofu/iam-bootstrap

# Configure your settings
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars with your actual values

# Initialize and apply
tofu init
tofu plan
tofu apply
```

### 2. Configure GitHub Secrets

After the bootstrap completes, configure GitHub repository secrets:

```bash
# Get the access key outputs
tofu output github_actions_access_key_id
tofu output github_actions_secret_access_key
```

Add these to your GitHub repository secrets:

- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`

### 3. Secure the IAM State

The IAM bootstrap state contains sensitive data. Store it securely:

```bash
# Encrypt and move the state file
gpg --encrypt --recipient your-email terraform.tfstate
mv terraform.tfstate.gpg ~/secure-backup/
rm terraform.tfstate
```

## Regular Deployment (GitHub Actions)

Once the IAM bootstrap is complete, all regular deployments use GitHub Actions with limited permissions.

### Workflow Trigger

The infrastructure deployment can be triggered:

- **Manual dispatch** - From the GitHub Actions tab
- **On push** - To main branch (if configured)
- **Pull request** - For testing (if configured)

### Security Features

The GitHub Actions user has **intentionally limited** permissions:

✅ **Can do:**

- Read EC2, VPC, and networking resources
- Update Route53 DNS records
- Read Systems Manager parameters
- Read CloudWatch logs

❌ **Cannot do:**

- Create/modify/delete IAM resources
- Access other AWS accounts
- Escalate privileges

## Infrastructure Components

### Blue/Green Deployment

The infrastructure supports blue/green deployment patterns:

- **Blue Environment** - Production environment
- **Green Environment** - Staging/testing environment
- **Route53** - DNS switching between environments

### Security

- **VPC with private subnets** - Application servers not directly accessible
- **Bastion host** - Secure SSH access to private resources
- **Security groups** - Network-level access controls
- **Encrypted storage** - EBS volumes and RDS encrypted at rest
- **IAM instance profiles** - Service-specific permissions

### Monitoring

- **CloudWatch** - Centralized logging and metrics
- **RDS Enhanced Monitoring** - Database performance insights
- **ELB health checks** - Application availability monitoring

## Troubleshooting

### GitHub Actions Failures

If GitHub Actions fails with IAM permissions errors:

1. **Verify bootstrap completion** - Check that IAM resources exist
2. **Check GitHub secrets** - Ensure access keys are set correctly
3. **Review permissions** - GitHub Actions user should NOT have IAM access

### Infrastructure Issues

For infrastructure-related problems:

1. **Check AWS console** - Review resources in the AWS console
2. **Review state** - Check Terraform/OpenTofu state for inconsistencies
3. **Validate configuration** - Run `tofu validate` to check syntax

### DNS Problems

For Route53/DNS issues:

1. **Verify hosted zone** - Ensure the hosted zone exists and is properly delegated
2. **Check record propagation** - DNS changes can take time to propagate
3. **Validate certificates** - Let's Encrypt certificates require proper DNS resolution

## Best Practices

### Security

- **Rotate access keys regularly** - Use IAM bootstrap to generate new keys
- **Monitor access logs** - Review CloudTrail for unusual activity
- **Principle of least privilege** - Only grant necessary permissions

### Operations

- **Test changes in staging** - Use green environment for testing
- **Monitor deployments** - Check CloudWatch logs during deployments
- **Backup critical data** - Ensure database backups are configured

### Maintenance

- **Keep dependencies updated** - Update AMIs, packages, and tools regularly
- **Review security groups** - Audit network access rules periodically
- **Monitor costs** - Use AWS Cost Explorer to track infrastructure costs

## Emergency Procedures

### Rollback Deployment

To rollback to a previous version:

1. Switch Route53 records to the stable environment
2. Investigate issues in the problematic environment
3. Fix and redeploy when ready

### Access to Private Resources

To access private application servers:

1. SSH to the bastion host using the stored private key
2. From bastion, SSH to application servers
3. Use PostgreSQL client on bastion to access databases

### Recovery from State Loss

If Terraform state is lost or corrupted:

1. **For IAM resources** - Restore from secure backup or recreate
2. **For infrastructure** - Use `tofu import` to recover existing resources
3. **Last resort** - Rebuild entire infrastructure (data loss risk)
