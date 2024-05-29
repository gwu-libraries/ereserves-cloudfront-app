## Hosting files using AWS S3, CloudFront, and Cognito for authentication

This repository is a fork of the AWS sample [cloudfront-authorization-at-edge](https://github.com/aws-samples/cloudfront-authorization-at-edge/tree/master?tab=readme-ov-file#deploying-the-solution) repo. The `template.yml` file contains the code necessary to deploy this solution in AWS -- see the README in the original repo for deployment instructions.

### Architecture

- Uses an S3 bucket for file storage, including any web assets to be served.
- Uses Lambda@Edge functions to link a CloudFront app to Amazon Cognito for authentication.
- Cognito can be configured for SSO using OpenAthens or Microsoft Azure as the IdP. 
- The Lambda@Edge functions dispatch authentication to the Cognito User Pool defined as part of this template. 
- Content from the S3 bucket is served to authenticated users via CloudFront's distributed caches. 

For architecture details, see the [source repository](https://github.com/aws-samples/cloudfront-authorization-at-edge/tree/master?tab=readme-ov-file#deploying-the-solution).

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
3. The Lambda is associated with the `gwlibraries-ereserves-write` policy (JSON file in the `custom-policies` folder of this repo), which defines permissions to list the objects in the S3 bucket and to put an object in the bucket.
4. The Lambda (re)creates the `ereserves_files.json`, which contains an updated list of all files and paths in the `ereserves` folder.