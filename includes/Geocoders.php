<?php
namespace MultiMaps;
/**
 *
 *
 * @file Geocoders.php
 * @ingroup MultiMaps
 * @author Pavel Astakhov <pastakhov@yandex.ru>
 * @licence GNU General Public Licence 2.0 or later
 */

class Geocoders {

	public static function getCoordinates($address, $service, $params = null) {
		return self::getCoordinatesUseMapquestNominatim($address, $params);
		return false;
	}

	private static function performRequest($url, $urlArgs) {
		return \Http::get( $url.wfArrayToCgi($urlArgs) );
	}

	public static function getCoordinatesUseMapquestNominatim($address, $params) {
		$return = false;
		$param_polygon = (isset( $params['polygon'] ) && $params['polygon'] === true) ? true : false;

		$urlArgs = array(
			'format' => 'json',
			'addressdetails' => '0',
			'limit' => 1,
			'q' => $address,
			);
		if( $param_polygon ) {
			$urlArgs['polygon'] = '1';
		}
		$response = self::performRequest( 'http://open.mapquestapi.com/nominatim/v1/search.php?', $urlArgs );

		if( $response !== false ) {
			$data = \FormatJson::decode( $response );
			if( isset($data[0]) ) {
				$data = $data[0];
				$lat = $data->lat;
				$lon = $data->lon;
				if( !is_null($lat) && !is_null($lon) ) {
					$return = array('lat' => $lat, 'lon' => $lon );
					$bounds = $data->boundingbox;
					if( !is_null($bounds) ) {
						$bounds_ne = new Point( $bounds[1], $bounds[3] );
						$bounds_sw = new Point( $bounds[0], $bounds[2] );
						if( $bounds_ne->isValid() && $bounds_sw->isValid() ) {
							$b = new Bounds( array($bounds_ne, $bounds_sw) );
							$return['bounds'] = $b;
						}
					}
					if( $param_polygon ) {
						$polygonpoints = $data->polygonpoints;
						if( count($polygonpoints) > 1 ) {
							$points = array();
							foreach ($polygonpoints as $value) {
								$p = new Point($value[1], $value[0]);
								if( $p->isValid() ) {
									$points[] = $p;
								}
							}
							if( count($points) > 1 ) {
								$return['polygon'] = $points;
							}
						}
					}
				}
			}
		}
		return $return;
	}

}