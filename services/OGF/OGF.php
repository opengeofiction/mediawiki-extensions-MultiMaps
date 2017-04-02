<?php
namespace MultiMaps;
/**
 * This groupe contains all Leaflet related files of the MultiMaps extension.
 *
 * @defgroup Leaflet
 * @ingroup MultiMaps
 */

/**
 *
 *
 * @file Leaflet.php
 * @ingroup Leaflet
 *
 * @licence GNU GPL v2+
 * @author Pavel Astakhov < pastakhov@yandex.ru >
 */
class Leaflet extends BaseMapService {

	function __construct() {
		parent::__construct();
		$this->classname="leaflet";
		$this->resourceModules[] = 'ext.MultiMaps.Leaflet';

		global $egMultiMapsScriptPath;
		$leafletPath = $egMultiMapsScriptPath . '/services/Leaflet/leaflet';
		$this->headerItem .= \Html::linkedStyle( "$leafletPath/leaflet.css" ) .
			'<!--[if lte IE 8]>' . \Html::linkedStyle( "$leafletPath/leaflet.ie.css" ). '<![endif]-->' .
			\Html::linkedScript( "$leafletPath/leaflet.js" );
	}
}
