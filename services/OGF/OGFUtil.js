function OGFUtil(){

var ogf = {
    config: {
        API_URL:        'http://opengeofiction.net/',
        TILES_URL:      'http://tile.opengeofiction.net/',
        TILESERVER_URL: 'http://tile.opengeofiction.net/',
        WIKI_URL:       'http://wiki.opengeofiction.net/',
        NOMINATIM_URL:  'http://nominatim.opengeofiction.net:8080/',
        ROUTING_URL:    'http://route.opengeofiction.net:5000/',
    },
    icons: { red: null, yellow: null, green: null, blue: null },
};

var linkText = {
    ogfCopy:     '&copy; <a href="https://opengeofiction.net">OpenGeofiction</a> contributors',
    osmCopy:     '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>',
    cc_by_sa:    '(<a href="https://creativecommons.org/licenses/by-sa/3.0/">CC-BY-SA</a>)',
    cc_by_nc_sa: '(<a href="https://creativecommons.org/licenses/by-sa/3.0/">CC-BY-NC-SA</a>)',
};

if( L ){
    for( var color in ogf.icons ){
        ogf.icons[color] = L.icon( {iconUrl: ogf.config.TILES_URL + 'util/marker-'+ color +'.png', iconAnchor: [12,41]} );
    }

    L.Control.InfoBox = L.Control.extend( {
        options: {
            position: 'bottomleft'
        },
    //  initialize: function( options ){
    //      // constructor
    //  },
        onAdd: function( map ){
            var div = L.DomUtil.create( 'div', 'infobox-container' );
            div.style.backgroundColor = '#FFFFFF';
            div.style.padding = '5px 10px 5px 10px';
            div.innerHTML = this.options.text;
            return div;
        },
        onRemove: function( map ){
            // when removed
        }
    } );

    L.control.infoBox = function( id, options ){
        return new L.Control.InfoBox( id, options );
    }
}

//--------------------------------------------------------------------------------------------------

ogf.map = function( leafletMap, options ){
    var self = {};
    self._map = leafletMap;
//	if( leafletMap.attributionControl )  leafletMap.attributionControl.setPrefix( '' );

    var baseMapsAvailable = {
        Standard: {
            tileUrl: ogf.config.TILES_URL +'/osmcarto/{z}/{x}/{y}.png',
            maxZoom: 19,
            attribution: linkText.ogfCopy + ' ' + linkText.cc_by_nc_sa,
        },
        TopoMap: {
            tileUrl: ogf.config.TILES_URL +'/topomap/{z}/{x}/{y}.png',
            maxZoom: 17,
            attribution: 'map data: ' + linkText.ogfCopy + ' ' + linkText.cc_by_nc_sa +
                ' | map style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a> ' + linkText.cc_by_sa,
        },
        Histor: {
            tileUrl: ogf.config.TILES_URL +'/tiles-histor/{z}/{x}/{y}.png',
            maxZoom: 18,
            attribution: 'map data: ' + linkText.ogfCopy + ' ' + linkText.cc_by_nc_sa +
                ' | map style: &copy; <a href="http://opengeofiction.net/user/histor">histor</a> - <a href="http://wiki.opengeofiction.net/wiki/index.php/OGF:Histor-style">more info</a>',
        },
        Roantra: {
            tileUrl: ogf.config.TILES_URL +'/planet/Roantra/{z}/{x}/{y}.png',
            maxZoom: 14,
            attribution: 'Copyright &copy; Thilo Stapff 2014',
        },
        OpenStreetMap: {
            tileUrl: 'http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
            maxZoom: 19,
            attribution: linkText.osmCopy,
        },
        OpenTopoMap: {
            tileUrl: 'http://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
            maxZoom: 17,
            attribution: 'map data: ' + linkText.osmCopy + ', <a href="http://viewfinderpanoramas.org/">SRTM</a>' +
                ' | map style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a> ' + linkText.cc_by_sa,
        },
    };
    var overlaysAvailable = {
        'Coastline Errors': './CoastlineErrors.js',
        'Territories':      './Territories.js',
    };
    var baseMapsEnabled = options.layers   || [ 'Standard', 'TopoMap', 'Histor' ];
    var overlaysEnabled = options.overlays || [];

    if( ! Array.isArray(baseMapsEnabled) )  baseMapsEnabled = baseMapsEnabled.split(/,/);
    if( ! Array.isArray(overlaysEnabled) )  overlaysEnabled = overlaysEnabled.split(/,/);

    var baseMapActive = options.layer || baseMapsEnabled[0];
    var baseMaps = {}, overlayMaps = (overlaysEnabled.length > 0)? {} : null, hOverlaysActive = {}, i, keyB, keyO;

    for( i = 0; i < baseMapsEnabled.length; ++i ){
        keyB = baseMapsEnabled[i];
        if( keyB.match(/^\+/) ){
            keyB = keyB.replace(/^\+/,'');
            baseMapActive = keyB;
        }
        var layerOpt = baseMapsAvailable[keyB];
        baseMaps[keyB] = L.tileLayer( layerOpt.tileUrl, layerOpt );
    }

    for( i = 0; i < overlaysEnabled.length; ++i ){
        keyO = overlaysEnabled[i];
        if( keyO.match(/^\+/) ){
            keyO = keyO.replace(/^\+/,'');
            hOverlaysActive[keyO] = true;
        }
        overlayMaps[keyO] = L.layerGroup();
    }

    var overlayDefinitions = {};
    if( options.overlaydef ){
//      console.log( "options.overlaydef <" + options.overlaydef + ">" );  // _DEBUG_
        overlayDefinitions = (typeof options.overlaydef === 'string')? JSON.parse(options.overlaydef) : options.overlaydef;
//      console.log( "overlayDefinitions = " + JSON.stringify(overlayDefinitions,null,"  ") );  // _DEBUG_
    }

    var hControls = {};
    var onOverlayAdd = function( name, layer ){
        if( overlayDefinitions[name] ){
            if( overlayDefinitions[name]['function'] ){
                var func = ogf[overlayDefinitions[name]['function']];
                func( layer, overlayDefinitions[name].param );
            }else{
                var hObjects = {};
                ogf.loadOverlay( hObjects, 0, overlayDefinitions[name], function(hObjects){
                    hControls[name] = ogf.drawLayerObjects( hObjects, layer, self._map );
                } );
            }
        }
    };

    self._map.on( 'overlayadd', function(ev){
        onOverlayAdd( ev.name, ev.layer );
    } );
    self._map.on( 'overlayremove', function(ev){
        var name = ev.name, layer = ev.layer;
        layer.clearLayers();
        if( hControls[name] ){
            for( var i = 0; i < hControls[name].length; ++i ){
                hControls[name][i].remove();
            }
        }
    } );

    L.control.layers( baseMaps, overlayMaps ).addTo( self._map );
    baseMaps[baseMapActive].addTo( self._map );

    for( keyO in hOverlaysActive ){
        overlayMaps[keyO].addTo( self._map );
//      onOverlayAdd( keyO, overlayMaps[keyO] );
    }

    return self;
};


ogf.getApplyStruct = function( info, cb ){
//	console.log( "info = " + JSON.stringify(info,null,"  ") );  // _DEBUG_
	if( info.url ){
        ogf.runRequest( 'GET', info.url, '', function(data){
            try{
                var struct = JSON.parse( data );
                cb( struct );
            }catch( err ){
                console.log( 'ERROR ' + info.url + ' ' + err.toString() );
                return;
            }
        } );
	}else{
        cb( info.apply );
	}
}

ogf.loadOverlay = function( hObjects, idx, loadInfo, cb ){
    var info = loadInfo[idx];

    ogf.getApplyStruct( info, function(struct){
        var struct;
        if( Array.isArray(struct) && info.key ){
            struct = ogf.mapArray( struct, info.key );
        }
        if( info.wrap ){
            for( var k1 in struct ){
                var elem = {};
                elem[info.wrap] = struct[k1];
                struct[k1] = elem;
            }
        }
        if( idx === 0 ){
            for( var k2 in struct ){
                hObjects[k2] = struct[k2];
            }
        }else{
            ogf.applyMap( hObjects, struct, info );
        }
        if( idx+1 < loadInfo.length ){
            ogf.loadOverlay( hObjects, idx+1, loadInfo, cb );
        }else{
            cb( hObjects );
        }
    } );
};

ogf.mapArray = function( array, key ){
    var struct = {};
    for( var i = 0; i < array.length; ++i ){
        var item = array[i];
        struct[item[key]] = item;
    }
    return struct;
};

ogf.applyMap = function( hObjects, hMap, info ){
	var key, keyA, keyS, obj;
	if( info.apply && ! info.select ){
        for( key in hObjects ){
            obj = hObjects[key];
            for( keyA in info.apply ){
                obj[keyA] = info.apply[keyA];
            }
        }
        return;
	}

    var select = info.select || '';
    if( ! Array.isArray(select) )  select = [ select ];

    for( var i = 0; i < select.length; ++i ){
        var sel = select[i];
        for( key in hObjects ){
            obj = hObjects[key];
            var mapKey = sel ? obj[sel] : key;
            if( ! Array.isArray(mapKey) )  mapKey = [ mapKey ];
            for( var j = 0; j < mapKey.length; ++j ){
                var mapObj = hMap[mapKey[j]];
                if( mapObj ){
                    for( keyS in mapObj ){
                        if( ! obj[keyS] )  obj[keyS] = mapObj[keyS];
                    }
                }
            }
        }
    }
};

ogf.drawLayerObjects = function( objects, layer, map ){
//	console.log( "objects = " + JSON.stringify(objects,null,"  ") );  // _DEBUG_
    var controls = [];
    if( Array.isArray(objects) ){
        for( var i = 0; i < objects.length; ++i ){
            ogf.drawLayerObject( objects[i], i, layer, map, controls );
        }
    }else{
        for( var key in objects ){
            ogf.drawLayerObject( objects[key], key, layer, map, controls );
        }
    }
    return controls;
};

ogf.drawLayerObject = function( obj, key, layer, map, controls ){
//	console.log( "hObjects = " + JSON.stringify(hObjects,null,"  ") );  // _DEBUG_
    var popupOptions = {maxWidth: 600};
    var text = ogf.evalObjectText( obj, obj.text, key );

    if( obj.polygon ){
        var coordList = obj.polygon;
        var options = {
            color:       obj.color       || '#111111',
            weight:      obj.weight      || 1,
            fillOpacity: obj.fillOpacity || .5,
            fillColor:   obj.fillColor   || '#999999',
        };
        L.polygon( coordList, options ).addTo( layer ).bindPopup( text, popupOptions );
    }else if( obj.icon ){
        var options = {};
        if( ogf.icons[obj.icon] ){
            options.icon = ogf.icons[obj.icon];
        }else{
			var iconOpt = {iconUrl: ogf.config.TILES_URL +'data/icons/'+ obj.icon};
			if( obj.iconAnchor )  iconOpt.iconAnchor = obj.iconAnchor;
            options.icon = L.icon( iconOpt );
        }
        L.marker( [obj.lat,obj.lon], options ).addTo( layer ).bindPopup( text, popupOptions );
    }else if( obj.control && obj.control === 'InfoBox' ){
        var infoBox = L.control.infoBox( {text: text} )
        infoBox.addTo( map );
        controls.push( infoBox );
    }
//	delete obj.polygon; if( obj.icon )  console.log( "obj = " + JSON.stringify(obj,null,"  ") );  // _DEBUG_
};

ogf.evalObjectText = function( obj, template, key ){
    if( ! template )  return "";
    if( Array.isArray(template) ){
        template = template.join('');
    }
    var text = template.replace( /%([#\w]+)%/g, function(x,x1){
		var val = (x1 === '#')? key : obj[x1];
        if( val ){
            if( Array.isArray(val) ){
                var str = '';
                for( var i = 0; i < val.length; ++i ){
//					str += obj['text.'+val[i]];
                    str += ogf.evalObjectText( obj, obj['text.'+val[i]], key );
                }
                val = str;
            }
        }else{
            val = ogf.config[x1];
        }
        return val || '';
    } ); 	
    text = text.replace( /(<hr>)+/g, '<hr>' );
    text = text.replace( /<hr>$/, '' );

    return text;
};



ogf.parseUrlParam = function( str ){
    var hParam = {};
    var regex = /[?&](\w+)=([^?&]*)/g;
    var match;
    while( (match = regex.exec(str)) != null ){
        var val = decodeURIComponent( match[2] );
        hParam[match[1]] = val;
    }
    return hParam;
};

ogf.setUrlLocation = function( map, url, opt ){
    if( ! url )  url = document.URL;
    if( ! opt )  opt = {};

	var map2;
    if( Array.isArray(map) ){
        map2 = map[1];
        map  = map[0];
    }
    
    var hParam = ogf.parseUrlParam( url );
//  console.log( "hParam = " + JSON.stringify(hParam,null,"  ") );  // _DEBUG_
    if( map && hParam.map ){
        var loc = hParam.map.split('/');
        var zoom = parseFloat(loc[0]), lat = parseFloat(loc[1]), lon = parseFloat(loc[2]);
        if( opt.method === 'MapboxGL' ){
            map.setZoom( zoom );
            map.setCenter( [lon,lat] );
        }else{
            map.setView( [lat,lon], zoom );
        }
    }
    if( map2 && hParam.map2 ){
        var loc2 = hParam.map2.split('/');
        var lat2 = parseFloat(loc[1]), lon2 = parseFloat(loc[2]);
        map2.panTo( [lat2,lon2] );
    }
    if( opt.layers ){
        var layer = hParam.layer || 'Standard';
        opt.layers[layer].addTo( map );
    }

    if( opt.fields ){
        for( var i = 0; i < opt.fields.length; ++i ){
            var field = opt.fields[i];
            var elem = document.getElementById( field );
            if( field in hParam )  elem.value = hParam[field]
        } 
    }

    var moveEnd = function(){
        var hOut = {};
        var zoom   = map.getZoom();
        var center = map.getCenter();
        var query  = 'map=' + zoom + '/' + center.lat.toFixed(5) + '/' + center.lng.toFixed(5);

        if( map2 ){
            var center2 = map2.getCenter();
            query += '&map2=' + 'x/' + center2.lat.toFixed(5) + '/' + center2.lng.toFixed(5);
        }

//		query += '&layer=' + '';
        if( opt.fields ){
            for( var i = 0; i < opt.fields.length; ++i ){
                var field = opt.fields[i];
//              console.log( "field <" + field + ">" );  // _DEBUG_
                var elem = document.getElementById( field );
//              console.log( "elem <" + elem + ">" );  // _DEBUG_
                query += '&' + field + '=' + encodeURIComponent(elem.value);
            }
        }
        for( var key in hOut ){
            query += key + '='
        }

        var newUrl = document.URL.replace( /\.html.*/, '.html?' + query );
//      console.log( "newUrl <" + newUrl + ">" );  // _DEBUG_
        window.history.pushState( '', '', newUrl );
    };
    setTimeout( function(){  // workaround for "set map center and zoom first" error
        map.on( 'moveend', moveEnd );
        if( map2 )  map2.on( 'moveend', moveEnd );
    }, 100 );

    return hParam;
};



ogf.runRequest = function( method, url, data, cb ){
    try{
        var req = new XMLHttpRequest();
        req.open( method, url, true );
        req.onreadystatechange = function(){
            if( req.readyState == 4 && req.status == 200 ){
                cb( req.responseText );
            }
        };
        if( data ){
            req.send( data );
        }else{
            req.send();
        }

    }catch( e ){
        alert( e.toString() );
    }
};

ogf.getOverpassData = function( query, opt, cb ){
    if( typeof opt === 'function' ){
        cb = opt;
        opt = {};
    }
    var url = 'http://osm3s.opengeofiction.net/api/interpreter';
    query = "[out:json];\n" + query;
    query += (opt.max)? ("\nout " + opt.max + ";") : "\nout;"
    ogf.runRequest( 'POST', url, query, function(data){
        var struct = JSON.parse( data );
//		console.log( "struct = " + JSON.stringify(struct,null,"  ") );  // _DEBUG_
        cb( struct );
    } );
};

ogf.typeMap = function( struct ){
    var hObj = {};
    ['node','way','relation'].forEach( function(type){
//      hObj[type] = _.keyBy( _.filter( struct.elements, function(x){
//          return x.type === type; 
//      } ), 'id' );
        hObj[type] = ogf.keyBy( struct.elements.filter( function(x){
            return x.type === type; 
        } ), 'id' );
    } );
    return hObj;
}

ogf.keyBy = function( array, key ){
    var hObj = {};
    array.forEach( function(x){  hObj[x[key]] = x;  } );
    return hObj;
}



ogf.getRelationData = function( relId, cb ){
    var query;
    relId = '' + relId;
    var wayId;
    if( relId.match(/^\d+$/) ){
        query = '( relation(' + relId + '); >;);';
    }else if( relId.match(/^[wW]\d+$/) ){
        wayId = parseInt( relId.substr(1) );
        query = '( way(' + wayId + '); >;);';
    }else if( relId.match(/^\d+:/) ){
        var info = relId.split(':');
        var level = info[0];
        var name  = info[1];
        var type  = (info[2] && info[2] === 'L')? 'land_area' : 'boundary';
        query = '( relation["name"="' + name + '"]["admin_level"="' + level + '"]["' + type +'"="administrative"]; >; );';
    }else{
        cb( null );
    }
    console.log( "query <" + query + ">" );  // _DEBUG_
    ogf.getOverpassData( query, function(struct){
        struct = ogf.typeMap( struct );
        cb( struct );
    } );
};



//--------------------------------------------------------------------------------------------------

ogf.boundaryRelation = function(){



}

//---begin publicTransport ---------------------------------------------------------------------------------------


ogf.publicTransport = function( layer, routeIds ){
    console.log( "routeIds = " + JSON.stringify(routeIds,null,"  ") );  // _DEBUG_
    var hInfo = {layer: layer};
	loadRouteData( routeIds, function(ctx){
        routeIds.forEach( function(relId){
            var rel = ctx.relation[relId];
            drawRouteMasterLines( rel, ctx, hInfo );
        } );
		routeIds.forEach( function(relId){
            var rel = ctx.relation[relId];
            drawRouteMasterStations( rel, ctx, hInfo );
        } );
    } );
}

function drawRouteMasterLines( rel, ctx, hInfo ){
	var routes   = rel.members.filter( function(x){ return x.type === 'relation' && (x.role === '' || x.role === 'route'); } );
	hInfo.color  = rel.tags.colour || rel.tags.color || '#000000';
	if (routes.length > 0){
        routes.forEach( function(mR){
            drawRoute( ctx.relation[mR.ref], ctx, hInfo );
        } );
	} else {
        drawRoute( rel, ctx, hInfo );
	}
}

function drawRouteMasterStations( rel, ctx, hInfo ){
	var routes   = rel.members.filter( function(x){ return x.type === 'relation' && (x.role === '' || x.role === 'route'); } );
	hInfo.color  = rel.tags.colour || rel.tags.color || '#000000';
	if (routes.length > 0){
        routes.forEach( function(mR){
            drawStations( ctx.relation[mR.ref], ctx, hInfo );
        } );
	} else {
        drawStations( rel, ctx, hInfo );
	}
}

function drawRoute( rel, ctx, hInfo ){
    var closedWays = ogf.buildWaySequence( ctx, rel.id, null, {role: '^.*$', copy: true} );
    closedWays.forEach( function(way){
//      console.log( "way = " + JSON.stringify(way,null,"  ") );  // _DEBUG_
        var line = ogf.wayPoints( way, ctx );

//      var popupText = 'Way <a href="' + ogf.config.API_URL + 'way/' + way.id + '">' + way.id + '</a>';
        var popupText = objText(rel);
		var color = hInfo.color || hRoutes[rel.id] || '#000000';
        // var color = hInfo.color || hRoutes[rel.id];
        L.polyline( line, {color: color, weight: 5} ).addTo( hInfo.layer ).bindPopup( popupText );
    } );
}

function drawStations( rel, ctx, hInfo) {
	var stations = rel.members.filter( function(x){ return x.type === 'node'     && (x.role === 'station' || x.role === 'stop' || x.role === 'forward:stop' || x.role === 'backward:stop'); } );
	var color = hInfo.color || hRoutes[rel.id] || '#000000';
    stations.forEach( function(mS){
        var node = ctx.node[mS.ref];
		var popupText = objText(node, rel);
        //var popupText = objTextStation(node, rel);
        L.circleMarker( [node.lat, node.lon], {radius: 5, color: color, weight: 2, fillColor: '#FFFFFF', fillOpacity: 1} ).addTo( hInfo.layer ).bindPopup( popupText );
    } );	
}

function loadRouteData( routeIds, cb ){
//  query = 'relation["route"="railway"]["name"~"FFBN Tren Suburbano"]; (._;>;);';
    query = routeIds.map( function(x){ return 'relation('+x+')'; } ).join(';');
    query = '(' + query + '); (._;>>;);';
    console.log( "query <" + query + ">" );  // _DEBUG_

    ogf.getOverpassData( query, function(ctx){
        ctx = ogf.typeMap( ctx );
//      console.log( "ctx = " + JSON.stringify(ctx,null,"  ") );  // _DEBUG_
        cb( ctx );
    } );
}

function objText( obj ){
    var typeText = obj.type.substr(0,1).toUpperCase() + obj.type.substr(1); 
    var objText = '<b>' + obj.tags.name + '</b>';
    objText += '<br>' + typeText + ' <a href="' + ogf.config.API_URL + obj.type + '/' + obj.id + '">' + obj.id + '</a>';
    return objText;
}

/*
ogf.publicTransport = function( layer, routeIds ){
    console.log( "routeIds = " + JSON.stringify(routeIds,null,"  ") );  // _DEBUG_
	loadRouteData( routeIds, function(ctx){
        routeIds.forEach( function(relId){
            var rel = ctx.relation[relId];
            drawRouteMaster( rel, ctx, {layer: layer} );
        } );
    } );
}

function drawRouteMaster( rel, ctx, hInfo ){
	var routes   = rel.members.filter( function(x){ return x.type === 'relation'; } );
	hInfo.color  = rel.tags.colour || rel.tags.color || '#000000';
    hInfo.text   = objText(rel);
	if (routes.length > 0){
        routes.forEach( function(mR){
            drawRoute( ctx.relation[mR.ref], ctx, hInfo );
        } );
        routes.forEach( function(mR){
            drawStations( ctx.relation[mR.ref], ctx, hInfo );
        } );
	} else {
        drawRoute( rel, ctx, hInfo );
        drawStations( rel, ctx, hInfo );
	}
}

function drawRoute( rel, ctx, hInfo ){
    var closedWays = OGF.buildWaySequence( ctx, rel.id, null, {role: '^.*$', copy: true} );
    closedWays.forEach( function(way){
//      console.log( "way = " + JSON.stringify(way,null,"  ") );  // _DEBUG_
        var line = OGF.wayPoints( way, ctx );
//      var popupText = 'Way <a href="' + OGF.config.API_URL + 'way/' + way.id + '">' + way.id + '</a>';
        var popupText = hInfo.text || objText(rel);
		var color = hInfo.color || hRoutes[rel.id] || '#000000';
        // var color = hInfo.color || hRoutes[rel.id];
        L.polyline( line, {color: color, weight: 5} ).addTo( hInfo.layer ).bindPopup( popupText );
    } );
}

function drawStations( rel, ctx, hInfo) {
	var stations = rel.members.filter( function(x){ return x.type === 'node'     && (x.role === 'station' || x.role === 'stop' || x.role === 'forward:stop' || x.role === 'backward:stop'); } );
	var color = hInfo.color || hRoutes[rel.id] || '#000000';
    stations.forEach( function(mS){
        var node = ctx.node[mS.ref];
        var popupText = objText(node);
        L.circleMarker( [node.lat, node.lon], {radius: 5, color: color, weight: 2, fillColor: '#FFFFFF', fillOpacity: 1} ).addTo( hInfo.layer ).bindPopup( popupText );
    } );
}

function loadRouteData( routeIds, cb ){
//  query = 'relation["route"="railway"]["name"~"FFBN Tren Suburbano"]; (._;>;);';
    query = routeIds.map( function(x){ return 'relation('+x+')'; } ).join(';');
    query = '(' + query + '); (._;>>;);';
    console.log( "query <" + query + ">" );  // _DEBUG_

    OGF.getOverpassData( query, function(ctx){
        ctx = OGF.typeMap( ctx );
//      console.log( "ctx = " + JSON.stringify(ctx,null,"  ") );  // _DEBUG_
        cb( ctx );
    } );
}

function objText( obj ){
    var typeText = obj.type.substr(0,1).toUpperCase() + obj.type.substr(1); 
    var objText = '<b>' + obj.tags.name + '</b>';
    objText += '<br>' + typeText + ' <a href="' + OGF.config.API_URL + obj.type + '/' + obj.id + '">' + obj.id + '</a>';
    return objText;
}
*/

//--- end publicTransport -----------------------------------------------------------------------------------------------

ogf.wayPoints = function( way, ctx ){
	if( !(typeof way === 'object') )  way = ctx.way[way];
	var hNodes = ctx.node;
    var points = way.nodes.map( function(nodeId){
        var node = hNodes[nodeId];
        return {lat: node.lat, lng: node.lon};
    } );
    return points;
};

ogf.wayGeometry = function( points, latLonKeys ){
    var kLon = latLonKeys ? latLonKeys[0] : 'lng';
    var kLat = latLonKeys ? latLonKeys[1] : 'lat';
    var minLon = 180, maxLon = -180, minLat = 90, maxLat = -90, iMinLat = -1, iMaxLat = -1, iMinLon = -1, iMaxLon = -1;
    points.forEach( function(node,i){
        if( node[kLon] < minLon ){  minLon = node[kLon]; iMinLon = i; }
        if( node[kLon] > maxLon ){  maxLon = node[kLon]; iMaxLon = i; }
        if( node[kLat] < minLat ){  minLat = node[kLat]; iMinLat = i; }
        if( node[kLat] > maxLat ){  maxLat = node[kLat]; iMaxLat = i; }
    } );
    var lp = points.length - 1;
    var hInfo = {
        bbox: [ minLon, minLat, maxLon, maxLat ],
    };
    var iX = (iMinLon > 0 && iMinLon < lp)? iMinLon :
             (iMaxLon > 0 && iMaxLon < lp)? iMaxLon :
             (iMinLat > 0 && iMinLat < lp)? iMinLat :
             (iMaxLat > 0 && iMaxLat < lp)? iMaxLat : -1;
    if( iX >= 0 ){
        hInfo.orientation = (points[iX-1][kLon] - points[iX][kLon])*(points[iX+1][kLat] - points[iX][kLat]) - (points[iX-1][kLat] - points[iX][kLat])*(points[iX+1][kLon] - points[iX][kLon]);
    }
    return hInfo;
};

ogf.rectUnion = function( rA, rB ){
    if( ! rA )  return rB;
    if( ! rB )  return rA;
    var rNew = [ Math.min(rA[0],rB[0]), Math.min(rA[1],rB[1]), Math.max(rA[2],rB[2]), Math.max(rA[3],rB[3]) ];
    return rNew;
};

ogf.buildWaySequence = function( ctx, rel, hWays, hOpt ){
    if( ! hOpt )  hOpt = {};
    var repeatFlag = hWays ? true : false;
    console.log( '--- buildWaySequence --- repeatFlag=' + repeatFlag + ' opt=(' + JSON.stringify(hOpt) +')' );  // _DEBUG_

    if( typeof rel === 'string' )  rel = parseInt( rel );
    if( typeof rel === 'number' ){
        rel = ctx.relation[rel];
//      console.log( "rel = " + JSON.stringify(rel,null,"  ") );  // _DEBUG_
    }

    if( ! hWays ){
        var ways;
        if( rel ){
            var rxRole = new RegExp(hOpt.role) || /$/;
            ways = rel.members.filter( function(x){
                return (x.type === 'way' && x.role.match(rxRole));
            } );
            ways = ways.map( function(x){ return ctx.way[x.ref]; } );
            ways = ways.map( function(x){ return x; } );   // grep {defined} to allow handling incomplete relations
        }else{
            ways = ctx.way;
        }
        if( hOpt.copy ){
//          ways = ways.map( function(x){ return _.cloneDeep(x); } );
            ways = ways.map( function(x){ return JSON.parse(JSON.stringify(x)); } );
            ways = ways.filter( function(x){ return x; } );
        }
        hWays = ogf.keyBy( ways, 'id' );
//      console.log( "hWays <" + Object.keys(hWays).length + ">" );  // _DEBUG_
//      console.log( "hWays = " + JSON.stringify(hWays,null,"  ") );  // _DEBUG_
    }

    var ptStart = {}, ptEnd = {};
    var relOrder = hOpt.relOrder || null;

//  _.forEach( hWays, function(way,wayId){
    for( var wayId in hWays ){
        var way = hWays[wayId];
        if( way.nodes.length < 2 ){
            console.log( 'ERROR: Way consisting of single node: ' + way.id );
            return;
        }

        var idStart = way.nodes[0], idEnd = way.nodes[way.nodes.length-1];
        if( hOpt.relOrder )  relOrder[way.id] = [ way.id ];

        if( idStart === idEnd ){
            ptStart[idStart] = way;
        }else{
            if( (ptStart[idStart] || ptEnd[idEnd]) && ! hOpt.wayDirection ){
                var way2 = ptStart[idStart] || ptEnd[idEnd];
//              way2.nodes = _.reverse( way2.nodes );
                way2.nodes.reverse();
                if( hOpt.relOrder ){
//                  relOrder[way2.id] = _.reverse( relOrder[way2.id] );
                    relOrder[way2.id].reverse();
//                  my @relWays = reverse @{$relOrder{$id}};
//                  $relOrder{$relWays[0]} = delete $relOrder{$id};
                }
                var idS = way2.nodes[0], idE = way2.nodes[way2.nodes.length-1];
                delete ptStart[idE];
                delete ptEnd[idS];
                ptStart[idS] = ptEnd[idE] = way2;
            }
            if( ptEnd[idStart] ){
                way.nodes.shift();
                Array.prototype.push.apply( ptEnd[idStart].nodes, way.nodes );
                if( hOpt.relOrder ){
                    Array.prototype.push.apply( relOrder[ptEnd[idStart].id], relOrder[way.id] );
                    delete relOrder[way.id];
                }
                delete hWays[way.id];
                if( ! hOpt.copy )  delete ctx.way[way.id];
                way = ptEnd[idStart];
                delete ptEnd[idStart];
            }
            if( way.nodes[0] != way.nodes[way.nodes.length-1] ){
                if( ptStart[idEnd] ){
                    way.nodes.pop();
                    Array.prototype.push.apply( way.nodes, ptStart[idEnd].nodes );
                    if( hOpt.relOrder ){
                        Array.prototype.push.apply( relOrder[way.id], relOrder[ptStart[idEnd].id] );
                        delete relOrder[ptStart[idEnd].id];
                    }
                    delete hWays[ptStart[idEnd].id];
                    if( ! hOpt.copy )  delete ctx.way[ptStart[idEnd].id];
                    delete ptStart[idEnd];
                }
                ptStart[way.nodes[0]] = ptEnd[way.nodes[way.nodes.length-1]] = way;
            }
        }
    }

    if( hOpt.relOrder )  hOpt.relOrder = relOrder;
    if( ! repeatFlag )  ogf.buildWaySequence( ctx, rel || null, hWays, hOpt );

//  return hOpt.relOrder ? _.sortBy( _.values(relOrder), function(x){ return x.length; } ) : _.values(hWays);
    return hOpt.relOrder ? Object.values(relOrder).sort( function(a,b){ return a.length - b.length; } ) : Object.values(hWays);
};



ogf.geoArea = function( ctx, obj, bbox, pr ){
    if( ! pr ){
        var xMin = bbox[0], yMin = bbox[1], xMax = bbox[2], yMax = bbox[3];
        var lon0 = (xMax + xMin)/2;
//      pr = proj4('+proj=eck4 +lon_0=' + lon0 + ' +x_0=0 +y_0=0');
//      pr = proj4('+proj=sinu +lon_0=' + lon0 +' +x_0=0 +y_0=0');
//      pr = proj4('+proj=cea +lon_0=0 +lat_ts=0 +x_0=0 +y_0=0 +datum=WGS84 +ellps=WGS84 +units=m +no_defs');
        pr = proj4('+proj=cea +lon_0=0 +lat_ts=0 +x_0=0 +y_0=0 +datum=WGS84 +ellps=WGS84 +units=m +no_defs');
//      pr = proj4('+proj=aea +lat_1=36 +lat_2=-36 +lat_0=0 +lon_0=' + lon0 + ' +x_0=0 +y_0=0 +datum=WGS84 +ellps=WGS84');
    }

//  console.log( "obj = " + JSON.stringify(obj,null,"  ") );  // _DEBUG_
    if( typeof obj === 'number' ){
        obj = ctx.relation[obj];
    }

    if( obj.type === 'way' ){
        var way = obj;
        var iMax = way.nodes.length - 1;
//		if( way.nodes[0] != way.nodes[iMax] ){
//			console.log( 'ERROR geoArea: way is not closed (' + way.id + ')' );
//			console.log( 'end point: ' + way.nodes[iMax] );
//			throw 'error at node ' + way.nodes[iMax];
//		}
        if( way.nodes[0] != way.nodes[iMax] ){
            way.nodes.push( way.nodes[0] );
            ++iMax;
        }
        var geoArea = 0;
        for( var i = 0; i < iMax; ++i ){
            var nodeA = ctx.node[way.nodes[i]], nodeB = ctx.node[way.nodes[i+1]];
//          console.log( "nodeA = " + JSON.stringify(nodeA,null,"  ") );  // _DEBUG_
//          console.log( "nodeB = " + JSON.stringify(nodeB,null,"  ") );  // _DEBUG_
            var ptA = pr.forward( [nodeA.lon,nodeA.lat] );
            var ptB = pr.forward( [nodeB.lon,nodeB.lat] );
//          console.log( "ptA = " + JSON.stringify(ptA,null,"  ") );  // _DEBUG_
//          console.log( "ptB = " + JSON.stringify(ptB,null,"  ") );  // _DEBUG_
            var ap = (ptA[0] * ptB[1] - ptA[1] * ptB[0]);
//          console.log( "ap <" + ap + ">" );  // _DEBUG_
            geoArea += ap;
//          console.log( "geoArea <" + geoArea + ">" );  // _DEBUG_
        }
        return Math.abs(geoArea) / 2000000;
    }else if( obj.type === 'relation' ){
        var rel = obj;
        var aRelOuter = ogf.buildWaySequence( ctx, obj, null, {role: 'outer'} );
        if( aRelOuter.length === 0 ){
            throw "no member way with role=outer\n";
        }
        var aRelInner = ogf.buildWaySequence( ctx, obj, null, {role: 'inner'} );
        var area = 0;
        aRelOuter.forEach( function(x){ area += ogf.geoArea(ctx,x,bbox); } );
        aRelInner.forEach( function(x){ area -= ogf.geoArea(ctx,x,bbox); } );
        return area;
    }else{
        throw 'ERROR geoArea: Unsupported object type: ' + obj.type;
        return 0;
    }
}


//--------------------------------------------------------------------------------------------------



//var R = 6372798.2;      // earth radius, average
var R = 6378137;          // earth radius, equator
var C = R * 2 * Math.PI;  // earth circumference


ogf.zoom2mpp = function( zoom, lat ){
    var y = lat * Math.PI / 180;
    var mpp = C * Math.cos(y) / (256 * Math.pow(2,zoom));
    return mpp;
}

ogf.mpp2zoom = function( mpp, lat ){
    var y = lat * Math.PI / 180;
    var zoom = Math.log( (C * Math.cos(y)) / (mpp * 256) ) / Math.LN2;
    return zoom;
}

ogf.zoom2scale = function( zoom, lat, pxpt ){
    var y = lat * Math.PI / 180;
    var mpp = C * Math.cos(y) / (256 * Math.pow(2,zoom));
    var scale  = Math.floor( mpp * 1000 / pxpt + .5 );
    return scale;
}

ogf.scale2zoom = function( scale, lat, pxpt ){
    var mpp = scale / 1000 * pxpt;
    var y = lat * Math.PI / 180;
    var zoom = Math.log( (C * Math.cos(y)) / (mpp * 256) ) / Math.LN2;
    return zoom;
}


return ogf;

}


