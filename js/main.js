var Farrah = {
  conf: {
    fetchLimit: 25,
    fetchOffset: 0,
    firstQuery: true,
    endpoint: 'http://dbpedia.org/sparql',
    hashParams: {},
    lang: "es",
    re: null,
    updateFacets: true,
    facets: new Array(),
    language: {
                "en": {
                      search: "Search",
                      results: "results",
                      facets: "Facets",
                      previousButton: "Previous",
                      nextButton: "Next",
                      clearButton: "Clear",
                      searchBoxMsg: "Type at least 3 characters",
                      orderBy: "Order by"
                },
                "es": {
                      search: "Búsqueda por palabra",
                      results: "resultados",
                      facets: "Facetas",
                      previousButton: "Previos",
                      nextButton: "Siguientes",
                      clearButton: "Limpiar",
                      searchBoxMsg: "Escriba al menos 3 caracteres",
                      orderBy: "Ordenar por"
                }
    }
  },
  ajaxObj: undefined,
  div: undefined,
  totalResults: 0,
  init: function(divId, options){
    var self = this;
    self.div = "#"+divId;
    //override default options
    if(options != undefined){
      for(var i in options){
        self.conf[i] = options[i];
      }
    }
    //var endpoint = 'http://healthdata.tw.rpi.edu/sparql';
    var facetsLoaded = 0;
    var ajaxObj = undefined;
    //Find is there is mirroring
    if(self.conf.localNamespace != undefined && self.conf.originNamespace != undefined && self.conf.originNamespace != self.conf.localNamespace){
      self.re = new RegExp("^"+self.conf.originNamespace, "i");
    }
    self.conf.hashParams = self._parseArgs();
    //Create necessary dom elements
    var _farrah = $("#"+divId), _facetDiv = null, _resultDiv = null;
    _farrah.append('<div class="table-bordered" id="farrah-content">\
      <div class="facet-container table-bordered" id="farrahFacets">\
      <div class="panel-header table-bordered"><h3>'+self.conf.language[self.conf.lang].facets+'</h3>\
      </div>\
      <div class="table-bordered facetDiv well" id="keyword">\
      <h3>'+self.conf.language[self.conf.lang].search+'</h3>\
      <form class="form">\
      <input type="text" class="input-large keyword-facet form-control" id="keyword-search" placeholder="'+self.conf.language[self.conf.lang].searchBoxMsg+'">\
      </form>\
      </div>\
      </div>\
      <div class="result-container">\
      <div class="panel-header">\
      <div style="float:left"><span id="total-results" class="results-total subtitle"></span></div>\
      <div style="float:left;" class="farrah-sorter"></div>\
      <div style="float:right;" class="farrah-pager">\
      <button id="previous" class="farrah-pager-button btn btn-info disabled">'+self.conf.language[self.conf.lang].previousButton+' <span class="limit-label"></span></button>\
      <button id="next" class="farrah-pager-button btn btn-info disabled">'+self.conf.language[self.conf.lang].nextButton+' <span class="limit-label"></span></button>\
      </div>\
      </div>\
      <div id="farrahResults" class="table-bordered results"></div>      \
      </div>\
      </div>');

      $.each(self.conf.facets, function(i, item){
          var title = item.id.replace("_", " ");
          $(self.div+" #farrahFacets").append('<div class="table-bordered facetDiv well" id="div-'+item.id+'"><div style="display:block;position:relative;width:100%;overflow: auto;"><span class="facet-title">'+title.charAt(0).toUpperCase() + title.slice(1)+'</span><button class="btn btn-primary btn-sm clear-button" data-target="'+item.id+'">'+self.conf.language[self.conf.lang].clearButton+'</button></div><div id="waiting-'+item.id+'"class="progress progress-striped active"><div class="bar" style="width: 100%;"></div></div></div>');
          self._getFacetData(i, item);
      });
      $(self.div+" .limit-label").html(self.conf.fetchLimit);
      //Order select
     if(self.conf.query.orderBy != undefined && self.conf.query.orderBy.length > 1){
        var sortSelect = $("<select></select>").attr("id", "farrah-sortBy");
        $(".farrah-sorter").append($("<span></span>").html(self.conf.language[self.conf.lang].orderBy+" "));
        $(".farrah-sorter").append(sortSelect);
        $.each(self.conf.query.orderBy, function(i, item){
          if(item.value == undefined || item.label == undefined){
            alert("Undefined label or value for sorting");
            return;
          }
          var sortOption = $("<option></option>").attr("value", item.value).html(item.label);
          if(item.descending != undefined && item.descending == true){
            sortOption.attr("descending", "true");
          }
          sortSelect.append(sortOption);
        });
        $("body").on('change', "#farrah-sortBy", function(e){self._updateGUI(e)});
      }
      //Keyword search
      $(self.div+" #keyword-search").typing({
          stop: function (event, $elem) {
            if($elem.val().length >= 3 || $elem.val() === ""){
              $elem.trigger('change');
            }
            event.preventDefault();
          },
          delay: 400
      });
      $("body").on('change', ".facet", function(e){self._updateGUI(e)});
      $("body").on('change', ".keyword-facet", function(e){ e.preventDefault();self._updateGUI(e);})
      $("body").on('click', ".clear-button", self._clearFacet);
      $("body").on('click', ".farrah-pager-button", function(e){
          if($(e.target).is('.disabled')){return;}
          if($(e.target).attr("id") == 'previous'){
            self.conf.fetchOffset--;
          }
          if(self.conf.fetchOffset < 1){$(self.div+" #previous").addClass('disabled');}
          if($(e.target).attr("id") == 'next'){
            self.conf.fetchOffset++;
          }
          if(self.conf.fetchOffset > 0){$(self.div+" #previous").removeClass('disabled');}

          self._executeQuery(self._getFacetStatus());
      });
      self._executeQuery(self._getFacetStatus());

  },

  _updateFacetFromHash: function(id){
    var self = this;
    if(self.conf.hashParams['keyword-search'] !== undefined && self.conf.hashParams['keyword-search'] != ""){
      $("#keyword-search").val(self.conf.hashParams['keyword-search']);
    }
    if(self.conf.hashParams[id] !== undefined){
      $.each(self.conf.hashParams[id], function(i, item){
          $("#"+id+" option[value='"+item+"']").attr("selected", true);
      });
    }
  },

  _executeQuery: function(patterns){
    var self = this;
    var facetPatterns = "";
    var namedGraphStart = "", namedGraphEnd = "";
    //Stop ajax already existing request
    if(self.ajaxObj !== undefined){
      self.ajaxObj.abort();
    }

    facetPatterns += patterns.join("\n");

    //Get Prefixes
    var queryPrefixes = "";
    if(self.conf.query.prefixes !== undefined){
      for(i in self.conf.query.prefixes){
        queryPrefixes += "PREFIX "+i+": <"+self.conf.query.prefixes[i]+"> \n";
      }
    }
    //Get Variables
    var queryVariables = "";
    if(self.conf.query.variables !== undefined){
      for(i in self.conf.query.variables){
        queryVariables += "?"+self.conf.query.variables[i].replace('?', '')+" ";
      }
    }
    //Get Patterns
    var queryPatterns = "";
    if(self.conf.query.patterns !== undefined){
      for(i in self.conf.query.patterns){
        queryPatterns += self.conf.query.patterns[i]+" .\n";
      }
    }
    var orderVar = self.conf.query.variables[1];
    var optionSelected = $("#farrah-sortBy option:selected");
    if(optionSelected.length > 0){
      if(optionSelected.attr("descending") != undefined && optionSelected.attr("descending") != ""){
        orderVar = 'ORDER BY DESC('+optionSelected.val()+')';  
      }else{
        orderVar = 'ORDER BY '+optionSelected.val();
      }
    }
    var query = queryPrefixes+
    'SELECT DISTINCT '+queryVariables+' WHERE { \
      '+namedGraphStart+'\
      '+facetPatterns+' \
      '+queryPatterns+' \
      '+namedGraphEnd+' \
    } '+orderVar+' \
    LIMIT '+(self.conf.fetchLimit+1) +' \
    OFFSET '+(self.conf.fetchLimit*self.conf.fetchOffset);
    $("#farrahResults").empty().html('<div class="progress progress-striped active" style="width:70%;margin-left:auto;margin-right:auto;margin-bottom:auto;margin-top:auto;"><div class="bar" style="width: 100%;"></div></div>');
    ajaxObj = $.ajax({
        url: self.conf.endpoint,
        beforeSend: function(jqXHR, settings) {
          jqXHR.setRequestHeader("Accept", "application/sparql-results+json");
        },
        data: {
          query: query
        },
        dataType: 'json',
        success: function(data){
                    $("#farrahResults").empty();
                    if(self.conf.renderResults == undefined){
                     self._renderResults(data, self.conf);
                    }else{
                      self.conf.renderResults(data, self.conf);
                    }
        },
    });

    var queryTotal = queryPrefixes+' SELECT (COUNT(DISTINCT ?thing) AS ?total) WHERE{ \
    '+namedGraphStart+'\
      '+facetPatterns+' \
      '+queryPatterns+' \
      '+namedGraphEnd+' \
    }LIMIT 1';
    $.ajax({
        url: self.conf.endpoint,
        beforeSend: function(jqXHR, settings) {
          jqXHR.setRequestHeader("Accept", "application/sparql-results+json");
        },
        data: {
          query: queryTotal
        },
        dataType: 'json',
        success: function(data){
          $.each(data.results.bindings, function(i, item){
            $("#total-results").html(item.total.value+" "+self.conf.language[self.conf.lang].results);
          })
        },
    });
    firstQuery = false;
  },


  _updateGUI: function(e){
    var self = this;
    var currentSelect = $(e.target).attr("id"), passedCurrentSelect = false;
    var newPatterns = new Array();
    //Add query pattern if a text-based search exist
    newPatterns = self._getFacetStatus();
      $(".facet").each(function(index, item){
        if(!self.conf.updateFacets){
          console.log(currentSelect, $(item).attr("id"), currentSelect != $(item).attr("id"))
          if(currentSelect != $(item).attr("id")){
            var aux = self._getFacetData(index, self.conf.facets[index], newPatterns);
          }
        }
      });

    //Reset pager buttons
    self.conf.fetchOffset = 0;
    $(self.div+" #previous").addClass('disabled');
    $(self.div+" #next").removeClass('disabled');
    self._executeQuery(newPatterns);
  },

  _getWidgetFacetStatus: function(id, widget){
    var currentWidget = undefined;
    switch(widget){
    case 'date':
        return getDateWidgetStatus(id);
      break;
    }
  },

  _updateWidgetFacetFromHash: function(id, widget, data){
    var self = this;
    var currentWidget = undefined;
    switch(widget){
    case 'date':
        return updateDateWidgetFromHash(id, data);
      break;
    }
  },

  _getFacetStatus: function(){
    var self = this;
    var newPatterns = new Array();
    var hashObj = self._parseArgs();
    var keywords = $("#keyword-search").val();

    //Queries based on keyword search
    if($("#keyword-search").val() !== undefined && $("#keyword-search").val() != "" && $("#keyword-search").val().length >= 3){
      firstPattern = true;
      aux = "{";
      $.each(self.conf.keywordPaths, function(i, item){
        if(! firstPattern){
          aux += "}UNION{";
        }
        firstPattern = false;
        aux += self.conf.query.variables[0]+ ' '+item+' '+self.conf.query.variables[i+1]+' FILTER(regex('+self.conf.query.variables[i+1]+', "'+$("#keyword-search").val()+'", "i")) ';
      });
      aux += "}";
      newPatterns.push(aux);
    }
    hashObj["keyword-search"]= [$("#keyword-search").val()];

    //Add query patterns based on the selection of each facet
    $(".facet").each(function(index){
        var selectId = $(this).attr("id");
        if($(this).attr("data-widget") != null){
          var aux = self._getWidgetPatterns(selectId, $(this).attr("data-widget"), self.conf.facets[index], self.conf.facets[index]);
          newPatterns.push.apply(newPatterns, aux);

          hashObj[selectId] = self._getWidgetFacetStatus(selectId, $(this).attr("data-widget"));
        }else{
          hashObj[selectId] = new Array();
          unionPatterns = "";
          var selectedItemsInFacet = $(self.div+" #"+selectId+" option:selected").length;
          $(self.div+" #"+selectId+" option:selected").each(function(i, j){
              //Add filter in case of cast available
              var filter = "", objVar = $(j).html(), delimiter = '"';
              if($.inArray($(j).val(), hashObj[selectId]) < 0 ){
                hashObj[selectId].push($(j).val())
              };
              if(self.conf.facets[index].facetEntityCast !==undefined){
                objVar = '?var'+parseInt(Math.random()*100000);
                delimiter = " ";
                filter = "FILTER("+self.conf.facets[index].facetEntityCast+"("+objVar+") = \""+$(j).html()+"\"^^"+self.conf.facets[index].facetEntityCast+")";
              }
              var lang = (self.conf.facets[index].facetLabelLanguage!==undefined)?"@"+self.conf.facets[index].facetLabelLanguage:"";
              var newPattern = '?thing '+self.conf.facets[index].facetPredicates[0] +' '+delimiter+ objVar + delimiter+'. '+filter;
              if(self.conf.facets[index].facetLabelPredicates !== undefined){
                newPattern =  '?thing '+self.conf.facets[index].facetPredicates[0] +' [ '+self.conf.facets[index].facetLabelPredicates+' '+delimiter+ objVar + delimiter+lang+' ]. '+filter;
              }
              if(selectedItemsInFacet > 1 && self.conf.updateFacets == false){
                if(i == 0){
                  unionPatterns = "{"
                }else{
                  unionPatterns += "} UNION {";
                }
                unionPatterns += newPattern;
                if(i == selectedItemsInFacet-1){
                  unionPatterns += "}"
                  console.log(unionPatterns);
                  newPatterns.push(unionPatterns);
                  console.log(newPatterns);
                }
              }else{
                newPatterns.push(newPattern);
              }

          });
        }
    });
        window.location.hash = self._argsToHash(hashObj);

    return newPatterns;
  },

  _argsToHash: function(obj){
    var hash = "#";
    for(var i in obj){
      hash+=i+"="+obj[i].join("|")+"&";
    }
    return hash;
  },
  _getFacetData: function(i, item, existingFacets){
    var self = this;
    var predicateLabels = "",
    labelVariable = "",
    sparqlLimit = 10,
    namedGraphStart = "",
    namedGraphEnd = "",
    thingVariable = '?var_'+item.id,
    thingSelected =  thingVariable,
    orderByThing = thingVariable,
    facetWidget = undefined;
    selectedFacets = "";
    if(item.facetEntityCast !== undefined){
      thingVariable = thingVariable+'_1';
      thingSelected = item.facetEntityCast+'('+thingVariable+') AS ?var_'+item.id;
      orderByThing = item.facetEntityCast+'('+thingVariable+')';
    }
    if(item.facetWidget !== undefined){
      facetWidget = item.facetWidget;
      facetPattern = self._getFacetPatternWidget(facetWidget, item);
    }
      facetPattern = '?thing '+item.facetPredicates[0]+' '+thingVariable+' .';
    if(item.limit !== undefined){
      sparqlLimit = item.limit;
    }
    if(item.facetLabelPredicates !== undefined){
      predicateLabels = thingVariable+' '+item.facetLabelPredicates+' ?var_'+item.id+'Label .';
      labelVariable = '?var_'+item.id+'Label';
    }

    var filterByLanguage = "";
     if(item.facetLabelLanguage !== undefined){
      filterByLanguage = 'FILTER(lang(?var_'+item.id+'Label) = "'+item.facetLabelLanguage+'")';
    }
    if(existingFacets !== undefined){
      $.each(existingFacets, function(i){ selectedFacets+= existingFacets[i]; });
      //         return;
    }
    //Get Prefixes
    var queryPrefixes = "";
    if(self.conf.query.prefixes !== undefined){
      for(i in self.conf.query.prefixes){
        queryPrefixes += "PREFIX "+i+": <"+self.conf.query.prefixes[i]+"> \n";
      }
    }
    //Get types for the resource with this facets
    var resourceTypes = "", firstType = true;
    if(self.conf.resourceType !== undefined){
      for(i in self.conf.resourceType){
        if(self.conf.resourceType.length > 1){
          if(firstType != true){
            resourceTypes += "UNION";
          }
          firstType = false;
          resourceTypes += "{";
        }
        resourceTypes += "?thing a "+self.conf.resourceType[i]+" . \n";
        if(self.conf.resourceType.length > 1){
          resourceTypes += "}";
        }
      }
    }

    var facetLimit = item.facetLimit || 100;
    var query = queryPrefixes+
    'SELECT DISTINCT '+thingSelected+' '+labelVariable+' WHERE { \
      '+namedGraphStart+'\
      '+resourceTypes+"\n"+facetPattern+"\n"+selectedFacets+'\
      '+predicateLabels+' \
      '+namedGraphEnd+' \
      '+filterByLanguage+' \
    }ORDER BY '+((labelVariable == "")?orderByThing:labelVariable)+' \
    LIMIT '+facetLimit;
    $.ajax({
        url: self.conf.endpoint,
        beforeSend: function(jqXHR, settings) {
          jqXHR.setRequestHeader("Accept", "application/sparql-results+json");
          jqXHR.thisSelf = self;
        },
        data: {
          query: query
        },
        dataType: 'json',
        async: false,
        success: function(data, textStatus, jqXHR){
          var self = jqXHR.thisSelf;
          options = {};
          $.each(data.results.bindings, function(index, value){
              var label = value["var_"+item.id].value;
              if(value["var_"+item.id+"Label"] !== undefined){
                label = value["var_"+item.id+"Label"].value;
              }
              options[label] = value["var_"+item.id].value;
          });
          if(existingFacets == undefined){
            if(facetWidget !==undefined){
              $("#div-"+item.id).append('<div style="display:block;min-height:30px"></div>');
             self._drawWidget(item.id, facetWidget, data);
            }else{
              $("#div-"+item.id).append('<select multiple class="select-facet facet form-control" size="10" id="'+item.id+'">'+options+'</select>');
            }
          }
          var selectId = item.id;
          if(facetWidget !==undefined){
            self._updateWidgetFacet(item.id, facetWidget, data);
            if(existingFacets == undefined){
             self._updateWidgetFacetFromHash(selectId,$("#"+selectId).attr("data-widget"), self.conf.hashParams[selectId] );
            }
          }else{
            var currentSelection = new Array();
            $("#"+selectId+" option:selected")
            .each(function(i){currentSelection.push($(this).val());});
            $("#"+selectId).empty();
            $.each(options, function(k, v) {
                $("#"+selectId).append($("<option></option>").attr("value", v).text(k));
            });
            $.each(currentSelection, function(i, previouslySelected){$("#"+selectId+" option[value='"+previouslySelected+"']").attr("selected", true)});
            if(existingFacets == undefined){
              //Select values in case they are indicated in hash
              self._updateFacetFromHash(item.id);
              if(++self.conf.facetsLoaded == self.conf.facets.length){
                $(self.div+" .select-facet option:first").trigger('change');
              }
            }
          }
          $(self.div+' #waiting-'+item.id).addClass('hide');
        }
    });
  },

  _drawWidget: function(elem, widget, data){
    var currentWidget = undefined;
    switch(widget){
    case 'date':
      if (typeof dateFarrahWidget !== 'function') {
        alert("no widget");
      }else{
        currentWidget = dateFarrahWidget(elem, data);
      }
      break;
    }
  },
   _updateWidgetFacet: function(elem, widget, data){
    var currentWidget = undefined;
    switch(widget){
    case 'date':
        currentWidget = updateDateFarrahWidget(elem, data);
      break;
    case 2:

      break;
    }
  },

  _getFacetPatternWidget: function(widget, a){
    switch(widget){
    case 'date':
        return facetPatternDateFarrahWidget(a);
      break;
    case 2:

      break;
    }

  },
  _getWidgetPatterns: function(elem, widget, conf){
    var currentWidget = undefined;
    switch(widget){
    case 'date':
      return getPatternsDateFarrahWidget(elem, conf);
      break;
    }
  },

  _clearFacet: function(e){
    var self = this;
    var selectFacet = $(e.target).attr("data-target");
    $("#"+selectFacet+" option:selected").removeAttr("selected");
    $("#"+selectFacet).trigger('change');
  },

  _parseArgs: function(){
    var self = this;
    var r = {};
    var s = window.location.hash.slice(1);
    $.each(s.split('&'), function(i, item){
        if(item !==undefined && item.length > 0){
          pair = item.split('=');
          if(pair[1].length >0){
            var values = [];
            $.each(pair[1].split('|'), function(index, val){if(val.length>1){values.push(val);}});
            r[pair[0]]= values;
          }
        }
    });
    return r;
  },

  _renderResults: function(data, conf){
    var self = this;
    options = "";
    if(data.results.bindings.length > 0){$("#next").removeClass('disabled');}
    var thing = conf.query.variables[0],
        thingTitle = conf.query.variables[1],
        thingDescription = conf.query.variables[2];
    $.each(data.results.bindings, function(index, val){
        if(index == conf.fetchLimit){$("#next").removeClass('disabled'); return false;}
        var thingUri = val.thing.value;
        if(self.re !=  null){
          thingUri = thingUri.replace(self.re, self.conf.localNamespace);
        }
        $("#farrahResults").append('<div class="well farrah-result"> \
          <div style="display:block;width:100%;margin-bottom:20px"> \
          <h3> \
          <a href="'+thingUri+'">'+
          ((val.thingTitle.value != undefined)?val.thingTitle.value:val.thing.value)+'</a> \
          </h3> \
          <p>'+((val.thingDescription !== undefined)?val.thingDescription.value:"")+'</p> \
          </div>');
    });
        if(data.results.bindings.length < conf.fetchLimit){$("#next").addClass('disabled');}
  }

}

