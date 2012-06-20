<?php 

//This script acts as a proxy using http digest authentication

//Load $user, $pass and $host
include_once('config.inc');
$query = 'query='.$_GET['query'];
$fields['tqx'] = 'out:json';
$lengh = strlen($query); 
  
$headers[] = 'Accept: application/sparql-results+json'; 
//$headers[] = 'Content-Type: application/rdf+xml; charset=utf-8'; 
//$headers[] = "Content-Length: $lengh"; 
  
$poster = curl_init($host); 
curl_setopt($poster, CURLOPT_HTTPAUTH, CURLAUTH_DIGEST);
curl_setopt($poster, CURLOPT_FOLLOWLOCATION, TRUE); 
curl_setopt($poster, CURLOPT_CONNECTTIMEOUT, 2); 
curl_setopt($poster, CURLOPT_TIMEOUT, 60); 
curl_setopt($poster, CURLOPT_HTTPHEADER, $headers ); 
curl_setopt($poster, CURLOPT_HEADER, 0); 
curl_setopt($poster, CURLOPT_USERPWD, $user.':'.$pass); 
curl_setopt($poster, CURLOPT_POSTFIELDS, $query); 
curl_setopt($poster, CURLOPT_RETURNTRANSFER, true);
  
$raw_response = curl_exec($poster); 
if(curl_errno($poster)){
    echo 'Curl error: ' . curl_error($poster);
}
echo($raw_response);
  
curl_close($poster); 
?> 
