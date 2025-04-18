// 売り切れ表示
// 販売中止などの一覧
// 検索窓移動

import React, { useState, useEffect, useContext } from "react";
import { MyContext } from "../provider/MyContext";

// component群
import FdevGoogleMap from "../components/FdevGoogleMap";
import BuyerFindSearchList from "../components/BuyerFindSearchList";
import BuyerFooter from "../components/BuyerFooter";
import CommonHeader from "../components/CommonHeader.js";

//api群
const { getItemList } = require("../api/get_data_req");

const BuyerFindSearch = () => {
	// ボタンの状態を管理するためのuseStateフック
	const [activeButton, setActiveButton] = useState(false);
	const [reqItemList, setReqItemList] = useState([]);
	useEffect(() => {
		getItemList()
			.then((return_array) => {
				setReqItemList(return_array);
			})
			.catch((error) => {
				console.error(error);
			});
	}, []);

	const handleButtonClick = (button) => {
		if (activeButton != button) {
			setActiveButton(button);
		}
	};

	return (
		<>
			<CommonHeader />
			<div>
				<div className="switch">
					<button className={activeButton === false ? "active" : ""} onClick={() => handleButtonClick(false)}>
						地図から探す
					</button>
					<button className={activeButton === true ? "active" : ""} onClick={() => handleButtonClick(true)}>
						リストから探す
					</button>
				</div>
				{activeButton === false ? <FdevGoogleMap reqItemList={reqItemList} /> : <BuyerFindSearchList reqItemList={reqItemList} />}
			</div>
			<BuyerFooter colorArray={[1, 0, 0]} />
		</>
	);
};

export default BuyerFindSearch;
