$(document).ready(function(){
    var endpoint = 'http://logd.tw.rpi.edu:8890/sparql';
    endpoint = 'auth.php';
    var hashParams = {};
    var facetsLoaded = 0;
    var fetchLimit = 25;
    var fetchOffset = 0;
    var firstQuery = true;
    var ajaxObj = undefined;
    function _updateFacetFromHash(id){
      if(hashParams['keyword-search'] !== undefined && hashParams['keyword-search'] != ""){
        $("#keyword-search").val(hashParams['keyword-search']);
      }
      if(hashParams[id] !== undefined){
        $.each(hashParams[id], function(i, item){
          $("#select-"+id+" option[value='"+item+"']").attr("selected", true);
        });
      }
    }
    
    function _msgError(msg){
      $("#error-details").html(msg);
      $("#error-msg").modal('show');
    }
    
    function _executeQuery(){      
      var facetPatterns = "";
      var hashString = "#";
      fetchOffset = 0;
      
      //Stop ajax already existing request
      if(ajaxObj !== undefined){
        ajaxObj.abort();
      }

      if($("#keyword-search").val() !== undefined && $("#keyword-search").val() != "" && $("#keyword-search").val().length >= 3){
        facetPatterns += 'FILTER(regex(?datasetTitle, "'+$("#keyword-search").val()+'", "i")) '
        hashString +="keyword-search="+$("#keyword-search").val()+"&";
      }
      $.each(facets, function(i, item){
          var rightDelimiter = '>', leftDelimiter = '<';
          if(item.facetLabelPredicates === undefined){
            rightDelimiter = '"';
            leftDelimiter = '"';
          }
          selectedValues = $("#select-"+item.id+" option:selected");
          if(firstQuery == true && selectedValues.length == 0 && item.default !== undefined){
            selectedValues.push($("#select-"+item.id+" option[value='"+item.default+"']").attr("selected", true));
          }
          hashString += item.id+"=";
          if(selectedValues.length > 1){
            facetPatterns += '{';
          }
          selectedValues.each(function(index, value){
              facetPatterns += '?dataset ' + item.facetPredicates + ' '+leftDelimiter + $(value).val()+ rightDelimiter +' .               ';
              hashString += $(value).val()+"|";
              if(selectedValues.length > 1){
                if(index < selectedValues.length -1){
                  facetPatterns += '}UNION{';
                }else{
                  facetPatterns += '}';
                }
              }
          });
          hashString += "&";
          console.log(hashString);
      });
      firstQuery = false;
      var query = 'PREFIX foaf: <http://xmlns.com/foaf/0.1/> \
      PREFIX dcterms: <http://purl.org/dc/terms/> \
      PREFIX dgtwc: <http://data-gov.tw.rpi.edu/2009/data-gov-twc.rdf#> \
      PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#> \
      PREFIX conversion: <http://purl.org/twc/vocab/conversion/> \
      SELECT DISTINCT ?dataset ?datasetTitle ?catalog_title ?homepage ?datasetDescription ?catalogHomepage WHERE { \
        ?dataset dcterms:title ?datasetTitle ; \
                 dgtwc:catalog_title ?catalog_title; \
                 foaf:homepage ?homepage . \
        '+facetPatterns+' \
        OPTIONAL{ ?dataset dcterms:description ?datasetDescription} \
        OPTIONAL{ ?dataset dgtwc:catalog_homepage ?catalogHomepage} \
    }ORDER BY ?datasetTitle \
    LIMIT '+(fetchLimit+1) +' \
    OFFSET '+(fetchLimit*fetchOffset);
    $("#results").empty().html('<div class="progress progress-striped active" style="width:70%;margin-left:auto;margin-right:auto;margin-bottom:auto;margin-top:auto;"><div class="bar" style="width: 100%;"></div></div>');
    ajaxObj = $.ajax({
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
          if(data.results.bindings.length > 0){$("#next").removeClass('disabled');}
          $.each(data.results.bindings, function(index, value){
              if(index == fetchLimit){$("#next").removeClass('disabled'); return false;}
              var catalog = value.catalog_title.value;
              if(value.catalogHomepage !== undefined){
                catalog = '<a href="'+value.catalogHomepage.value+'">'+value.catalog_title.value+'</a>';
              }
              var description = ""
              if(value.datasetDescription !== undefined){
              description = value.datasetDescription.value;
              }
              $("#results").append('<div class="well"><div style="display:block;width:100%;margin-bottom:20px"><h3><a href="'+value.homepage.value+'">'+value.datasetTitle.value+'</a></h3><p><em>Taken from '+catalog+'</em></p></div><small>'+description+'</small></div>');
          });
          if(data.results.bindings.length < fetchLimit){$("#next").addClass('disabled');}
        }
    });
          window.location.hash = hashString;

}


    function _getFacetData(i, item){
      var predicateLabels = "";
      var labelVariable = "";
      var sparqlLimit = 10000;
      if(item.limit !== undefined){
        sparqlLimit = item.limit;
      }
      if(item.facetLabelPredicates !== undefined){
        predicateLabels = '?thing '+item.facetLabelPredicates+' ?thingLabel .';
        labelVariable = '?thingLabel';
      }
      var query = 'PREFIX foaf: <http://xmlns.com/foaf/0.1/> \
      PREFIX dcterms: <http://purl.org/dc/terms/> \
      PREFIX dgtwc: <http://data-gov.tw.rpi.edu/2009/data-gov-twc.rdf#> \
      PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#> \
      PREFIX conversion: <http://purl.org/twc/vocab/conversion/> \
      SELECT DISTINCT ?thing '+labelVariable+' WHERE { \
        [] '+item.facetPredicates+' ?thing . \
        '+predicateLabels+' \
    }ORDER BY '+labelVariable+' ?thing \
    LIMIT '+sparqlLimit;
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
              if(value.thingLabel !== undefined){
                label = value.thingLabel.value;
              }
              options += '<option value="'+value.thing.value+'" data-name="'+label+'">'+label+'</option>';
          });
          $("#"+item.id).append('<button class="btn btn-mini clear-button" data-target="select-'+item.id+'">clear</button><select multiple class="select-facet facet" id="select-'+item.id+'">'+options+'</select>');
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
  $("#keyword-search").typing({
    stop: function (event, $elem) {
      if($elem.val().length >= 3 || $elem.val() === ""){
        $elem.trigger('change');
      }
    },
    delay: 400
});
  $("body").on('change', ".facet", _executeQuery);
  $("body").on('click', ".clear-button", _clearFacet);
  $("body").on('click', ".pager-button", function(e){
      if($(e.target).is('.disabled')){return;}
      if($(e.target).attr("id") == 'previous'){
        fetchOffset--;
      }
      if(fetchOffset < 1){$("#previous").addClass('disabled');}
      if($(e.target).attr("id") == 'next'){      
        fetchOffset++;
      }
      if(fetchOffset > 0){$("#previous").removeClass('disabled');}
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
          $.each(pair[1].split('|'), function(index, val){if(val.length>1){values.push(val);}});
          r[pair[0]]= values;
        }
      }
  });
  return r;
}

//Init


hashParams = _parseArgs();
init();

});

