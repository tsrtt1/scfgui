<?php
$secretKey = 'AKIDV5bv78Oc4LUULEnQiqopib5QoFVZo8d0';
$srcStr = 'GEThttps://apigateway.api.qcloud.com/v2/index.php?Action=DescribeServicesStatus&Nonce=59486&Region=ap-beijing&SecretId=AKIDV5bv78Oc4LUULEnQiqopib5QoFVZo8d0&SignatureMethod=HmacSHA256&Timestamp=1586791599';
$signStr = base64_encode(hash_hmac('sha256', $srcStr, $secretKey, true));
echo $signStr;



// https://apigateway.api.qcloud.com/v2/index.php?Action=DescribeServicesStatus&Nonce=59485&Region=ap-beijing&SecretId=AKIDV5bv78Oc4LUULEnQiqopib5QoFVZo8d0&SignatureMethod=HmacSHA256&Timestamp=1586790772&Signature=rcXVYRt0hnGsNnpCZ/WPBAb/nz3QuChWLarrmKY5HPI=