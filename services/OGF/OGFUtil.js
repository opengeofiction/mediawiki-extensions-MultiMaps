function OGFUtil(){

var ogf = {
	config: {
		NOMINATIM_URL:  'http://nominatim.opengeofiction.net:8080/',
		ROUTING_URL:    'http://route.opengeofiction.net:5000/',
		TILESERVER_URL: 'http://tile.opengeofiction.net/'
	},
};


//--------------------------------------------------------------------------------------------------



ogf.map = function( leafletMap, options ){
	var self = this;
	self._map = leafletMap;

	var baseMapsAvailable = {
		Standard: {
		    tileUrl: ogf.config.TILESERVER_URL +'/osmcarto/{z}/{x}/{y}.png',
		    maxZoom: 19,
		},
		TopoMap: {
		    tileUrl: ogf.config.TILESERVER_URL +'/topomap/{z}/{x}/{y}.png',
		    maxZoom: 17,
		},
		Histor: {
		    tileUrl: ogf.config.TILESERVER_URL +'/tiles-histor/{z}/{x}/{y}.png',
		    maxZoom: 18,
		},
		Roantra: {
		    tileUrl: ogf.config.TILESERVER_URL +'/planet/Roantra/{z}/{x}/{y}.png',
		    maxZoom: 14,
		},
	};
	var baseMapsEnabled = options.layers || [ 'Standard', 'TopoMap', 'Histor' ];
	var baseMapActive   = options.layer || baseMapsEnabled[0];

	var overlaysAvailable = {
		'Coastline Errors': './CoastlineErrors.js',
		'Territories':      './Territories.js',
	};
	var overlaysEnabled = options.overlays || [];

	var i, baseMaps = {}, overlayMaps = {};

	for( i = 0; i < baseMapsEnabled.length; ++i ){
		var keyB  = baseMapsEnabled[i];
        var layerOpt = baseMapsAvailable[keyB];
		baseMaps[keyB] = L.tileLayer( layerOpt.tileUrl, layerOpt );
	}
	for( i = 0; i < overlaysEnabled.length; ++i ){
		var keyO = overlaysEnabled[i];
		overlayMaps[keyO] = L.layerGroup();
	}

	L.control.layers( baseMaps, overlayMaps ).addTo( self._map );
    baseMaps[baseMapActive].addTo( self._map );

	map.on( 'overlayadd', function(ev){
//		for( var key in ev ){ console.log( key + ': ' + ev[key] ); }
		if( overlayEvents[ev.name] && overlayEvents[ev.name][0] ){
			var funcLoad = overlayEvents[ev.name][0];
			funcLoad( ev.name, ev.layer );
		}
	} );
	map.on( 'overlayremove', function(ev){
		if( overlayEvents[ev.name] && overlayEvents[ev.name][1] ){
			var funcRemove = overlayEvents[ev.name][1];
			funcRemove( ev.name, ev.layer );
		}
	} );

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


