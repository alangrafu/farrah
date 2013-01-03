function dateFarrahWidget(elem, data){
  var id=$(elem).attr("id");  
  var dataArray = data.results.bindings;
  var maxValue = new Date(Math.max.apply(Math, dataArray.map(function(d){return new Date((d["var_"+id+"Label"] !== undefined)?d["var_"+id+"Label"].value:d["var_"+id].value)}))),
  minValue = new Date(Math.min.apply(Math, dataArray.map(function(d){return new Date((d["var_"+id+"Label"] !== undefined)?d["var_"+id+"Label"].value:d["var_"+id].value)})));
  elem.append("<div id='slider_"+id+"' class='facet' data-widget='date'></div><div id='amount-"+id+"'></div>");
  $( "#slider_"+id ).slider({
      range: true,
      min: minValue.getTime(),
      max: maxValue.getTime(),
      values: [ minValue.getTime(), maxValue.getTime() ],
      slide: function( event, ui ) {
        $( "#amount-"+id ).html( "<span style='float:left;'>" +  ($.datepicker.formatDate('yy-mm-dd', new Date(ui.values[ 0 ]))) + "</span>"+
          "<span style='float:right;'>"  + ($.datepicker.formatDate('yy-mm-dd', new Date(ui.values[1]))) + "</span>");
      },
      stop: function( event, ui ){$( "#slider_"+id ).trigger('change')},
      
  });
  $( "#amount-"+id ).html( "<span style='float:left;'>" + ($.datepicker.formatDate('yy-mm-dd', new Date($("#slider_"+id ).slider( "values", 0)))) + "</span>"+
    "<span style='float:right;'>"  + ($.datepicker.formatDate('yy-mm-dd', new Date($( "#slider_"+id ).slider( "values", 1 )))) + "</span>");
}

function updateDateFarrahWidget(parentElem, data){
  var id = parentElem;
  var slider = $("#slider_"+parentElem);
  var dataArray = data.results.bindings;
  var maxValue = new Date(Math.max.apply(Math, dataArray.map(function(d){return new Date((d["var_"+id+"Label"] !== undefined)?d["var_"+id+"Label"].value:d["var_"+id].value)}))),
  minValue = new Date(Math.min.apply(Math, dataArray.map(function(d){return new Date((d["var_"+id+"Label"] !== undefined)?d["var_"+id+"Label"].value:d["var_"+id].value)})));
  //slider.slider( "option", "min", minValue );
  //slider.slider( "option", "max", maxValue );
  //slider.slider( "option", "values", [minValue.getTime(), maxValue.getTime()] );
}

function getPatternsDateFarrahWidget(elem, facetConf){
  var newPatterns =  new Array(),
  slider = $("#"+elem),
  filter = "",
  objVar = $.datepicker.formatDate('yy-mm-dd', new Date(slider.slider( "option", "min"))),
  randomVar = '?var_'+elem.replace("slider_", "");
  delimiter = '"',
  currentValue = Math.min.apply(Math, slider.slider( "option", "values"));
  
  if(facetConf.facetEntityCast !== undefined){
    randomVar = randomVar+'_1';
  }
  
  if(facetConf.facetEntityCast !==undefined){
    delimiter = " ";
    objVar = randomVar;
    filter = "FILTER("+objVar+" >= \""+$.datepicker.formatDate('yymmdd', new Date(currentValue))+"\"^^"+facetConf.facetEntityCast+")";
  }
  var lang = (facetConf.facetLabelLanguage!==undefined)?"@"+facetConf.facetLabelLanguage:"";
  var newPattern = filter;
  
  newPatterns.push(newPattern);
  currentValue = Math.max.apply(Math, slider.slider( "option", "values"));
  filter = "", objVar = $.datepicker.formatDate('yy-mm-dd', new Date(currentValue)), delimiter = '"';
  if(facetConf.facetEntityCast !==undefined){
    objVar = randomVar;
    delimiter = " ";
    filter = "\n FILTER("+objVar+" <= \""+$.datepicker.formatDate('yymmdd', new Date(currentValue))+"\"^^"+facetConf.facetEntityCast+")";
  }
  newPattern = '?thing '+facetConf.facetPredicates[0] +' '+delimiter+ objVar + delimiter+'. '+filter;
  
  newPatterns.push(newPattern);
  return newPatterns;
}

function facetPatternDateFarrahWidget(item){
  var objVar = '?var_'+item.id.replace("slider_", "");
  if(item.facetEntityCast !== undefined){
    objVar = objVar+'_1';
  }
  return '?thing '+item.facetPredicates[0]+' '+objVar+' .';
}

$(".clear-button-slider").on("click", function(e){
  var slider = $("#slider_"+e.target.attr("data-target"));
  slider.slider( "option", "values", [slider.slider( "option", "min"), slider.slider( "option", "max")])

})
