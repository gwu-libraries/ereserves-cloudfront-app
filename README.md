## Hosting files using AWS S3, CloudFront, and Cognito for authentication

This repository is a fork of the AWS sample [cloudfront-authorization-at-edge](https://github.com/aws-samples/cloudfront-authorization-at-edge/tree/master?tab=readme-ov-file#deploying-the-solution) repo. The `template.yml` file contains the code necessary to deploy this solution in AWS -- see the README in the original repo for deployment instructions.

### Architecture

- Uses an S3 bucket for file storage, including any web assets to be served.
- Uses Lambda@Edge functions to link a CloudFront app to Amazon Cognito for authentication.
- Cognito can be configured for SSO using OpenAthens or Microsoft Azure as the IdP. 
- The Lambda@Edge functions dispatch authentication to the Cognito User Pool defined as part of this template. 
- Content from the S3 bucket is served to authenticated users via CloudFront's distributed caches. 
- Optionally, a separate lambda function generates an inventory list (in JSON) and can be invoked on a trigger whenever files are added or removed from the bucket, in order to provide a browsable file interface.

For architecture details, see the [source repository](https://github.com/aws-samples/cloudfront-authorization-at-edge/tree/master?tab=readme-ov-file#deploying-the-solution).

### Deployment Details

- When deploying for use with existing resources (an S3 bucket and/or a Cognito user pool), the following parameters are required in the CloudFormation console:
  - `OriginAccessIdentity`: this ID will be referenced in the S3 policy granting access to the bucket from the CountFront app.
  - `S3OriginDomainName`: the URI of the s3 bucket, in the form `<bucket-name>.s3.<region-name>.amazonaws.com`
  - `UserPoolArn`: ARN of an existing Cognito pool
  - `UserPoolClientId` and `UserPoolClientSecret`: when using an existing pool, it's necessary to provide these values, too, which should refer to pre-existing user pool client (see `App Integrations` under the user pool settings in the AWS web console) or one created for this deployment.

- The following settings should be set regardless of whether the deployment uses existing resources or creates new ones:
  - `CreateCloudFrontDistribution`: `true`
  - `EnableSPAMode`: `false`

- The S3 bucket needs a policy following this template:
  ```
  "Statement": [
        {
            "Effect": "Allow",
            "Principal": {
                "AWS": "arn:aws:iam::cloudfront:user/CloudFront Origin Access Identity {Your Origin Access Identity}"
            },
            "Action": "s3:GetObject",
            "Resource": "arn:aws:s3:::{Your S3 ARN}/*"
        },
        {
            "Effect": "Allow",
            "Principal": {
                "AWS": "arn:aws:iam::cloudfront:user/CloudFront Origin Access Identity {Your Origin Access Identity}"
            },
            "Action": "s3:ListBucket",
            "Resource": "arn:aws:s3:::{Your S3 ARN}"
        }
    ]
  ```

### Customization

The `custom-assets` folder contains web assets to be served from the S3 bucket. These should be placed in the root folder of the bucket. 

1. `index.html` and `download.js` implement a landing page for downloading e-reserves content from the site. The landing-page code expects a URL parameter with a path to a resource in the S3 bucket, constructed as follows: `?file=erserves/path/to/resource`, including the resource's filename and extension. This format assumes that resources resides in a subfolder or subfolders nested under an `ereserves` folder (relative to the root folder).
2. `ereserves_list.html` and `ereserves_list.js` implement a menu-driven directory index for the S3 bucket. The index is derived from `ereserves_files.json`, which is updated by a Lambda function (see below). The code as written assumes resources are arranged in the following folder hierarchy:
```
erserves/
--library_code
-----instructor_name
-------resource
```
The index includes the names of resources at a given path and a parametrized URL for accessing each one directly.

The `custom-lambdas` folder contains Python code to be implemented as a Lambda (*not* Lambda@Edge) with a trigger linked to the S3 bucket, so that the code runs whenever a file is added to or deleted from any subfolder within the `ereserves` folder.

1. The trigger uses the following event types: `s3:ObjectCreated:*, s3:ObjectRemoved:*`.
2. It has a `prefix` value of `ereserves/`.
3. The S3 bucket is associated with the `gwlibraries-ereserves-write` policy (JSON file in the `custom-policies` folder of this repo), which defines permissions to list the objects in the bucket and to put an object in the bucket.
4. The policy above is granted to an IAM role, `gwlibraries-ereserves-lambda-s3-write`, which is used as the lambda's Execution role.
5.. The Lambda (re)creates the `ereserves_files.json`, which contains an updated list of all files and paths in the `ereserves` folder.

### Deploying the Lambda function

1. Create a policy (see the template in `custom-policies/gwlibraries-ereserves-write.json`) allowing permissions to list and put objects on the bucket where the file to be served reside. Replace the values for `bucket-id` with the name of the bucket, and `user-id` with the ID of the user with whom the CloudWatch logs should be associated. These logs will record logged output from the lambda when it runs.
2. Create an execution role for running the lambda. This role should be linked to the policy created in step 1. 
3. Create a new lambda function, assinging the execution role created in step 2.
4. Copy the code from `generate_files_list.py` into the lambda function's code editor. Note that while it's not necessary to specify the bucket name in the code, since this is included in the event JSON that triggers the lambda, the code does specify a particular prefix within which to list objects (`ereserves/`). This can be changed, as needed. But be careful to ensure that the Lambda function does not **write** the created file list to the same directory as specified in the `prefix` (or to any of its children) -- otherwise, the lambda, when triggered by additions or changes to the bucket, will recursively invoke itself. 
5. If desired, configure the Lambda test to use the bucket name/ARN from above. If so configured, running the test will run the Lambda against the bucket and generate the file list.
6. If using a trigger, configure it as follows, making sure to include a prefix value that points to a separate path from where the file list will be stored:
   ```
   Bucket arn: {from above}
   Event types: s3:ObjectCreated:*, s3:ObjectRemoved:*
   Prefix: ereserves/ 
   ```