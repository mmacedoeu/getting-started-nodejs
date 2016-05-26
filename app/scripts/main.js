/* eslint-env browser */
(function() {
  'use strict';


  // Your custom JavaScript goes here
var definitions = {};

getpartidos();
getvotacao();

L.TopoJSON = L.GeoJSON.extend({  
  addData: function(jsonData) {    
    if (jsonData.type === "Topology") {
      for (var key in jsonData.objects) {
        var geojson = topojson.feature(jsonData, jsonData.objects[key]);
        L.GeoJSON.prototype.addData.call(this, geojson);
      }
    }    
    else {
      L.GeoJSON.prototype.addData.call(this, jsonData);
    }
  }  
});

var mymap = L.map('mapid').setView([-15.62, -60.25 ], 4);
var topoLayer = new L.TopoJSON();

function checkStatus(response) {
  if (response.status >= 200 && response.status < 300) {
    return response
  } else {
    var error = new Error(response.statusText)
    error.response = response
    throw error
  }
}

function parseJSON(response) {
  return response.json()
} 

function getpartidos() {
  fetch('resource/partidos.json', {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
    })
    .then(checkStatus)
    .then(parseJSON)
    .then(function(data) {
//      console.log('request succeeded with JSON response', data);
      definitions['partidos'] = data;

      if (definitions['resultado'] && !definitions['indexMun']) {
        computeIndexMun();
      }

    }).catch(function(error) {
      console.log('request failed', error)
    });  
}
  
function getvotacao() {
  fetch('resource/resultado-1-turno.json', {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
    })
    .then(checkStatus)
    .then(parseJSON)
    .then(function(data) {
//      console.log('request succeeded with JSON response', data);
      definitions['resultado'] = data;

      if (definitions['partidos'] && !definitions['indexMun']) {
        computeIndexMun();
      }
      
    }).catch(function(error) {
      console.log('request failed', error)
    });
}

function exterior(elem) {
  for (var i = 0; i < elem.length; i++) {
    if (typeof elem[i] === 'string' || elem[i] instanceof String) {
      if ("Exterior" === elem[i]) {
        return true;
      } 
    } 
  }
  return false;
}

function getPercPV(elem) {
  for (var i = 6; i < elem.length; i++) {
    var mun = elem[i];
    var partido = mun[0];
    if (partido === "PV") {
      return parseFloat(mun[3]);
    }
  }
  return 0.0;
}

function computeIndexMun() {
  var index = {};
  definitions['indexMun'] = index;
  var resultado = definitions['resultado'];
  var partidos = definitions['partidos'];
  var currentLocation = window.location.pathname;
  console.log(currentLocation);
  var toncor = "cor_media"; // cor_media, cor_forte, cor_fraca

  if (currentLocation.indexOf("pv") < 0) { //geral
  for (var i = 0; i < resultado.length; i++) {
    var elem = resultado[i];
    if (Array.isArray(elem) && 'MU' === elem[2] && Array.isArray(elem[6])) {
      var partido = elem[6][0]; // presupoe-se que já se encontra ordenado de forma decrescente
      var codMun = elem[1];
      if (typeof partido === 'string' || partido instanceof String) {
        var cor = partidos[partido][toncor];
        index[codMun] = cor;
      }
    } else { // estados e exterior
      console.log(elem);
    }
  } 

  } else { // pv
  var consolidado = {};

  for (var i = 0; i < resultado.length; i++) {
    var elem = resultado[i];
    if (Array.isArray(elem) && 'MU' !== elem[2] ) { // Computa os subtotais por estado excluindo exterior
      if (!exterior(elem)){
        for (var x = 4; x < elem.length; x++) {
          var estado = elem[x];
          var partido = estado[0];
          var votos = estado[2];

          if (consolidado[partido]) {
            consolidado[partido] += votos;
          } else {
            consolidado[partido] = votos;
          }
        }
      }
    } 
  }

  console.log(consolidado);

  var totalvotos = 0;
  for(var partido in consolidado) {
    totalvotos += consolidado[partido];
  }

  console.log(totalvotos);

  var percpv = 100 * consolidado["PV"] / totalvotos;
  var perc50 = percpv * 0.5;
  var percforte = percpv +  perc50;
  var percfraco = percpv - perc50;

  console.log(percpv);
  console.log(percforte);
  console.log(percfraco);    

  for (var i = 0; i < resultado.length; i++) {
    var elem = resultado[i];
    if (Array.isArray(elem) && 'MU' === elem[2] && Array.isArray(elem[6])) {
      var codMun = elem[1];
      var perc = getPercPV(elem);
      toncor = "cor_media";

      if (perc > percforte) {
        toncor = "cor_forte";
      } else if (perc < percfraco) {
        toncor = "cor_fraca";
      }

      console.log(toncor);
      var cor = partidos["PV"][toncor];
      index[codMun] = cor;
    }
  }   


  }

  definitions["MunDone"] = true;

  if (definitions["topoData"] && !definitions["done"]) {
    console.log("topoData first");
    addTopoData(definitions["topoData"]);
  }

}

$.getJSON('resource/brasil.json').done(addTopoData);

function addTopoData(topoData){ 
  definitions["topoData"] = topoData;

  if (definitions["MunDone"]) {
    definitions["done"] = false;
    topoLayer.addData(topoData);
    topoLayer.addTo(mymap);
    topoLayer.eachLayer(handleLayer);

    definitions["done"] = true;
  } else {
    console.log("not done");
  }
}


function handleLayer(layer){
        //console.log(layer);
        var codMun = layer.feature.properties["CD_GEOCODM"];
        var indexMun = definitions["indexMun"];


        //var randomValue = Math.random(),
        // f = chroma.scale('Spectral'),
        var  fillColor = '#' + indexMun[codMun];
          
        layer.setStyle({
          fillColor : fillColor
          , fillOpacity: 1
          , color: fillColor
          , weight:1
          , opacity:.5
        });
}


    L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token=pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpandmbXliNDBjZWd2M2x6bDk3c2ZtOTkifQ._QA7i5Mpkd_m30IGElHziw', {
      maxZoom: 18,
      attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, ' +
        '<a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, ' +
        'Imagery © <a href="http://mapbox.com">Mapbox</a>',
      id: 'mapbox.streets'
    }).addTo(mymap);

})();
