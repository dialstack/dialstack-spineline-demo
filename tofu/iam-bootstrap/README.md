# IAM Bootstrap Setup

This directory contains the IAM resources that require elevated permissions to create. These must be set up **before** running the main infrastructure deployment.

## Why Separate IAM Management?

This separation follows security best practices by:

- **Limiting GitHub Actions permissions** - No IAM access for CI/CD workflows
- **Reducing attack surface** - Compromised workflows cannot escalate privileges
- **Following least privilege** - Each component has only the permissions it needs
- **Separating concerns** - IAM management vs. application infrastructure

## Prerequisites

1. **AWS CLI configured** with administrator or IAM-capable credentials
2. **OpenTofu/Terraform installed** (v1.0+)
3. **Route53 hosted zone** already created and DNS delegated

## Setup Process

### 1. Configure Variables

Copy the example variables file and customize:

```bash
cd tofu/iam-bootstrap
cp terraform.tfvars.example terraform.tfvars
```

Edit `terraform.tfvars` with your values:

```hcl
project_name      = "spineline"
aws_region       = "us-east-1"
hosted_zone_id   = "Z05847379J3ZDOLDQIFD"  # Your actual hosted zone ID
```

### 2. Initialize and Apply

```bash
# Initialize the configuration
tofu init

# Review the plan
tofu plan

# Apply (requires admin/IAM permissions)
tofu apply
```

### 3. Secure the State

**Important**: The state file contains sensitive information (access keys). Store it securely:

```bash
# Option 1: Move to secure location
mv terraform.tfstate ~/secure-backup/iam-bootstrap-state.tfstate

# Option 2: Encrypt and store
gpg --encrypt --recipient your-email terraform.tfstate
rm terraform.tfstate
```

### 4. Configure GitHub Secrets

After applying, set up GitHub repository secrets with the access keys:

```bash
# Get the access key outputs (sensitive)
tofu output github_actions_access_key_id
tofu output github_actions_secret_access_key
```

Add these to your GitHub repository as secrets:

- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`

## Created Resources

This bootstrap creates:

### IAM Roles

- `spineline-app-role` - For EC2 instances (Route53, SSM, CloudWatch access)
- `spineline-rds-monitoring` - For RDS enhanced monitoring

### IAM Policies

- `spineline-route53-letsencrypt` - Route53 access for SSL certificates
- `spineline-ssm-access` - Systems Manager parameter access
- `spineline-cloudwatch-logs` - CloudWatch logging
- `spineline-github-actions` - **Limited** deployment permissions (no IAM access)

### IAM User

- `spineline-github-actions` - Service account for CI/CD workflows

### Other

- Instance profile for EC2 instances
- Access keys stored in Systems Manager

## Security Features

### GitHub Actions User Permissions

The GitHub Actions user has **deliberately limited** permissions:

✅ **Allowed:**

- EC2 describe operations (read-only)
- Route53 record changes (DNS updates)
- SSM parameter reading (secrets access)
- CloudWatch logs reading (monitoring)

❌ **Not Allowed:**

- IAM operations (no privilege escalation)
- Resource creation/deletion (except DNS records)
- Cross-account access

### Resource-Scoped Permissions

All permissions are scoped to specific resources using ARNs where possible:

- SSM parameters: `/spineline/*` only
- Route53: Specific hosted zone only
- CloudWatch: Project-specific log groups only

## Maintenance

### Updating IAM Resources

To modify IAM resources:

1. Update the configuration in this directory
2. Run `tofu plan` and `tofu apply` with admin credentials
3. Main infrastructure will automatically use updated resources

### Rotating Access Keys

To rotate GitHub Actions access keys:

```bash
# Apply to generate new keys
tofu apply -replace=aws_iam_access_key.github_actions

# Update GitHub secrets with new values
tofu output github_actions_access_key_id
tofu output github_actions_secret_access_key
```

### Cleanup

To remove all IAM resources:

```bash
tofu destroy
```

**Warning**: This will break the main infrastructure deployment until resources are recreated.

## Troubleshooting

### "Access Denied" Errors

If you get IAM access denied errors:

- Ensure you're using credentials with IAM permissions
- Check that your AWS CLI profile has the necessary privileges
- Verify the AWS region matches your configuration

### Main Infrastructure Fails

If main infrastructure cannot find IAM resources:

- Verify this bootstrap was applied successfully
- Check that resource names match between configurations
- Ensure you're deploying in the same AWS region

### GitHub Actions Still Failing

After setup, if GitHub Actions still fails:

- Verify GitHub secrets are set correctly
- Check that the IAM user has the expected permissions
- Review the GitHub Actions workflow for IAM-related calls
