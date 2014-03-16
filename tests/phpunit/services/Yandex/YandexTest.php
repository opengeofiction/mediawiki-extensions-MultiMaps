<?php

namespace MultiMaps;

/**
 * Generated by PHPUnit_SkeletonGenerator 1.2.0 on 2013-02-26 at 07:57:33.
 */
class YandexTest extends \PHPUnit_Framework_TestCase {

	/**
	 * @var Yandex
	 */
	protected $object;

	/**
	 * Sets up the fixture, for example, opens a network connection.
	 * This method is called before a test is executed.
	 */
	protected function setUp() {
		$this->object = new Yandex;
	}

	/**
	 * Tears down the fixture, for example, closes a network connection.
	 * This method is called after a test is executed.
	 */
	protected function tearDown() {

	}

	public function testParseGeocoderMarker() {
		global $egMultiMaps_AllowGeocoderTests;
		if ( !$egMultiMaps_AllowGeocoderTests ) {
			return;
		}
		$this->assertRegExp(
				'{"markers":[{"pos":[{"lat":[0-9\.]+,"lon":[0-9\.]+}]}],"bounds":{"ne":{"lat":[0-9\.]+,"lon":[0-9\.]+},"sw":{"lat":[0-9\.]+,"lon":[0-9\.]+}}}',
				\FormatJson::encode( $this->object->getMapData( array('Moscow', 'service=yandex') ) )
				);
	}

	public function testParseGeocoderRectangle() {
		global $egMultiMaps_AllowGeocoderTests;
		if ( !$egMultiMaps_AllowGeocoderTests ) {
			return;
		}
		$this->assertRegExp(
				'{"rectangles":\[{"pos":\[{"lat":[0-9\.]+,"lon":[0-9\.]+},{"lat":[0-9\.]+,"lon":[0-9\.]+}\]}\],"bounds":{"ne":{"lat":[0-9\.]+,"lon":[0-9\.]+},"sw":{"lat":[0-9\.]+,"lon":[0-9\.]+}}}',
				\FormatJson::encode( $this->object->getMapData( array('rectangle=Moscow', 'service=yandex') ) )
				);
	}

	public function testParseGeocoderRectangles() {
		global $egMultiMaps_AllowGeocoderTests;
		if ( !$egMultiMaps_AllowGeocoderTests ) {
			return;
		}
		$this->assertRegExp(
				'/\{"rectangles":\[\{"pos":\[\{"lat":[-0-9\.]+,"lon":[-0-9\.]+\},\{"lat":[-0-9\.]+,"lon":[-0-9\.]+\}\]\},\{"pos":\[\{"lat":[-0-9\.]+,"lon":[-0-9\.]+\},\{"lat":[-0-9\.]+,"lon":[-0-9\.]+\}\]\}\],"bounds":\{"ne":\{"lat":[-0-9\.]+,"lon":[-0-9\.]+\},"sw":\{"lat":[-0-9\.]+,"lon":[-0-9\.]+\}\}\}/',
				\FormatJson::encode( $this->object->getMapData( array('rectangle=Moscow;London', 'service=yandex') ) )
				);
	}

	public function testParseGeocoderCircle() {
		global $egMultiMaps_AllowGeocoderTests;
		if ( !$egMultiMaps_AllowGeocoderTests ) {
			return;
		}
		$this->assertRegExp(
				'{"circles":\[{"radius":\[[0-9\.]+\],"pos":\[{"lat":[0-9\.]+,"lon":[0-9\.]+}\]}\],"bounds":{"ne":{"lat":[0-9\.]+,"lon":[0-9\.]+},"sw":{"lat":[0-9\.]+,"lon":[0-9\.]+}}}',
				\FormatJson::encode( $this->object->getMapData( array('circle=Moscow', 'service=yandex') ) )
				);
	}

}
