import boto3
import json 

s3 = boto3.client('s3')

def get_objects(bucket, prefix, token=None):
    '''
    Given an S3 bucket name, and prefix, and (optionally) a continuation token, 
    retrieves the objects in that bucket. Invoked recursively to retrieve all objects in the bucket at the given prefix.
    '''
    try:
        if token:
            response = s3.list_objects_v2(Bucket=bucket, MaxKeys=1000, Prefix=prefix, ContinuationToken=token)
        else:
            response = s3.list_objects_v2(Bucket=bucket, Prefix=prefix, MaxKeys=1000)
        contents = response.get('Contents')
        for object in contents:
            yield object.get('Key')
    except Exception as e:
        print(e)
        print('Error getting objects from bucket {}. Make sure they exist and your bucket is in the same region as this function.'.format(bucket))
        raise e
    if response.get('IsTruncated'):
        token = response.get('NextContinuationToken')
        yield from get_objects(bucket, prefix, token)


def put_object_list(bucket, object_list, key, max_age=None):
    '''
    Writes a list of objects to the bucket as a JSON file, using the specified key.
    '''
    try:
        if max_age:
            response = s3.put_object(Body=json.dumps(object_list), Bucket=bucket, Key=key, CacheControl=f'max-age={max_age}')
        else:
            response = s3.put_object(Body=json.dumps(object_list), Bucket=bucket, Key=key)
    except Exception as e:
        print(e)
        print('Error puting object to bucket {}.'.format(bucket))
        raise e
    

def lambda_handler(event, context):
    # Get the object from the event 
    bucket = event['Records'][0]['s3']['bucket']['name']
    keys_list = [ k for k in get_objects(bucket, prefix='ereserves/') ]
    put_object_list(bucket, keys_list, key='ereserves_files.json', max_age='300')
              