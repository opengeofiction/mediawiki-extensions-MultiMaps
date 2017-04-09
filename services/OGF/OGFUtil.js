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
};

var icons = { red: null, yellow: null, green: null, blue: null };		
for( var color in icons ){
    icons[color] = L.icon( {iconUrl: ogf.config.TILES_URL + 'util/marker-'+ color +'.png', iconAnchor: [12,41]} );
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

//--------------------------------------------------------------------------------------------------

ogf.map = function( leafletMap, options ){
    var self = {};
    self._map = leafletMap;

    var baseMapsAvailable = {
        Standard: {
            tileUrl: ogf.config.TILES_URL +'/osmcarto/{z}/{x}/{y}.png',
            maxZoom: 19,
        },
        TopoMap: {
            tileUrl: ogf.config.TILES_URL +'/topomap/{z}/{x}/{y}.png',
            maxZoom: 17,
        },
        Histor: {
            tileUrl: ogf.config.TILES_URL +'/tiles-histor/{z}/{x}/{y}.png',
            maxZoom: 18,
        },
        Roantra: {
            tileUrl: ogf.config.TILES_URL +'/planet/Roantra/{z}/{x}/{y}.png',
            maxZoom: 14,
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

//	if( ! overlayDefinitions.Territories ){
//		overlayDefinitions.Territories = [
//			{url: '/data/ogf_territories.json', key:    'ogfId'},
//			{url: '/data/ogf_polygons.json',    wrap:   'polygon'},
//			{url: '/data/ogf_template.json',    select: ['status','constraints']},
//		];
//	}
//	if( ! overlayDefinitions['Coastline Errors'] ){
//		overlayDefinitions['Coastline Errors'] = [
//		    {url: '/util-data/costaline_errors.js', key: 'ogfId'},
//		];
//	}

//	L.control.infoBox( {text: 'InfoBox ' + (new Date()).toISOString()} ).addTo( map );
//	L.control.infoBox( {text: 'TEST 02'} ).addTo( map );

    var hControls = {};
    var onOverlayAdd = function( name, layer ){
        if( overlayDefinitions[name] ){
            var hObjects = {};
            ogf.loadOverlay( hObjects, 0, overlayDefinitions[name], function(hObjects){
                hControls[name] = ogf.drawLayerObjects( hObjects, layer, self._map );
            } );
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
	console.log( "info = " + JSON.stringify(info,null,"  ") );  // _DEBUG_
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

//	var getApplyStruct;
//	if( info.url ){
//	    getApplyStruct = function(cb){
//	        ogf.runRequest( 'GET', info.url, '', function(data){
//              try{
//                  var struct = JSON.parse( data );
//                  cb( struct );
//              }catch( err ){
//                  console.log( 'ERROR ' + info.url + ' ' + err.toString() );
//                  return;
//              }
//          } );
//	    };
//	}else{
//	    getApplyStruct = function(cb){
//	        cb( info.apply );
//	    };
//	}

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
//	console.log( "hObjects = " + JSON.stringify(hObjects,null,"  ") );  // _DEBUG_
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

//      if( coordList[0] && Array.isArray(coordList[0][0]) ){
//          for( var i = 0; i < coordList.length; ++i ){
//              L.polygon( coordList[i], options ).addTo( layer ).bindPopup( text, popupOptions );
//          }
//      }else{
//          L.polygon( coordList, options ).addTo( layer ).bindPopup( text, popupOptions );
//      }
        L.polygon( coordList, options ).addTo( layer ).bindPopup( text, popupOptions );
    }else if( obj.icon ){
        var options = {};
        if( icons[obj.icon] ){
            options.icon = icons[obj.icon];
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





/*
ogf.loadCoastlineErrors = function( layerName, layer ){
    OGF.runRequest( 'GET', '/util-data/coastline_err.js', '', function(data){
        data = data.replace(/^var err_nodes = /,'');
        var err_nodes = JSON.parse( data );
        console.log( "err_nodes = " + JSON.stringify(err_nodes,null,"  ") );  // _DEBUG_

        for( i = 0; i < err_nodes._nodes.length; ++i ){
            node = err_nodes._nodes[i];
            text = node.text;
//			link = 'Node <a href="' + node.link + '">' + node.id + '</a><br>(lat: ' + node.lat + ', lon: ' + node.lon + ')';
            var color = node.color || 'blue';
            L.marker( [node.lat, node.lon], {icon: icons[color]} ).addTo( layer ).bindPopup( text );
        }

        var num = layer.getLayers().length;
        console.log( "load --- num <" + num + ">" );  // _DEBUG_
    } );
};



ogf.loadTerritories = function( layerName, layer ){
    var colors = {	
        owned:          '#ffcc99',
        available:      '#66cc22',
        reserved:       '#dddddd',
        collaborative:  '#cc99ff',
        'open to all':  '#0044ff',
        'marked for withdrawal': '#eeff22',
    };
    var hConstraints = {
        'Cold':            {icon: '25px-Ogf-cold-icon.png',      text: 'This territory has a <b>cold</b> climate.'},
        'Desert':          {icon: '25px-Ogf-desert-icon.png',    text: 'This territory has a <b>desert</b> climate.'},
        'Tropical':        {icon: '25px-Ogf-tropical-icon.png',  text: 'This territory has a tropical climate.'},
        'Mountains-CTR':   {icon: '25px-Mountains-CTR-icon.png', text: 'This territory has mountains along its <b>center</b>.'},
        'Mountains-E':     {icon: '25px-Mountains-CTR-icon.png', text: 'The <b>eastern</b> border is mountainous.'},
        'Mountains-N':     {icon: '25px-Mountains-N-icon.png',   text: 'The <b>northern</b> border is mountainous.'},
        'Mountains-NE':    {icon: '25px-Mountains-NE-icon.png',  text: 'The <b>northeastern</b> border is mountainous.'},
        'Mountains-NW':    {icon: '25px-Mountains-NW-icon.png',  text: 'The <b>northwestern</b> border is mountainous.'},
        'Mountains-S':     {icon: '25px-Mountains-S-icon.png',   text: 'The <b>southern</b>rn border is mountainous.'},
        'Mountains-SE':    {icon: '25px-Mountains-SE-icon.png',  text: 'The <b>southeastern</b> border is mountainous.'},
        'Mountains-SW':    {icon: '25px-Mountains-SW-icon.png',  text: 'The <b>southwestern</b> border is mountainous.'},
        'Mountains-W':     {icon: '25px-Mountains-W-icon.png',   text: 'The <b>western</b> border is mountainous.'},
        'Population-E':    {icon: '25px-Population-E-icon.png',  text: 'Most of the population will be in the <b>east</b>.'},
        'Population-N':    {icon: '25px-Population-N-icon.png',  text: 'Most of the population will be in the <b>north</b>.'},
        'Population-NE':   {icon: '25px-Population-NE-icon.png', text: 'Most of the population will be in the <b>northeast</b>.'},
        'Population-NW':   {icon: '25px-Population-NW-icon.png', text: 'Most of the population will be in the <b>northwest</b>.'},
        'Population-S':    {icon: '25px-Population-S-icon.png',  text: 'Most of the population will be in the <b>south</b>.'},
        'Population-SE':   {icon: '25px-Population-SE-icon.png', text: 'Most of the population will be in the <b>southeast</b>.'},
        'Population-SW':   {icon: '25px-Population-SW-icon.png', text: 'Most of the population will be in the <b>southwest</b>.'},
        'Population-W':    {icon: '25px-Population-W-icon.png',  text: 'Most of the population will be in the <b>west</b>.'},
        'Advanced':        {icon: '20px-Achtung.png',            text: 'For advanced users only.'},
        'PossibleCollaboration':  {icon: '20px-Achtung.png',     text: 'Possibly a future collaborative territory.'},
    };
    var popupOptions = {maxWidth: 600};

    OGF.runRequest( 'GET', '/data/ogf_territories.json', '', function(data){
        var territories = JSON.parse( data );
        var hTerritories = {};
        for( var i = 0; i < territories.length; ++i ){
            var terr = territories[i];
            hTerritories[terr.ogfId] = terr;
        }

        OGF.runRequest( 'GET', '/data/ogf_polygons.json', '', function(data2){
            var hPolygons = JSON.parse( data2 );
//    		    console.log( "polygons = " + JSON.stringify(polygons,null,"  ") );  // _DEBUG_

            for( var ogfId in hPolygons ){
            console.log( "ogfId <" + ogfId + ">" );  // _DEBUG_
//    			var coordList = convertCoordlist( polygons[ogfId] );
//    			console.log( "coordList = " + JSON.stringify(coordList,null,"  ") );  // _DEBUG_
//              L.polygon( coordList ).addTo( layer );  // multipart polygons don't seem to work 
                var text = '';
                var options = { color: '#111111', weight: 1, fillOpacity: .5, fillColor: '#999999' };
                var terr = hTerritories[ogfId];
                if( terr ){
//				    text = terr.ogfId + ' ' + terr.status + ' ' + terr.owner;
                    text = '<b><a href="http://wiki.opengeofiction.net/wiki/index.php/' + terr.name + '">' + terr.name + '</a></b><hr>'
                    text += '<a href="http://opengeofiction.net/relation/' + terr.rel + '">' + terr.ogfId + '</a>';
                    if( terr.status === 'owned' || terr.status === 'marked for withdrawal' ){
                        text += ' is active - contact <a href="http://opengeofiction.net/user/' + terr.owner + '">' + terr.owner + '</a>';
                    }else if( terr.status === 'available' ){
                        text += ' is available - <a href="http://opengeofiction.net/message/new/admin">request this territory</a>.';
                    }else if( terr.status === 'reserved' ){
                        text += ' is not available';
                    }else if( terr.status === 'collaborative' ){
                        text += ' is collaborative - contact <a href="http://opengeofiction.net/user/' + terr.owner + '">' + terr.owner + '</a>';
                    }else if( terr.status === 'open to all' ){
                        text += ' is community - anyone may edit here, no permission needed! Happy mapping!<br>Questions? For collaboration please consult ...';
                    }

                    if( terr.constraints && terr.constraints.length > 0 ){
                        text += '<hr>';
                        for( var i = 0; i < terr.constraints.length; ++i ){
                            var cntr = hConstraints[terr.constraints[i]];
                            if( terr.constraints[i].match(/Advanced|Collaboration/) && i > 0 )  text += '<hr>';
                            text += '<img src="/data/icons/' + cntr.icon + '"> <i>' + cntr.text + '</i><br>';
                        }
                    }

                    options.fillColor = colors[terr.status];
                }

                var coordList = hPolygons[ogfId];
                if( coordList[0] && Array.isArray(coordList[0][0]) ){
                    for( var i = 0; i < coordList.length; ++i ){
                        L.polygon( coordList[i], options ).addTo( layer ).bindPopup( text, popupOptions );
                    }
                }else{
                    L.polygon( coordList, options ).addTo( layer ).bindPopup( text, popupOptions );
                }
            }

            var num = layer.getLayers().length;
            console.log( "load --- num <" + num + ">" );  // _DEBUG_
        });
    });
};
*/

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
    var hParam = ogf.parseUrlParam( url );
    console.log( "hParam = " + JSON.stringify(hParam,null,"  ") );  // _DEBUG_
    if( hParam.map ){
        var loc = hParam.map.split('/');
        var zoom = parseFloat(loc[0]), lat = parseFloat(loc[1]), lon = parseFloat(loc[2]);
        if( opt.method === 'MapboxGL' ){
            map.setZoom( zoom );
            map.setCenter( [lon,lat] );
        }else{
            map.setView( [lat,lon], zoom );
        }
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

    map.on( 'moveend', function(){
        var hOut = {};
        var zoom   = map.getZoom();
        var center = map.getCenter();
        var query  = 'map=' + zoom + '/' + center.lat.toFixed(5) + '/' + center.lng.toFixed(5);
//		query += '&layer=' + '';
        if( opt.fields ){
            for( var i = 0; i < opt.fields.length; ++i ){
                var field = opt.fields[i];
                var elem = document.getElementById( field );
                query += '&' + field + '=' + encodeURIComponent(elem.value);
            }
        }
        for( var key in hOut ){
            query += key + '='
        }

        var newUrl = document.URL.replace( /\.html.*/, '.html?' + query );
//      console.log( "newUrl <" + newUrl + ">" );  // _DEBUG_
        window.history.pushState( '', '', newUrl );
    } );

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

ogf.getOverpassData = function( query, cb ){
    var url = 'http://osm3s.opengeofiction.net/api/interpreter';
    query = "[out:json];\n" + query + "\nout;";
    ogf.runRequest( 'POST', url, query, function(data){
        var struct = JSON.parse( data );
//		console.log( "struct = " + JSON.stringify(struct,null,"  ") );  // _DEBUG_
        cb( struct );
    } );
};

ogf.typeMap = function( struct ){
    var hObj = {};
    _.forEach( ['node','way','relation'], function(type){
        hObj[type] = _.keyBy( _.filter( struct.elements, function(x){
            return x.type === type; 
        } ), 'id' );
    } );
    return hObj;
}

ogf.getRelationData = function( relId, cb ){
    var query;
    relId = '' + relId;
    if( relId.match(/^\d+$/) ){
        query = '( relation(' + relId + '); >;);';
    }else{
        var info = relId.split(':');
        var level = info[0];
        var name  = info[1];
        var type  = (info[2] && info[2] === 'L')? 'land_area' : 'boundary';
        query = '( relation["name"="' + name + '"]["admin_level"="' + level + '"]["' + type +'"="administrative"]; >;);';
        console.log( "query <" + query + ">" );  // _DEBUG_
    }
    ogf.getOverpassData( query, function(struct){
        struct = ogf.typeMap( struct );
        cb( struct );
    } );
};



//--------------------------------------------------------------------------------------------------

ogf.wayGeometry = function( points ){
    var minLon = 180, maxLon = -180, minLat = 90, maxLat = -90, iMinLat = -1, iMaxLat = -1, iMinLon = -1, iMaxLon = -1;
    _.forEach( points, function(node,i){
        if( node.longitude < minLon ){  minLon = node.longitude; iMinLon = i; }
        if( node.longitude > maxLon ){  maxLon = node.longitude; iMaxLon = i; }
        if( node.latitude < minLat ){  minLat = node.latitude; iMinLat = i; }
        if( node.latitude > maxLat ){  maxLat = node.latitude; iMaxLat = i; }
    } );
    var iX = (iMinLon > 0 && iMinLon < points.length-1)? iMinLon : iMaxLon;
    var prod = (points[iX-1].longitude - points[iX].longitude)*(points[iX+1].latitude - points[iX].latitude) - (points[iX-1].latitude - points[iX].latitude)*(points[iX+1].longitude - points[iX].longitude);
    var hInfo = {
        bbox: [ minLon, minLat, maxLon, maxLat ],
        orientation: prod,
    };
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

    if( _.isString(rel) )  rel = parseInt( rel );
    if( _.isNumber(rel) ){
        rel = ctx.relation[rel];
//      console.log( "rel = " + JSON.stringify(rel,null,"  ") );  // _DEBUG_
    }

    if( ! hWays ){
        var ways;
        if( rel ){
            var rxRole = new RegExp(hOpt.role) || /$/;
            ways = _.filter( rel.members, function(x){
                return (x.type === 'way' && x.role.match(rxRole));
            } );
            ways = _.map( ways, function(x){ return ctx.way[x.ref]; } );
            ways = _.filter( ways, function(x){ return x; } );   // grep {defined} to allow handling incomplete relations
        }else{
            ways = ctx.way;
        }
        if( hOpt.copy ){
            ways = _.map( ways, function(x){ return _.cloneDeep(x); } );
            ways = _.filter( ways, function(x){ return x; } );
        }
        hWays = _.keyBy( ways, 'id' );
//      console.log( "hWays = " + JSON.stringify(hWays,null,"  ") );  // _DEBUG_
    }

    var ptStart = {}, ptEnd = {};
    var relOrder = hOpt.relOrder || null;

    _.forEach( hWays, function(way,wayId){
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
                way2.nodes = _.reverse( way2.nodes );
                if( hOpt.relOrder ){
                    relOrder[way2.id] = _.reverse( relOrder[way2.id] );
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
    } );

    if( hOpt.relOrder )  hOpt.relOrder = relOrder;
    if( ! repeatFlag )  OGF.buildWaySequence( ctx, rel || null, hWays, hOpt );

    return hOpt.relOrder ? _.sortBy( _.values(relOrder), function(x){ return x.length; } ) : _.values(hWays);
};



ogf.geoArea = function( ctx, obj, bbox ){
    var xMin = bbox[0], yMin = bbox[1], xMax = bbox[2], yMax = bbox[3];
    var lon0 = (xMax + xMin)/2;
//  var pr = proj4('+proj=eck4 +lon_0=' + lon0 + ' +x_0=0 +y_0=0');
//	var pr = proj4('+proj=sinu +lon_0=' + lon0 +' +x_0=0 +y_0=0');
    var pr = proj4('+proj=cea +lon_0=0 +lat_ts=0 +x_0=0 +y_0=0 +datum=WGS84 +ellps=WGS84 +units=m +no_defs');

    console.log( "obj = " + JSON.stringify(obj,null,"  ") );  // _DEBUG_
    if( _.isNumber(obj) ){
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
            console.log( "nodeA = " + JSON.stringify(nodeA,null,"  ") );  // _DEBUG_
            console.log( "nodeB = " + JSON.stringify(nodeB,null,"  ") );  // _DEBUG_
            var ptA = pr.forward( [nodeA.lon,nodeA.lat] );
            var ptB = pr.forward( [nodeB.lon,nodeB.lat] );
            console.log( "ptA = " + JSON.stringify(ptA,null,"  ") );  // _DEBUG_
            console.log( "ptB = " + JSON.stringify(ptB,null,"  ") );  // _DEBUG_
            var ap = (ptA[0] * ptB[1] - ptA[1] * ptB[0]);
            console.log( "ap <" + ap + ">" );  // _DEBUG_
            geoArea += ap;
            console.log( "geoArea <" + geoArea + ">" );  // _DEBUG_
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
        _.forEach( aRelOuter, function(x){ area += ogf.geoArea(ctx,x,bbox); } );
        _.forEach( aRelInner, function(x){ area += ogf.geoArea(ctx,x,bbox); } );
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
    var zoom = Math.log2( (C * Math.cos(y)) / (mpp * 256) );
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
    var zoom = Math.log2( (C * Math.cos(y)) / (mpp * 256) );
    return zoom;
}


return ogf;

}


