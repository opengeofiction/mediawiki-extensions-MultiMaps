<?php
namespace MultiMaps;

/**
 * Line class for collection of map elements
 *
 * @file Line.php
 * @ingroup MultiMaps
 * @author Pavel Astakhov <pastakhov@yandex.ru>
 * @licence GNU General Public Licence 2.0 or later
 * @property string $color Color line
 * @property string $weight Weight line
 * @property string $opacity Opacity line
 */
class Line extends BaseMapElement {

	/**
	 * Constructor
	 */
	function __construct() {
		parent::__construct();

		$this->availableProperties = array_merge(
				$this->availableProperties,
				array( 'color', 'weight', 'opacity' )
				);
	}

	/**
	 * Returns element name
	 * return string Element name
	 */
	public function getElementName() {
		return 'Line'; //TODO i18n?
	}

	/**
	 * Filling property 'coordinates'
	 * @global string $egMultiMaps_CoordinatesSeparator
	 * @param string $coordinates
	 * @param string $service Name of map service
	 * @return boolean
	 */
	protected function parseCoordinates( $coordinates, $service = null ) {
		global $egMultiMaps_CoordinatesSeparator;

		$array = explode( $egMultiMaps_CoordinatesSeparator, $coordinates);

		if( ($service == 'leaflet' || $service == 'ogf') && count($array) == 1 ) {
			$value = $array[0];
			$coord = Geocoders::getCoordinates( $value, $service, array('polygon'=>true) );
			if( $coord !== false && is_array($coord['polygon']) ) {
				$this->coordinates = $coord['polygon'];
			} else {
				$this->errormessages[] = \wfMessage( 'multimaps-unable-parse-coordinates', $value)->escaped();
				return false;
			}
		} else {
			foreach ($array as $value) {
				$point = new Point();
				if( $point->parse($value, $service) ) {
					$this->coordinates[] = $point;
				} else {
					$this->errormessages[] = \wfMessage( 'multimaps-unable-parse-coordinates', $value)->escaped();
					return false;
				}
			}
		}
		return true;
	}

}
