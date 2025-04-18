// 販売終了表示ロジック
// 検索窓修正
// デバック入力用のuseState削除

import React, { useEffect, useState, useContext } from "react";
import ReactDOM from "react-dom/client";
import { MyContext } from "../provider/MyContext";

import { useNavigate } from "react-router-dom";
import { myUrl } from "../route/MainRoute.js";

// googlemapライブラリ
import { APIProvider, Map } from "@vis.gl/react-google-maps";
import "../css/FdevGoogleMap.css";

//api群
const { getItemList, getItemWithId } = require("../api/get_data_req");
const { postItemPurchase } = require("../api/post_data_req");

// function群
const { renderStrTimeDate, renderStrTimeTime } = require("../js/ts_str");
const { funcSearchItemWithMarker } = require("../js/item_search_sort.js");
const req_base_url = require("../js/get_base_url");
const baseUrl = req_base_url();

const rankDisc = require("../img/rank_disc.png");

// 再レンダリングによる上書を防止
var googleMapOptions_dict = {};

// 動的マップに変更
googleMapOptions_dict = {
	draggable: true, // マップのドラッグ移動を無効にする
	disableDefaultUI: false, // デフォルトのUIを無効化（オプション）
	zoomControl: true, // ズームコントロールを無効化（オプション）
	mapTypeControl: false,
	fullscreenControl: false,
	streetViewControl: false,
};

// マーカーアイコン設定
const statusColorArray = ["#22BE75", "#B2B2B2"];

const svgToBase64DataURL = (size, color, labelX, labelY) => {
	const svg = `<svg width="${size}px" height="${size}px" viewBox="0 0 34 44" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M16 1.5H18C20.825 1.5 22.8536 1.50117 24.4458 1.63126C26.0206 1.75992 27.0361 2.00718 27.8589 2.42644C29.4583 3.24137 30.7586 4.5417 31.5736 6.14108C31.9928 6.96394 32.2401 7.97941 32.3687 9.55417C32.4988 11.1464 32.5 13.175 32.5 16V20.444C32.5 21.9337 32.4972 22.543 32.4366 23.0362C31.9609 26.9092 28.9092 29.9609 25.0362 30.4366C24.543 30.4972 23.9337 30.5 22.4439 30.5C22.4375 30.5 22.4306 30.5 22.4231 30.5C22.351 30.4998 22.234 30.4996 22.1177 30.5101C21.2907 30.5847 20.5547 31.0652 20.1535 31.7922C20.0971 31.8944 20.0502 32.0017 20.0213 32.0677C20.0183 32.0745 20.0155 32.0809 20.0129 32.0868L16.9802 38.9848C16.7888 39.42 16.6311 39.7769 16.4957 40.0705C16.3726 39.7716 16.2298 39.4084 16.0568 38.9655L13.394 32.152L13.3891 32.1393C13.372 32.0955 13.3443 32.0245 13.3127 31.9557C12.9268 31.1163 12.1095 30.5582 11.1872 30.5043C11.1116 30.4998 11.0354 30.4999 10.9884 30.5L10.9747 30.5C10.0418 30.5 9.66004 30.4989 9.34991 30.4751C5.16833 30.1544 1.84565 26.8317 1.5249 22.6501C1.50111 22.34 1.5 21.9582 1.5 21.0253V16C1.5 13.175 1.50117 11.1464 1.63126 9.55417C1.75992 7.97941 2.00718 6.96394 2.42644 6.14108C3.24137 4.5417 4.5417 3.24137 6.14108 2.42644C6.96394 2.00718 7.97941 1.75992 9.55417 1.63126C11.1464 1.50117 13.175 1.5 16 1.5ZM15.9429 41.0827C15.9429 41.0821 15.9475 41.0765 15.9569 41.0675C15.9476 41.0787 15.9429 41.0832 15.9429 41.0827ZM16.9924 41.089C17.0014 41.0984 17.0058 41.1043 17.0058 41.1048C17.0058 41.1054 17.0013 41.1007 16.9924 41.089Z" fill="white" stroke="${color}" stroke-width="3"/><path d="M17 9.61803L18.3206 13.6824L18.4328 14.0279H18.7961H23.0696L19.6123 16.5398L19.3184 16.7533L19.4306 17.0988L20.7512 21.1631L17.2939 18.6512L17 18.4377L16.7061 18.6512L13.2488 21.1631L14.5694 17.0988L14.6816 16.7533L14.3877 16.5398L10.9304 14.0279H15.2039H15.5672L15.6794 13.6824L17 9.61803Z" fill="${color}" stroke="${color}"/></svg>`;
	return { url: `data:image/svg+xml,${encodeURIComponent(svg)}`, scaledSize: new window.google.maps.Size(size, size), labelOrigin: new window.google.maps.Point(labelX, labelY) };
};

const FdevGoogleMap = (props) => {
	const { state, setState } = useContext(MyContext);

	// defaultCenterとdefaultZoomを使うとスライドが無効になる
	const [isOnLoad, setIsOnLoad] = useState(true);
	const [mapMarker, setMapMarker] = useState([]);
	const [textLatstate, setTextLatState] = useState(getHomeGeo().latitude);
	const [intLatMapState, setIntLatMapState] = useState(parseFloat(textLatstate));
	const [textLngstate, setTextLngState] = useState(getHomeGeo().longitude);
	const [intLngMapState, setIntLngMapState] = useState(parseFloat(textLngstate));
	const [textZoomstate, setTextZoomState] = useState("13");
	const [intZoomMapState, setIntZoomMapState] = useState(parseFloat(textZoomstate));
	function getHomeGeo() {
		if (state.isFirstload && "locate" in state.userData) {
			return {
				latitude: state.userData.locate.latitude,
				longitude: state.userData.locate.longitude,
			};
		}

		if (navigator.geolocation) {
			navigator.geolocation.getCurrentPosition(
				function (position) {
					return {
						latitude: position.coords.latitude,
						longitude: position.coords.longitude,
					};
				},
				function (error) {
					console.error("位置情報の取得に失敗しました。エラーコード: " + error.code);
				}
			);
		} else {
			console.error("このブラウザは位置情報取得をサポートしていません。");
		}

		return {
			latitude: 35.7836,
			longitude: 139.7203,
		};
	}

	const [mapOptionState, setMapOptionState] = useState(googleMapOptions_dict);
	// setMapOptionState(googleMapOptions_dict)

	function handleLoad(map) {
		//初期設定　handleOnTilesLoadedでもう一度設定
		mapRef.current = map;
	}

	function onDragEnd() {
		// console.log(mapRef.current.map.center.lat());
	}

	const handleOnTilesLoaded = (map) => {
		console.log("Tiles loaded");
		console.log(map.map);
		// console.log(map.map.center.lat());
		// console.log(map.map.center.lng());
		// mapRef.current.getCenter().toJSON();
		// console.log(map.map.mapTypeId);
		mapRef.current = map;
		// console.log(map.map.data.map.zoom);
		// mapRef.current.map.data.map.zoom = 12;
		var minZoom = 6;
		if (mapRef.current.map.zoom <= minZoom) {
			mapRef.current.map.zoom = minZoom;
		}
		removeMapMarker();
		onLoadSetmarker(); //常時更新
		if (isOnLoad) {
			// 最初期のロードだけ実行
			// onLoadSetmarker();
			setIsOnLoad(false);

			if (navigator.geolocation) {
				navigator.geolocation.getCurrentPosition(
					function (position) {
						mapRef.current.map.panTo({
							lng: position.coords.longitude,
							lat: position.coords.latitude,
						});
					},
					function (error) {
						console.error("位置情報の取得に失敗しました。エラーコード: " + error.code);
					}
				);
			} else {
				console.error("このブラウザは位置情報取得をサポートしていません。");
			}
		}
	};

	// マップにマーカーを描画
	function onLoadSetmarker() {
		var isUpdate = false;
		var posLat = "";
		var posLon = "";
		var pushMarkerArray = mapMarker;

		var absLat = 0.01;
		var absLng = 0.01;
		itemDataArray.forEach((dataDict, index) => {
			if (dataDict["item_locate_latitude"] > 80) {
				posLat = dataDict["item_locate_longitude"];
				posLon = dataDict["item_locate_latitude"];
			} else {
				posLat = dataDict["item_locate_latitude"];
				posLon = dataDict["item_locate_longitude"];
			}

			absLat = Math.abs(mapRef.current.map.center.lat() - posLat);
			absLng = Math.abs(mapRef.current.map.center.lng() - posLon);
			if (absLat < 2 && absLng < 2) {
				var newMarker = new window.google.maps.Marker({
					position: { lat: posLat, lng: posLon }, // マーカーの位置
					map: mapRef.current.map, // マーカーを表示するマップ
					icon: svgToBase64DataURL(44, statusColorArray[dataDict.sale_state], 10, 30),
				});

				// マーカーがクリックされたときに InfoWindow を表示
				newMarker.markerIndex = dataDict["index4marker"];
				newMarker.addListener("click", () => {
					funcitemSelect(newMarker.markerIndex);
				});
				pushMarkerArray.push(newMarker);
				isUpdate = true;
			}
		});
		if (isUpdate) {
			setMapMarker(pushMarkerArray);
		}
	}
	function removeMapMarker() {
		if (mapMarker) {
			mapMarker.forEach((marker) => {
				marker.setMap(null);
			});
			setMapMarker([]);
		}
	}

	// マップの参照を取得
	const mapRef = React.useRef(null);
	const navigate = useNavigate();

	// -------ここから描画------------

	const [itemDataArray, setItemDataArray] = useState([]);
	const [itemSelectDict, setItemSelectDict] = useState({});
	const [isItemSelectDict, setIsItemSelectDict] = useState(false);

	// 商品リクエスト後の描画データ格納
	useEffect(() => {
		setItemDataArray(updateItemDataArray(props.reqItemList, "")); // 検索&mapマーカーのための内部index貼り付け
		onLoadSetmarker();
	}, [props.reqItemList]);

	function updateItemDataArray(dataArray, searchStr) {
		try {
			setIsItemSelectDict(false);
		} catch (error) {
			// console.log(error);
		}
		return funcSearchItemWithMarker(dataArray, searchStr);
	}

	function funcMoveItemDetail(item_id) {
		navigate(myUrl("b_i_find_d") + "?item_id=" + String(item_id));
	}
	function submitSearch(e) {
		if (e.key === "Enter") {
			e.preventDefault(); // Enterキー入力を他に伝搬させないために
			setItemDataArray(updateItemDataArray(props.reqItemList, e.target.value));
		}
	}
	useEffect(() => {
		try {
			removeMapMarker();
			onLoadSetmarker();
		} catch (error) {
			// console.log(error);
		}
	}, [itemDataArray]);

	function funcitemSelect(index4marker) {
		itemDataArray.forEach((itemDataDict) => {
			if (itemDataDict.index4marker === index4marker) {
				setItemSelectDict(itemDataDict);
				setIsItemSelectDict(true);
			}
		});
	}

	const [isModalOpen, setIsModalOpen] = useState(false);
	const handleCloseModal = () => {
		setIsModalOpen(false);
	};

	return (
		<>
			<div className="c84-div23">
				<div className="mapPosition">
					<p className="mapPositionPInputM">
						<input className="mapPositionInputM" type="text" onKeyDown={submitSearch} />
					</p>

					<APIProvider apiKey={state.googleMapApiKey}>
						<Map
							onLoad={(map) => handleLoad(map)} // マップがロードされたら参照をセット
							onTilesLoaded={(map) => handleOnTilesLoaded(map)}
							onDragEnd={onDragEnd} // ドラッグが終了したらonDragEndを呼ぶ
							style={{}}
							defaultCenter={{ lat: intLatMapState, lng: intLngMapState }}
							defaultZoom={intZoomMapState}
							gestureHandling={"greedy"}
							disableDefaultUI={false}
							options={mapOptionState}
						/>
					</APIProvider>
				</div>
				<div className="c84-div1">
					{isItemSelectDict && (
						<>
							<div
								className="c84-div2"
								onClick={() => {
									funcMoveItemDetail(itemSelectDict.id);
								}}
							>
								<div>
									<p className="c84-p1 g-over1">{itemSelectDict.name}</p>

									<div className="c84-div3">
										<div className="c84-div8">
											<p className="c84-p2 g-over1">{itemSelectDict.locate_name}</p>
											<p className="c84-p3 g-over1">{itemSelectDict.campany_name}</p>
											<div className="c84-div12">
												{/* <p className="c84-p5 g-over1">{itemSelectDict.seller_user_name}</p> */}
												<p className="c84-p5 g-over1">　</p>

												<p className="c84-p6 g-over1">取引実績: {itemSelectDict.seller_user_stats_trade_count}</p>

												<p></p>

												<div className="c84-div5">
													<img
														className="c84-div5img2"
														src={baseUrl + itemSelectDict.seller_user_image_url}
														alt=""
														onClick={(e) => {
															e.stopPropagation();
															setIsModalOpen(true);
														}}
													/>
												</div>
											</div>
										</div>
										<div className="c84-div4">
											<img className="c84-div4img1" src={baseUrl + itemSelectDict.image_url} alt="" />
										</div>
									</div>
								</div>
							</div>
						</>
					)}
				</div>
			</div>
			{isModalOpen && (
				<div className="modalStyle" onClick={handleCloseModal}>
					<div className="modalContentStyle">
						<p>グレードとは、グレードです。</p>
						<img src={rankDisc} />

						<button id="kakunin2" onClick={handleCloseModal}>
							閉じる
						</button>
					</div>
				</div>
			)}
		</>
	);
};

export default FdevGoogleMap;
