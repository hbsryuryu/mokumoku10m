import React from "react";
import { useNavigate } from "react-router-dom";
import { myUrl } from "../route/MainRoute.js";
import FooterLink from "../components/FooterLink.js";

import "../css/c5_BuyerFindSearchList.css";

//api群
const { getItemList, getItemWithId } = require("../api/get_data_req");

// function群
const { funcSearchItemWithMarker } = require("../js/item_search_sort.js");
const { int2currencyStr } = require("../js/currency_str.js");
const req_base_url = require("../js/get_base_url");
const baseUrl = req_base_url();

const BuyerFindSearchList = (props) => {
	const navigate = useNavigate();
	const [itemDataArray, setItemDataArray] = React.useState([]);

	// 商品リクエスト後の描画データ格納
	React.useEffect(() => {
		setItemDataArray(funcSearchItemWithMarker(props.reqItemList, ""));
	}, [props.reqItemList]);

	function funcMoveItemDetail(item_id) {
		navigate(myUrl("b_i_find_d") + "?item_id=" + String(item_id));
	}
	function submitSearch(e) {
		if (e.key === "Enter") {
			e.preventDefault(); // Enterキー入力を他に伝搬させないために
			setItemDataArray(funcSearchItemWithMarker(props.reqItemList, e.target.value));
		}
	}

	return (
		<div className="mapPosition">
			<p className="mapPositionPInput">
				<input className="mapPositionInput" type="text" onKeyDown={submitSearch} />
			</p>
			<br />
			<div className="c5-itemdiv1">
				{itemDataArray.map((item, index) => (
					<div className="c5-itemdiv2">
						<div className="c5-itemdiv3">
							<div
								key={index}
								className="test"
								onClick={() => {
									funcMoveItemDetail(item.id);
								}}
							>
								<div className="tset">
									<img className="c5-itemdiv3img" src={baseUrl + item.image_url} alt="" />
								</div>

								<div className="c5-itemdiv4">
									<p className="g-over2">{item.name}</p>
									<div className="c5-div9">
										<p className="c5-p4">{item.bulk_1set_count}</p>
										<p className="c5-p3">{int2currencyStr(item.bulk_price)}</p>
									</div>

									{/* <p>Status: {StatusStr[item.saleState]}</p> */}
								</div>
								<div className="c5-itemdiv6">
									<div className="c5-itemdiv7">
										<img className="c5-itemdiv7img" src={baseUrl + item.seller_user_image_url} alt="" />
									</div>
									<div className="c5-itemdiv8">
										<p className="c5-p8 g-over1"> {item.campany_locate_name}</p>
										<p className="c5-p9 g-over1">{item.campany_name}</p>
									</div>
								</div>
							</div>
						</div>
					</div>
				))}
			</div>
			<FooterLink />
		</div>
	);
};

export default BuyerFindSearchList;
