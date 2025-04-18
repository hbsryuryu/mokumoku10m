import React, { useContext, useState, useEffect } from "react";
import { MyContext } from "../provider/MyContext";
import { MainRoute } from "../route/MainRoute";

const { get_user_profile_req } = require("../api/get_data_req.js");

function Loader() {
	const { state, setState } = useContext(MyContext);
	const [isDoneLoad, setIsDoneLoad] = useState(false);
	// if (isDoneLoad) {
	// 	document.body.style.backgroundColor = "#fff";
	// } else {
	// 	document.body.style.backgroundColor = "#eee";
	// }

	useEffect(() => {
		if (navigator.geolocation) {
			navigator.geolocation.getCurrentPosition(
				function (position) {
					const newState = { ...state };
					newState["userData"]["locate"] = {
						locateName: "",
						longitude: position.coords.longitude,
						latitude: position.coords.latitude,
						isUseGeoApi: true,
					};
					setState(newState);
				},
				function (error) {
					console.error("位置情報の取得に失敗しました。エラーコード: " + error.code);
				}
			);
		} else {
			console.error("このブラウザは位置情報取得をサポートしていません。");
		}
		get_user_profile_req()
			.then((dataDict) => {
				var newDict = { ...state };
				newDict["userData"] = dataDict;
				setState(newDict);
				setIsDoneLoad(true);
			})
			.catch((error) => {
				if (!state.userData.is_guest) {
					var newDict = { ...state };
					newDict["userData"]["is_guest"] = true;
					newDict["userData"]["is_seller"] = false;
					setState(newDict);
				}
				setIsDoneLoad(true);
			});
	}, []);
	//ここにスプラッシュの関数
	return isDoneLoad && <MainRoute />;
}

export default Loader;
