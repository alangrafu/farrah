$(document).ready(function(){
    var endpoint = 'http://logd.tw.rpi.edu:8890/sparql';
    var endpoint = 'proxy.php';
    
    function _executeQuery(e){      
      var facetPatterns = "";
      $.each(facets, function(i, item){
          selectedValues = $("#select-"+item.id+" option:selected");
          if(selectedValues.length > 1){
          facetPatterns += '{';
          }
          selectedValues.each(function(index, value){
              facetPatterns += '?dataset ' + item.facetPredicates + ' <' + $(value).val()+'> . \
              ';
              if(selectedValues.length > 1){
                if(index < selectedValues.length -1){
                  facetPatterns += '}UNION{';
                }else{
                  facetPatterns += '}';
                }
              }
          });
      });
      var query = 'PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#> \
      PREFIX foaf: <http://xmlns.com/foaf/0.1/> \
      PREFIX dcterms: <http://purl.org/dc/terms/> \
      PREFIX dgtwc: <http://data-gov.tw.rpi.edu/2009/data-gov-twc.rdf#> \
      PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#> \
      PREFIX conversion: <http://purl.org/twc/vocab/conversion/> \
      SELECT DISTINCT ?dataset ?datasetTitle WHERE { \
        GRAPH <http://purl.org/twc/vocab/conversion/MetaDataset> { \
        ?dataset dcterms:title ?datasetTitle . \
        '+facetPatterns+' \
      } \
    }ORDER BY ?datasetLabel \
    LIMIT 10';
    console.log(query);
}


    function _getFacetData(i, item){
      var query = 'PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#> \
      PREFIX foaf: <http://xmlns.com/foaf/0.1/> \
      PREFIX dcterms: <http://purl.org/dc/terms/> \
      PREFIX dgtwc: <http://data-gov.tw.rpi.edu/2009/data-gov-twc.rdf#> \
      PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#> \
      PREFIX conversion: <http://purl.org/twc/vocab/conversion/> \
      SELECT DISTINCT ?thing ?thingLabel WHERE { \
        GRAPH <http://purl.org/twc/vocab/conversion/MetaDataset> { \
        [] '+item.facetPredicates+' ?thing . \
        ?thing '+item.facetLabelPredicates+' ?thingLabel . \
      } \
    }ORDER BY ?thingLabel \
    LIMIT 10';
    $.ajax({
        url: endpoint,
        beforeSend: function(jqXHR, settings) {
          jqXHR.setRequestHeader("Accept", "application/sparql-results+json");
        },
        data: {
          query: query
        },
        dataType: 'json',
        success: function(data){
          options = "";
          $.each(data.results.bindings, function(index, value){
              options += '<option value="'+value.thing.value+'">'+value.thingLabel.value+'</option>';
          });
          $("#"+item.id).append('<button class="btn btn-mini clear-button" data-target="select-'+item.id+'">clear</button><select multiple class="select-facet" id="select-'+item.id+'">'+options+'</select>');
          $('#waiting-'+item.id).addClass('hide');
        }
    });
}

function _clearFacet(e){
  var selectFacet = $(e.target).attr("data-target");
  $("#"+selectFacet+" option:selected").removeAttr("selected").trigger('change');
}

function init(){
  $.each(facets, function(i, item){
      $("#facets").prepend('<div class="table-bordered" id="'+item.id+'"><h3>'+item.id.charAt(0).toUpperCase() + item.id.slice(1)+'</h3><div id="waiting-'+item.id+'"class="progress progress-striped active"><div class="bar" style="width: 100%;"></div></div></div>');
      _getFacetData(i, item);
  });
  
  $("body").on('change', "select", _executeQuery);
  $("body").on('click', ".clear-button", _clearFacet);

}

//Init
var facets = [
  {'id': 'country',
    'facetPredicates': 'dgtwc:catalog_country',
    'facetLabelPredicates': 'dcterms:title'
  },
  {'id': 'agency',
    'facetPredicates': 'dgtwc:agency',
    'facetLabelPredicates': 'rdfs:label'
  }
];

init();

});

