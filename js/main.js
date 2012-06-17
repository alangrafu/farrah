$(document).ready(function(){
    var endpoint = 'http://logd.tw.rpi.edu:8890/sparql';
    endpoint = 'proxy.php';
    var hashParams = {};
    var facetsLoaded = 0;
    var fetchLimit = 25;
    var fetchOffset = 0;
    function _updateFacetFromHash(id){
      if(hashParams[id] != undefined){
        $.each(hashParams[id], function(i, item){
          $("#select-"+id+" option[value='"+item+"']").attr("selected", true);
        });
      }
    }
    
    function _executeQuery(){      
      var facetPatterns = "";
      var hashString = "#";
      $.each(facets, function(i, item){
          var rightDelimiter = '>', leftDelimiter = '<';
          if(item.facetLabelPredicates == undefined){
            rightDelimiter = '"';
            leftDelimiter = '"';
          }
          selectedValues = $("#select-"+item.id+" option:selected");

          hashString += item.id+"="
          if(selectedValues.length > 1){
            facetPatterns += '{';
          }
          selectedValues.each(function(index, value){
              facetPatterns += '?dataset ' + item.facetPredicates + ' '+leftDelimiter + $(value).val()+ rightDelimiter +' . \
              ';
              hashString += $(value).val()+"|"
              if(selectedValues.length > 1){
                if(index < selectedValues.length -1){
                  facetPatterns += '}UNION{';
                }else{
                  facetPatterns += '}';
                }
              }
          });
          hashString += "&"
      });
      window.location.hash = hashString;
      var query = 'PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#> \
      PREFIX foaf: <http://xmlns.com/foaf/0.1/> \
      PREFIX dcterms: <http://purl.org/dc/terms/> \
      PREFIX dgtwc: <http://data-gov.tw.rpi.edu/2009/data-gov-twc.rdf#> \
      PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#> \
      PREFIX conversion: <http://purl.org/twc/vocab/conversion/> \
      SELECT DISTINCT ?dataset ?datasetTitle ?catalog_title ?homepage WHERE { \
        GRAPH <http://purl.org/twc/vocab/conversion/MetaDataset> { \
        ?dataset dcterms:title ?datasetTitle ; \
                 dgtwc:catalog_title ?catalog_title; \
                 foaf:homepage ?homepage . \
        '+facetPatterns+' \
      } \
    }ORDER BY ?datasetTitle \
    LIMIT '+(fetchLimit+1) +' \
    OFFSET '+(fetchLimit*fetchOffset);
    $("#results").empty().html('<div class="progress progress-striped active"><div class="bar" style="width: 100%;"></div></div>');
    $.ajax({
        url: endpoint,
        beforeSend: function(jqXHR, settings) {
          jqXHR.setRequestHeader("Accept", "application/sparql-results+json");
          jqXHR.overrideMimeType('application/sparql-results+json; charset=UTF-8');
        },
        contentType: "application/sparql-results+json; charset=utf-8",
        data: {
          query: query
        },
        dataType: 'json',
        success: function(data){
          $("#results").empty();
          options = "";
          $.each(data.results.bindings, function(index, value){
              if(index == fetchLimit){$("#next").removeClass('disabled'); return false}
              $("#results").append('<div class="well"><h4><a href="'+value.dataset.value+'">'+value.datasetTitle.value+'</a></h4>Taken from <a href="'+value.homepage.value+'">'+value.catalog_title.value+'</a></div>');
          });
          if(data.results.bindings.length < fetchLimit){$("#next").addClass('disabled');}
        }
    });
}


    function _getFacetData(i, item){
      var predicateLabels = "";
      if(item.facetLabelPredicates != undefined){
        predicateLabels = '?thing '+item.facetLabelPredicates+' ?thingLabel .';
      }
      var query = 'PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#> \
      PREFIX foaf: <http://xmlns.com/foaf/0.1/> \
      PREFIX dcterms: <http://purl.org/dc/terms/> \
      PREFIX dgtwc: <http://data-gov.tw.rpi.edu/2009/data-gov-twc.rdf#> \
      PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#> \
      PREFIX conversion: <http://purl.org/twc/vocab/conversion/> \
      SELECT DISTINCT ?thing ?thingLabel WHERE { \
        GRAPH <http://purl.org/twc/vocab/conversion/MetaDataset> { \
        [] '+item.facetPredicates+' ?thing . \
        '+predicateLabels+' \
      } \
    }ORDER BY ?thingLabel ?thing \
    LIMIT 100';
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
              var label = value.thing.value;
              if(value.thingLabel != undefined){
                label = value.thingLabel.value;
              }
              options += '<option value="'+value.thing.value+'">'+label+'</option>';
          });
          $("#"+item.id).append('<button class="btn btn-mini clear-button" data-target="select-'+item.id+'">clear</button><select multiple class="select-facet" id="select-'+item.id+'">'+options+'</select>');
          $('#waiting-'+item.id).addClass('hide');
          //Select values in case they are indicated in hash
          _updateFacetFromHash(item.id);
          if(++facetsLoaded == facets.length){
              $(".select-facet option:first").trigger('change');
          }
        }
    });
}

function _clearFacet(e){
  var selectFacet = $(e.target).attr("data-target");
  $("#"+selectFacet+" option:selected").removeAttr("selected").trigger('change');
}

function init(){
  $.each(facets, function(i, item){
      $("#facets").append('<div class="table-bordered facetDiv well" id="'+item.id+'"><h3>'+item.id.charAt(0).toUpperCase() + item.id.slice(1)+'</h3><div id="waiting-'+item.id+'"class="progress progress-striped active"><div class="bar" style="width: 100%;"></div></div></div>');
      _getFacetData(i, item);
  });  
  $(".limit-label").html(fetchLimit);
  $("body").on('change', "select", _executeQuery);
  $("body").on('click', ".clear-button", _clearFacet);
  $("body").on('click', ".pager-button", function(e){
      if($(e.target).is('.disabled')){return}
    if($(e.target).attr("id") == 'previous'){
      fetchOffset--;
    }
    if(fetchOffset < 1){$("#previous").addClass('disabled')}
    if($(e.target).attr("id") == 'next'){      
      fetchOffset++;
    }
    if(fetchOffset > 0){$("#previous").removeClass('disabled')}
      _executeQuery();
  });

}

function _parseArgs(){
  var r = {};
  var s = window.location.hash.slice(1);
  $.each(s.split('&'), function(i, item){
      if(item.length > 0){
        pair = item.split('=');
        if(pair[1].length >0){
          var values = [];
          $.each(pair[1].split('|'), function(index, val){if(val.length>1)values.push(val)})
          r[pair[0]]= values;
        }
      }
  });
  return r;
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
  },
  {'id': 'language',
    'facetPredicates': 'dgtwc:catalog_language'
  }
];

hashParams = _parseArgs();
init();

});

