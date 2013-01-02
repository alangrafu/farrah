var Farrah = {
  conf: {
    fetchLimit: 25,
    fetchOffset: 0,
    firstQuery: true,
    endpoint: 'http://dbpedia.org/sparql',
    hashParams: {},
    facets: new Array()
  },
  ajaxObj: undefined,
  div: undefined,
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
    
    hashParams = self._parseArgs();
    //Create necessary dom elements
    var _farrah = $("#"+divId), _facetDiv = null, _resultDiv = null;
    _farrah.append('<div class="table-bordered" id="farrah-content">\
      <div class="facet-container table-bordered" id="farrahFacets">\
      <div class="panel-header table-bordered"><h3>Facets</h3>\
      </div>\
      <div class="table-bordered facetDiv well" id="keyword">\
      <h3>Search</h3>\
      <form class="form-inline">\
      <input type="text" class="input-large keyword-facet" id="keyword-search" placeholder="Type at least 3 characters">\
      </form>\
      </div>\
      </div>\
      <div class="result-container">\
      <div class="panel-header">\
      <h3 style="float:left;">Results</h3>\
      <div style="float:right;" class="pager">\
      <button id="previous" class="pager-button btn btn-info disabled">Previous <span class="limit-label"></span></button>\
      <button id="next" class="pager-button btn btn-info disabled">Next <span class="limit-label"></span></button>\
      </div>\
      </div>\
      <div id="farrahResults" class="table-bordered results"></div>      \
      </div>\
      </div>');
      $.each(self.conf.facets, function(i, item){
          var title = item.id.replace("_", " ");
          $(self.div+" #farrahFacets").append('<div class="table-bordered facetDiv well" id="'+item.id+'"><div style="float:left;display:inline"><h3>'+title.charAt(0).toUpperCase() + title.slice(1)+'</h3></div><div id="waiting-'+item.id+'"class="progress progress-striped active"><div class="bar" style="width: 100%;"></div></div></div>');
          self._getFacetData(i, item);
      });  
      $(self.div+" .limit-label").html(self.conf.fetchLimit);
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
      $("body").on('click', ".pager-button", function(e){
          if($(e.target).is('.disabled')){return;}
          if($(e.target).attr("id") == 'previous'){
            self.conf.fetchOffset--;
          }
          if(self.conf.fetchOffset < 1){$("#"+self.div+" #previous").addClass('disabled');}
          if($(e.target).attr("id") == 'next'){      
            self.conf.fetchOffset++;
          }
          if(self.conf.fetchOffset > 0){$("#"+self.div+" #previous").removeClass('disabled');}
          
          self._executeQuery();
      });
      self._executeQuery();
      
  },
  
  _updateFacetFromHash: function(id){
    var self = this;
    if(self.conf.hashParams['keyword-search'] !== undefined && self.conf.hashParams['keyword-search'] != ""){
      $("#"+self.div+" #keyword-search").val(self.conf.hashParams['keyword-search']);
    }
    if(hashParams[id] !== undefined){
      $.each(hashParams[id], function(i, item){
          $(self.div+" #select-"+id+" option[value='"+item+"']").attr("selected", true);
      });
    }
  },
  
  _executeQuery: function(){ 
    var self = this;
    var facetPatterns = "";
    var hashString = "#";
    var namedGraphStart = "", namedGraphEnd = "";
    //Stop ajax already existing request
    if(self.ajaxObj !== undefined){
      self.ajaxObj.abort();
    }
    
    if($("#"+self.div+" #keyword-search").val() !== undefined && $("#"+self.div+" #keyword-search").val() != "" && $("#"+self.div+" #keyword-search").val().length >= 3){
      facetPatterns += 'FILTER(regex('+self.conf.query.variables[0]+', "'+$("#"+self.div+" #keyword-search").val()+'", "i")) '
      hashString +="keyword-search="+$("#"+self.div+" #keyword-search").val()+"&";
    }
    $.each(self.conf.facets, function(i, item){
        var rightDelimiter = '>', leftDelimiter = '<';
        if(item.facetLabelPredicates === undefined){
          rightDelimiter = '"';
          leftDelimiter = '"';
        }
        selectedValues = $(self.div+" #select-"+item.id+" option:selected");
        if(self.conf.firstQuery == true && selectedValues.length == 0 && item.default !== undefined){
          selectedValues.push($("#"+self.div+" #select-"+item.id+" option[value='"+item.default+"']").attr("selected", true));
        }
        hashString += item.id+"=";
        if(selectedValues.length > 1){
          facetPatterns += '{';
        }
        selectedValues.each(function(index, value){
            var filter = "";
            var objVar = $(value).val();
            if (item.facetEntityCast !== undefined){
              objVar = '?var'+parseInt(Math.random()*100000);
              filter = "FILTER("+item.facetEntityCast+"("+objVar+") = \""+$(value).val()+"\"^^"+item.facetEntityCast+")";
              rightDelimiter = "";
              leftDelimiter = "";
            }
            facetPatterns += self.conf.query.variables[1]+' ' + item.facetPredicates[0] + ' '+leftDelimiter + objVar+ rightDelimiter +' .               '+filter;
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
    });
    firstQuery = false;
    
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
    var query = queryPrefixes+
    'SELECT DISTINCT '+queryVariables+' WHERE { \
      '+namedGraphStart+'\
      '+facetPatterns+' \
      '+queryPatterns+' \
      '+namedGraphEnd+' \
    }ORDER BY '+self.conf.query.variables[0]+' \
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
    window.location.hash = hashString;
    
  },
  
  
  _updateGUI: function(e){
    var self = this;
    var currentSelect = $(e.target).attr("id"), passedCurrentSelect = false;
    var newPatterns = new Array();
    //Add query pattern if a text-based search exist
    var keywords = $("#keyword-search").val();
    if(keywords !== undefined && keywords != ""){
          newPatterns.push('FILTER(regex(?x, "'+keywords+'", "i")) ');
    }
    console.log(keywords);
    //Add query patterns based on the selection of each facet
    $(".facet").each(function(index){
        var selectId = $(this).attr("id");
        $(self.div+" #"+selectId+" option:selected").each(function(i, j){
            //Addd filter in case of cast available
            var filter = "", objVar = $(j).html(), delimiter = '"';
            if(self.conf.facets[index].facetEntityCast !==undefined){
              objVar = '?var'+parseInt(Math.random()*100000);
              delimiter = " ";
              filter = "FILTER("+self.conf.facets[index].facetEntityCast+"("+objVar+") = \""+$(j).html()+"\"^^"+self.conf.facets[index].facetEntityCast+")";
            }
            var lang = (self.conf.facets[index].facetLabelLanguage!==undefined)?"@"+self.conf.facets[index].facetLabelLanguage:"";
            var newPattern = '?x '+self.conf.facets[index].facetPredicates[0] +' '+delimiter+ objVar + delimiter+'. '+filter;
            if(self.conf.facets[index].facetLabelPredicates !== undefined){
              newPattern =  '?x '+self.conf.facets[index].facetPredicates[0] +' [ '+self.conf.facets[index].facetLabelPredicates+' '+delimiter+ objVar + delimiter+lang+' ]. '+filter;
            }
            
            newPatterns.push(newPattern);
        });
    });
    $(".facet").each(function(index){
        console.log("facet ",self.conf.facets, index);
        var aux = self._getFacetData(index, self.conf.facets[index], newPatterns);
    });
    //  }
    self.conf.fetchOffset = 0;
    self._executeQuery();
  },
  
  _getFacetData: function(i, item, existingFacets){
    var self = this;
    var predicateLabels = "",
    labelVariable = "",
    sparqlLimit = 10,
    namedGraphStart = "",
    namedGraphEnd = "",
    thingVariable = '?thing',
    thingSelected =  thingVariable,
    orderByThing = thingVariable,
    selectedFacets = "";
    if(item.facetEntityCast !== undefined){
      thingVariable = thingVariable+'_1';
      thingSelected = item.facetEntityCast+'('+thingVariable+') AS ?thing';
      orderByThing = item.facetEntityCast+'('+thingVariable+')';
    }
    if(item.limit !== undefined){
      sparqlLimit = item.limit;
    }
    if(item.facetLabelPredicates !== undefined){
      predicateLabels = thingVariable+' '+item.facetLabelPredicates+' ?thingLabel .';
      labelVariable = '?thingLabel';
    }
    var filterByLanguage = "";
     if(item.facetLabelLanguage !== undefined){
      filterByLanguage = 'FILTER(lang(?thingLabel) = "'+item.facetLabelLanguage+'")';
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
        resourceTypes += "?x a "+self.conf.resourceType[i]+" . \n";
        if(self.conf.resourceType.length > 1){
          resourceTypes += "}";
        }
      }
    }
    var facetLimit = item.facetLimit || 100;
    var query = queryPrefixes+
    'SELECT DISTINCT '+thingSelected+' '+labelVariable+' WHERE { \
      '+namedGraphStart+'\
      '+resourceTypes+' ?x '+item.facetPredicates[0]+' '+thingVariable+' . '+selectedFacets+'\
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
          options = "";
          $.each(data.results.bindings, function(index, value){
              var label = value.thing.value;
              if(value.thingLabel !== undefined){
                label = value.thingLabel.value;
              }
              options += '<option value="'+value.thing.value+'" data-name="'+label+'">'+label+'</option>';
          });
          if(existingFacets == undefined){
            $(self.div+" #"+item.id).append('<button class="btn btn-mini clear-button" data-target="select-'+item.id+'">clear</button><select multiple class="select-facet facet" size="10" id="select-'+item.id+'">'+options+'</select>');
          }
          var currentSelection = new Array();
          $(self.div+" #select-"+item.id+" option:selected")
          .each(function(i){currentSelection.push($(this).val());});
          $(self.div+" #select-"+item.id).html(options);
          $.each(currentSelection, function(i, previouslySelected){$(self.div+" #select-"+item.id+" option[value='"+previouslySelected+"']").attr("selected", true)});
          if(existingFacets == undefined){
            $(self.div+' #waiting-'+item.id).addClass('hide');
            //Select values in case they are indicated in hash
            self._updateFacetFromHash(item.id);
            if(++self.conf.facetsLoaded == self.conf.facets.length){
              $(self.div+" .select-facet option:first").trigger('change');
            }
          }
        }
    });
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
  },
  
  _renderResults: function(data, conf){
    options = "";
    console.log(data);
    if(data.results.bindings.length > 0){$("#next").removeClass('disabled');}
    var thing = conf.query.variables[0],
        thingTitle = conf.query.variables[1],
        thingDescription = conf.query.variables[2];
    $.each(data.results.bindings, function(index, val){
        if(index == conf.fetchLimit){$("#next").removeClass('disabled'); return false;}
        $("#farrahResults").append('<div class="well"> \
          <div style="display:block;width:100%;margin-bottom:20px"> \
          <h3> \
          <a href="'+val.thing.value+'">'+
          ((val.thingTitle.value != undefined)?val.thingTitle.value:val.thing.value)+'</a> \
          </h3> \
          <p>'+((val.thingDescription !== undefined)?val.thingDescription.value:"")+'</p> \
          </div>');
    });
        if(data.results.bindings.length < conf.fetchLimit){$("#next").addClass('disabled');}
  }
  
}

