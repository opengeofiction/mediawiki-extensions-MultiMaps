<?php
namespace MultiMaps;
/**
 * This groupe contains all OGF related files of the MultiMaps extension.
 *
 * @defgroup OGF
 * @ingroup MultiMaps
 */

/**
 *
 *
 * @file OGF.php
 * @ingroup OGF
 *
 * @licence GNU GPL v2+
 * @author Pavel Astakhov < pastakhov@yandex.ru >
 */
class OGF extends BaseMapService {

	function __construct() {
		parent::__construct();
		$this->classname="ogf";
		$this->resourceModules[] = 'ext.MultiMaps.OGF';

		global $egMultiMapsScriptPath;
		$leafletPath = $egMultiMapsScriptPath . '/services/Leaflet/leaflet';
		$this->headerItem .= \Html::linkedStyle( "$leafletPath/leaflet.css" ) .
			'<!--[if lte IE 8]>' . \Html::linkedStyle( "$leafletPath/leaflet.ie.css" ). '<![endif]-->' .
			\Html::linkedScript( "$leafletPath/leaflet.js" ) . 
			\Html::linkedScript( "/services/OGF/OGFUtil.js" );
	}
}
