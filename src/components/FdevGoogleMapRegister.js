import React from "react";
import { MyContext } from "../provider/MyContext";

// googlemapライブラリ
import { APIProvider, Map } from "@vis.gl/react-google-maps";
// import { AdvancedMarker, InfoWindow, useAdvancedMarkerRef } from "@vis.gl/react-google-maps";
import "../css/FdevGoogleMap.css";

// 再レンダリングによる上書を防止
const pinIcon16 =
	'<svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M13.5 6C13.5 3.5175 11.4825 1.5 9 1.5C6.5175 1.5 4.5 3.5175 4.5 6C4.5 9.375 9 14.25 9 14.25C9 14.25 13.5 9.375 13.5 6ZM7.5 6C7.5 5.175 8.175 4.5 9 4.5C9.825 4.5 10.5 5.175 10.5 6C10.5 6.39782 10.342 6.77936 10.0607 7.06066C9.77936 7.34196 9.39782 7.5 9 7.5C8.60218 7.5 8.22064 7.34196 7.93934 7.06066C7.65804 6.77936 7.5 6.39782 7.5 6ZM3.75 15V16.5H14.25V15H3.75Z" fill="#404040"/></svg>';

async function getGsiCoordinates(address) {
	const baseUrl = "https://msearch.gsi.go.jp/address-search/AddressSearch?q=";
	const encodedAddress = encodeURIComponent(address);
	const response = await fetch(baseUrl + encodedAddress);

	if (!response.ok) {
		throw new Error("ネットワークの問題が発生しました");
	}

	const data = await response.json();

	if (data.length === 0) {
		throw new Error("住所に対応する緯度経度が見つかりません");
	}

	const geoArray = data[0]["geometry"]["coordinates"];
	const geoDict = {
		longitude: geoArray[0],
		latitude: geoArray[1],
	};

	return geoDict;
}

async function getGsiAddress(latLng_dict) {
	const baseUrl = "https://mreversegeocoder.gsi.go.jp/reverse-geocoder/LonLatToAddress";
	const response = await fetch(`${baseUrl}?lat=${String(latLng_dict["latitude"])}&lon=${String(latLng_dict["longitude"])}`);

	if (!response.ok) {
		throw new Error("ネットワークの問題が発生しました");
	}

	const data = await response.json();
	var address = "";

	if (data.length === 0 || !("muniCd" in data.results)) {
		throw new Error("緯度経度に対応する住所が見つかりません");
	} else {
		const addressCode = Math.trunc(data.results.muniCd.replace(/^0+/, ""));
		// console.log(addressCode);
		// muni.jsから都道府県などを取得
		const muniData = window.GSI.MUNI_ARRAY[addressCode];
		// 都道府県コード,都道府県名,市区町村コード,市区町村名 に分割
		const [prefCode, pref, muniCode, city] = muniData.split(",");

		address = pref + city + data.results.lv01Nm;
	}

	return address;
}

// 動的マップに変更
const googleMapOptions_dict = {
	draggable: true, // マップのドラッグ移動を無効にする
	disableDefaultUI: false, // デフォルトのUIを無効化（オプション）
	zoomControl: true, // ズームコントロールを無効化（オプション）
	mapTypeControl: false,
	fullscreenControl: false,
	streetViewControl: false,
};

//のちに修正できるように../img/pin1.svg参照

// マーカーアイコン設定
const statusColorArray = ["#22BE75", "#B2B2B2"];

const svgToBase64DataURL = (size, color, labelX, labelY) => {
	const svg = `<svg width="${size}px" height="${size}px" viewBox="0 0 34 44" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M16 1.5H18C20.825 1.5 22.8536 1.50117 24.4458 1.63126C26.0206 1.75992 27.0361 2.00718 27.8589 2.42644C29.4583 3.24137 30.7586 4.5417 31.5736 6.14108C31.9928 6.96394 32.2401 7.97941 32.3687 9.55417C32.4988 11.1464 32.5 13.175 32.5 16V20.444C32.5 21.9337 32.4972 22.543 32.4366 23.0362C31.9609 26.9092 28.9092 29.9609 25.0362 30.4366C24.543 30.4972 23.9337 30.5 22.4439 30.5C22.4375 30.5 22.4306 30.5 22.4231 30.5C22.351 30.4998 22.234 30.4996 22.1177 30.5101C21.2907 30.5847 20.5547 31.0652 20.1535 31.7922C20.0971 31.8944 20.0502 32.0017 20.0213 32.0677C20.0183 32.0745 20.0155 32.0809 20.0129 32.0868L16.9802 38.9848C16.7888 39.42 16.6311 39.7769 16.4957 40.0705C16.3726 39.7716 16.2298 39.4084 16.0568 38.9655L13.394 32.152L13.3891 32.1393C13.372 32.0955 13.3443 32.0245 13.3127 31.9557C12.9268 31.1163 12.1095 30.5582 11.1872 30.5043C11.1116 30.4998 11.0354 30.4999 10.9884 30.5L10.9747 30.5C10.0418 30.5 9.66004 30.4989 9.34991 30.4751C5.16833 30.1544 1.84565 26.8317 1.5249 22.6501C1.50111 22.34 1.5 21.9582 1.5 21.0253V16C1.5 13.175 1.50117 11.1464 1.63126 9.55417C1.75992 7.97941 2.00718 6.96394 2.42644 6.14108C3.24137 4.5417 4.5417 3.24137 6.14108 2.42644C6.96394 2.00718 7.97941 1.75992 9.55417 1.63126C11.1464 1.50117 13.175 1.5 16 1.5ZM15.9429 41.0827C15.9429 41.0821 15.9475 41.0765 15.9569 41.0675C15.9476 41.0787 15.9429 41.0832 15.9429 41.0827ZM16.9924 41.089C17.0014 41.0984 17.0058 41.1043 17.0058 41.1048C17.0058 41.1054 17.0013 41.1007 16.9924 41.089Z" fill="white" stroke="${color}" stroke-width="3"/><path d="M17 9.61803L18.3206 13.6824L18.4328 14.0279H18.7961H23.0696L19.6123 16.5398L19.3184 16.7533L19.4306 17.0988L20.7512 21.1631L17.2939 18.6512L17 18.4377L16.7061 18.6512L13.2488 21.1631L14.5694 17.0988L14.6816 16.7533L14.3877 16.5398L10.9304 14.0279H15.2039H15.5672L15.6794 13.6824L17 9.61803Z" fill="${color}" stroke="${color}"/></svg>`;
	return { url: `data:image/svg+xml,${encodeURIComponent(svg)}`, scaledSize: new window.google.maps.Size(size, size), labelOrigin: new window.google.maps.Point(labelX, labelY) };
};

const dayStr = ["日", "月", "火", "水", "木", "金", "土"];
const StatusStr = ["販売中", "販売停止"];

// ----------コンポーネント----------
// ----------コンポーネント----------
// ----------コンポーネント----------

const FdevGoogleMapRegister = (props) => {
	const { state, setState } = React.useContext(MyContext);

	// defaultCenterとdefaultZoomを使うとスライドが無効になる
	const formData = props.formData;
	const setFormData = props.setFormData;
	// const [formData, setFormData] = useState({}); //コンポーネントごとの開発ならこれ使う

	const mapRef = React.useRef(null);
	const [isOnLoad, setIsOnLoad] = React.useState(true);
	const [locateStr, setLocateStr] = React.useState(getHomeStr());
	const [isgeoApiReq, setIsgeoApiReq] = React.useState(false);
	const [mapMarker, setMapMarker] = React.useState([]);
	const [mapHomeMarker, setMapHomeMarker] = React.useState([]);
	const [mapHomeGeo, setMapHomeGeo] = React.useState(getHomeGeo());
	const [mapClickGeo, setMapClickGeo] = React.useState(getHomeGeo());
	const [mapLineMarker, setMapLineMarker] = React.useState([]);
	const [mapClicklistener, setMapClickListener] = React.useState(null);
	const [intZoomMapState, setIntZoomMapState] = React.useState(parseFloat(12));

	const [mapOptionState, setMapOptionState] = React.useState(googleMapOptions_dict);

	function getHomeStr() {
		if ("campanyLocate" in state.userData) {
			return state.userData.campanyLocate.locate_name;
		}
		return "群馬県吾妻郡長野原町林林長野原線";
	}
	function getHomeGeo() {
		if ("campanyLocate" in state.userData) {
			return {
				latitude: state.userData.campanyLocate.latitude,
				longitude: state.userData.campanyLocate.longitude,
			};
		}
		return {
			latitude: 35.7836,
			longitude: 139.7203,
		};
	}

	function resetLineMarker() {
		// setStateを関数型にすることで同期式になる
		setMapLineMarker((mapLineMarker) => {
			mapLineMarker.forEach((marker) => {
				marker.setMap(null);
			});
			return [];
		});
	}

	function searchPlace2Geo() {
		if (!isgeoApiReq) {
			setIsgeoApiReq(true);
			getGsiCoordinates(locateStr)
				.then((geoDict) => {
					mapRef.current.map.panTo({ lat: geoDict.latitude, lng: geoDict.longitude });
					placeMarkerph2(geoDict);
					// setLocateStr(geoDict);
					setIsgeoApiReq(false);
				})
				.catch((error) => {
					console.error("エラー:", error);
					// setLocateStr("");
					setIsgeoApiReq(false);
				});
		}
	}

	function placeMarker(location) {
		const clicklnglat = {
			latitude: location.lat(),
			longitude: location.lng(),
		};
		placeMarkerph2(clicklnglat);
	}

	//再描画用関数
	function placeMarkerph2(location) {
		if (mapMarker) {
			mapMarker.forEach((marker) => {
				marker.setMap(null);
			});
			setMapMarker([]);
		}
		setMapClickGeo({
			latitude: location.latitude,
			longitude: location.longitude,
		});

		console.log("Marker placed at: ", location.latitude, location.longitude);
		if (mapLineMarker != []) {
			setMapLineMarker((mapLineMarker) => {
				mapLineMarker.forEach((marker) => {
					marker.setMap(null);
				});
				return [];
			});
		}

		var pushMarkerArray = mapMarker;
		var newMarker = new window.google.maps.Marker({
			position: { lat: location.latitude, lng: location.longitude }, // マーカーの位置
			map: mapRef.current.map, // マーカーを表示するマップ
			icon: svgToBase64DataURL(44, statusColorArray[0], 10, 30),
		});
		pushMarkerArray.push(newMarker);
		setMapMarker(pushMarkerArray);

		// Define a symbol using SVG path notation, with an opacity of 1.
		const lineSymbol = {
			path: "M 0,-1 0,1",
			strokeOpacity: 1,
			strokeColor: "#19774B",
			scale: 4,
		};

		const line = new window.google.maps.Polyline({
			path: [
				{ lat: mapHomeGeo.latitude, lng: mapHomeGeo.longitude },
				{ lat: location.latitude, lng: location.longitude },
			],
			strokeOpacity: 0,
			icons: [
				{
					icon: lineSymbol,
					offset: "0",
					repeat: "20px",
				},
			],
			map: mapRef.current.map,
		});
		setMapLineMarker((mapLineMarker) => [...mapLineMarker, line]);

		getGsiAddress({ latitude: location.latitude, longitude: location.longitude })
			.then((address) => {
				console.log("住所:", address);
				setLocateStr(address);
			})
			.catch((error) => {
				console.error("エラー:", error);
				setLocateStr("");
			});
	}

	function handleLoad(map) {
		//初期設定　handleOnTilesLoadedでもう一度設定
		mapRef.current = map;
		console.log(map);
	}

	function onDragEnd() {
		// console.log(mapRef.current.map.center.lat());
	}
	const handleOnTilesLoaded = (map) => {
		console.log("Tiles loaded");
		mapRef.current = map;
		var minZoom = 6;
		if (mapRef.current.map.zoom <= minZoom) {
			mapRef.current.map.zoom = minZoom;
		}

		if (isOnLoad) {
			// 最初期のロードだけ実行
			onLoadSetmarker();
			setIsOnLoad(false);

			if (new_mapClickListener == null) {
				var new_mapClickListener = mapRef.current.map.addListener("click", function (event) {
					placeMarker(event.latLng);
				});
				setMapClickListener(new_mapClickListener);
			}
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

		var pushHomeMarkerArray = mapHomeMarker;
		var newHomeMarker = new window.google.maps.Marker({
			position: { lat: posLat, lng: posLon }, // マーカーの位置
			map: mapRef.current.map, // マーカーを表示するマップ
			icon: svgToBase64DataURL(30, statusColorArray[1], 10, 30),
		});
		pushHomeMarkerArray.push(newHomeMarker);
		setMapHomeMarker(pushHomeMarkerArray);

		var pushMarkerArray = mapMarker;
		var newMarker = new window.google.maps.Marker({
			position: { lat: posLat, lng: posLon }, // マーカーの位置
			map: mapRef.current.map, // マーカーを表示するマップ
			icon: svgToBase64DataURL(44, statusColorArray[0], 10, 30),
		});
		pushMarkerArray.push(newMarker);
		setMapMarker(pushMarkerArray);
	}

	function removeMapMarker() {
		if (mapLineMarker != []) {
			setMapLineMarker((mapLineMarker) => {
				mapLineMarker.forEach((marker) => {
					marker.setMap(null);
				});
				return [];
			});
		}
		if (mapMarker) {
			mapMarker.forEach((marker) => {
				marker.setMap(null);
			});
			setMapMarker([]);
		}
		if (mapHomeMarker) {
			mapMarker.forEach((marker) => {
				marker.setMap(null);
			});
			setMapHomeMarker([]);
		}
	}

	function setnewcenter() {
		removeMapMarker();
		onLoadSetmarker();
		var resetGeo = getHomeGeo();
		setMapHomeGeo(resetGeo);
		setMapClickGeo(resetGeo);
		setLocateStr(getHomeStr());
		mapRef.current.map.panTo({ lat: mapHomeGeo.latitude, lng: mapHomeGeo.longitude });
	}

	// -------ここから描画------------

	const handleChange = (e) => {
		setLocateStr(e.target.value);
	};

	function newsetformData() {
		const newDataDict = { ...formData };
		newDataDict["locate_name"] = locateStr;
		newDataDict["longitude"] = mapClickGeo.longitude;
		newDataDict["latitude"] = mapClickGeo.latitude;
		setFormData(newDataDict);
	}

	return (
		<div>
			<div className="mapPositionFRegist">
				<APIProvider apiKey={state.googleMapApiKey}>
					<Map
						onLoad={(map) => handleLoad(map)} // マップがロードされたら参照をセット
						onTilesLoaded={(map) => handleOnTilesLoaded(map)}
						onDragEnd={onDragEnd} // ドラッグが終了したらonDragEndを呼ぶ
						style={{}}
						defaultCenter={{ lat: mapHomeGeo.latitude, lng: mapHomeGeo.longitude }}
						defaultZoom={intZoomMapState}
						gestureHandling={"greedy"}
						disableDefaultUI={false}
						options={mapOptionState}
					/>
				</APIProvider>
			</div>
			<div>
				<p className="c68-p2">
					緯度：{mapClickGeo.latitude}　経度：{mapClickGeo.longitude}
				</p>

				<div className="c68-div8">
					<div className="c68-div9">
						<div>
							<img src={"data:image/svg+xml," + encodeURIComponent(pinIcon16)} />
						</div>
						<input className="c68-inp3" type="text" name="locateStr" value={locateStr} onChange={handleChange} />
					</div>
					<div>
						<p className="c68-p5" onClick={searchPlace2Geo}>
							検索
						</p>
					</div>
				</div>
				<div className="c68-div12">
					<button className="c68-btn1 g-btn-clr2" onClick={setnewcenter}>
						クリア
					</button>
					<button className="c68-btn1 g-btn-clr3" onClick={newsetformData}>
						登録
					</button>
				</div>

				<p className="g-p12">受取場所</p>
				<p className="c68-p1">受取場所</p>

				<input className="g-inp" type="text" name="locateStr" value={formData.locate_name} placeholder="登録してください" />

				<p className="c68-p1">受渡場所に関する詳細情報</p>

				<textarea
					className="g-inp"
					type="text"
					name="locateStr"
					placeholder="例）農園入口を入ってすぐの玄関でチャイムを鳴らしておまちください。駐車場をご案内します。"
					value={formData.locate_discripsion}
					onChange={(e) => {
						setFormData({
							...formData,
							["locate_discripsion"]: e.target.value,
						});
					}}
				/>
				<p className="c68-p4">{formData.locate_discripsion.length}/120</p>
			</div>
		</div>
	);
};

export default FdevGoogleMapRegister;
