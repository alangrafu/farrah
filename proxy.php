<?

$endpoint = 'http://logd.tw.rpi.edu:8890/sparql?';

$url = $endpoint.http_build_query($_GET);

$opts = array(
  'http'=>array(
    'method'=>"GET",
    'header'=>"Accept: application/sparql-results+json\r\n" 
  )
);
$_GET['format'] = 'application/sparql-results+json';
$context = stream_context_create($opts);

echo file_get_contents($url, false, $context);

?>
