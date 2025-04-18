import React, { useEffect } from "react";
import { MyContext } from "../provider/MyContext";

// googlemapライブラリ
import { APIProvider, Map } from "@vis.gl/react-google-maps";
import "../css/FdevGoogleMapmini.css";

// 再レンダリングによる上書を防止

var googleMapOptions_dict = {};

// 動的マップに変更
googleMapOptions_dict = {
	draggable: false, // マップのドラッグ移動を無効にする
	disableDefaultUI: false, // デフォルトのUIを無効化（オプション）
	zoomControl: false, // ズームコントロールを無効化（オプション）
	mapTypeControl: false,
	fullscreenControl: false,
	streetViewControl: false,
	gestureHandling: "none", // すべての操作を無効化
	clickableIcons: false, // アイコンのクリックを無効化
};

//のちに修正できるように../img/pin1.svg参照

// マーカーアイコン設定
const statusColorArray = ["#22BE75", "#B2B2B2"];

const svgToBase64DataURL = (size, color, labelX, labelY) => {
	const svg = `<svg width="${size}px" height="${size}px" viewBox="0 0 34 44" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M16 1.5H18C20.825 1.5 22.8536 1.50117 24.4458 1.63126C26.0206 1.75992 27.0361 2.00718 27.8589 2.42644C29.4583 3.24137 30.7586 4.5417 31.5736 6.14108C31.9928 6.96394 32.2401 7.97941 32.3687 9.55417C32.4988 11.1464 32.5 13.175 32.5 16V20.444C32.5 21.9337 32.4972 22.543 32.4366 23.0362C31.9609 26.9092 28.9092 29.9609 25.0362 30.4366C24.543 30.4972 23.9337 30.5 22.4439 30.5C22.4375 30.5 22.4306 30.5 22.4231 30.5C22.351 30.4998 22.234 30.4996 22.1177 30.5101C21.2907 30.5847 20.5547 31.0652 20.1535 31.7922C20.0971 31.8944 20.0502 32.0017 20.0213 32.0677C20.0183 32.0745 20.0155 32.0809 20.0129 32.0868L16.9802 38.9848C16.7888 39.42 16.6311 39.7769 16.4957 40.0705C16.3726 39.7716 16.2298 39.4084 16.0568 38.9655L13.394 32.152L13.3891 32.1393C13.372 32.0955 13.3443 32.0245 13.3127 31.9557C12.9268 31.1163 12.1095 30.5582 11.1872 30.5043C11.1116 30.4998 11.0354 30.4999 10.9884 30.5L10.9747 30.5C10.0418 30.5 9.66004 30.4989 9.34991 30.4751C5.16833 30.1544 1.84565 26.8317 1.5249 22.6501C1.50111 22.34 1.5 21.9582 1.5 21.0253V16C1.5 13.175 1.50117 11.1464 1.63126 9.55417C1.75992 7.97941 2.00718 6.96394 2.42644 6.14108C3.24137 4.5417 4.5417 3.24137 6.14108 2.42644C6.96394 2.00718 7.97941 1.75992 9.55417 1.63126C11.1464 1.50117 13.175 1.5 16 1.5ZM15.9429 41.0827C15.9429 41.0821 15.9475 41.0765 15.9569 41.0675C15.9476 41.0787 15.9429 41.0832 15.9429 41.0827ZM16.9924 41.089C17.0014 41.0984 17.0058 41.1043 17.0058 41.1048C17.0058 41.1054 17.0013 41.1007 16.9924 41.089Z" fill="white" stroke="${color}" stroke-width="3"/><path d="M17 9.61803L18.3206 13.6824L18.4328 14.0279H18.7961H23.0696L19.6123 16.5398L19.3184 16.7533L19.4306 17.0988L20.7512 21.1631L17.2939 18.6512L17 18.4377L16.7061 18.6512L13.2488 21.1631L14.5694 17.0988L14.6816 16.7533L14.3877 16.5398L10.9304 14.0279H15.2039H15.5672L15.6794 13.6824L17 9.61803Z" fill="${color}" stroke="${color}"/></svg>`;
	return { url: `data:image/svg+xml,${encodeURIComponent(svg)}`, scaledSize: new window.google.maps.Size(size, size), labelOrigin: new window.google.maps.Point(labelX, labelY) };
};

// ----------コンポーネント----------
// ----------コンポーネント----------
// ----------コンポーネント----------

const FdevGoogleMapMini = (props) => {
	// 注意再レンダリングでここから下すべて再実行される
	const { state, setState } = React.useContext(MyContext);
	// googoleapiキー確認
	// console.log(state.googleMapApiKey);

	// defaultCenterとdefaultZoomを使うとスライドが無効になる

	const mapRef = React.useRef(null);
	const [isOnLoad, setIsOnLoad] = React.useState(true);
	const [mapMarker, setMapMarker] = React.useState([]);
	const [mapHomeGeo, setMapHomeGeo] = React.useState(getHomeGeo());
	const [intZoomMapState, setIntZoomMapState] = React.useState(parseFloat(12));

	const [mapOptionState, setMapOptionState] = React.useState(googleMapOptions_dict);

	function getHomeGeo() {
		return {
			latitude: props.latitude,
			longitude: props.longitude,
		};
	}

	function handleLoad(map) {
		//初期設定　handleOnTilesLoadedでもう一度設定
		mapRef.current = map;
	}

	function onDragEnd() {
		// console.log(mapRef.current.map.center.lat());
	}
	const handleOnTilesLoaded = (map) => {
		mapRef.current = map;
		var minZoom = 6;
		if (mapRef.current.map.zoom <= minZoom) {
			mapRef.current.map.zoom = minZoom;
		}

		if (isOnLoad) {
			// 最初期のロードだけ実行
			onLoadSetmarker();
			setIsOnLoad(false);
		}
	};

	function onLoadSetmarker() {
		var posLat = "";
		var posLon = "";

		if (mapHomeGeo["latitude"] > 80) {
			posLat = mapHomeGeo["longitude"];
			posLon = mapHomeGeo["latitude"];
		} else {
			posLat = mapHomeGeo["latitude"];
			posLon = mapHomeGeo["longitude"];
		}

		var pushMarkerArray = mapMarker;
		var newMarker = new window.google.maps.Marker({
			position: { lat: posLat, lng: posLon }, // マーカーの位置
			map: mapRef.current.map, // マーカーを表示するマップ
			icon: svgToBase64DataURL(44, statusColorArray[0], 10, 30),
		});
		pushMarkerArray.push(newMarker);
		setMapMarker(pushMarkerArray);
	}

	// -------ここから描画------------

	return (
		<div className="mapPositionMiniInner">
			<APIProvider apiKey={state.googleMapApiKey}>
				<Map
					onLoad={(map) => handleLoad(map)} // マップがロードされたら参照をセット
					onTilesLoaded={(map) => handleOnTilesLoaded(map)}
					onDragEnd={onDragEnd} // ドラッグが終了したらonDragEndを呼ぶ
					style={{}}
					defaultCenter={{ lat: mapHomeGeo.latitude, lng: mapHomeGeo.longitude }}
					defaultZoom={intZoomMapState}
					gestureHandling={"greedy"}
					disableDefaultUI={true}
					options={mapOptionState}
				/>
			</APIProvider>
		</div>
	);
};

export default FdevGoogleMapMini;
