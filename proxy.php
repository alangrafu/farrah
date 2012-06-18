<?

$endpoint = 'http://logd.tw.rpi.edu:8891/sparql?';

$url = $endpoint.http_build_query($_GET);

$opts = array(
  'http'=>array(
    'method'=>"GET",
    'header'=>"Accept: application/sparql-results+json;charset=utf-8\r\n" 
  )
);
$_GET['format'] = 'application/sparql-results+json';
$context = stream_context_create($opts);
header('Content-type: text/html;charset=utf-8');
echo file_get_contents($url, false, $context);

?>
