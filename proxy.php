<?

$endpoint = 'http://logd.tw.rpi.edu/sparql?';


$opts = array(
  'http'=>array(
    'method'=>"GET",
    'header'=>"Accept: application/sparql-results+json;charset=utf-8\r\n".
              "Authorization: Digest js:Monday-find-English-down-sufficient\r\n"
  )
);
$a = $_GET;
$a['format'] = 'application/sparql-results+json';
$a['output'] = 'sparqljson';
$url = $endpoint.http_build_query($a);
$context = stream_context_create($opts);
header('Content-type: application/sparql-results+json;charset=utf-8');
echo file_get_contents($url, false, $context);

?>
