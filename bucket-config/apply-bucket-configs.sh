#!/bin/bash

# Requires aws cli
# https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html

# run this script from project root
# ./bucket-config/apply-bucket-configs.sh

# Load variables from .env file
export $(grep -v '^#' .env | xargs)

# Apply bucket policy
aws s3api put-bucket-policy --endpoint-url $BUCKET_HOST --bucket $BUCKET_NAME --policy file://bucket-config/bucket-policy.json

# Apply CORS configuration
aws s3api put-bucket-cors --endpoint-url $BUCKET_HOST --bucket $BUCKET_NAME --cors-configuration file://bucket-config/cors-config.xml
