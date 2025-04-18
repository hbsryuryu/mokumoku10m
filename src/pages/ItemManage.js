// 販売終了や下書きステータス表示
// 時間ソート

import React, { useContext, useState, useEffect } from "react";
import { MyContext } from "../provider/MyContext";
import { Link } from "react-router-dom";

import { useNavigate } from "react-router-dom";
import { myUrl } from "../route/MainRoute.js";

// component群
import SupplierFooter from "../components/SupplierFooter";
import CommonHeader from "../components/CommonHeader.js";

//css群
import "../css/c86_ItemManage.css";

//api群
const { getItemList, getItemWithUserId, getMyOrderItemList, get_user_profile_req } = require("../api/get_data_req");
const { postItemPurchase } = require("../api/post_data_req");

// function群
const { renderStrTimeDate, renderStrTimeTime, renderStrYYYYMMDD } = require("../js/ts_str.js");
const { int2currencyStr } = require("../js/currency_str.js");
const { funcCountSumOrder, funcSortItemIsDone, funcIsNullDataArray, displayStatus, funcIsNullDataDict, funcCountSumOrderPrice, IntCountUpOrder } = require("../js/item_search_sort.js");
const req_base_url = require("../js/get_base_url.js");
const baseUrl = req_base_url();

const statusStr = ["販売中", "販売停止"];

const ItemManage = () => {
	const { state, setState } = useContext(MyContext);
	const [itemDataArray, setItemDataArray] = useState([]);

	useEffect(() => {
		window.scrollTo(0, 0);
		if ("is_guest" in state.userData && state.userData.is_guest) {
			get_user_profile_req()
				.then((dataDict) => {
					var newDict = { ...state };
					newDict["userData"] = dataDict;
					setState(newDict);
					window.scrollTo(0, 0);
					getItemWithUserId(dataDict.id)
						.then((return_array) => {
							setItemDataArray(return_array);
						})
						.catch((error) => {
							// console.error(error);
						});
				})
				.catch((error) => {
					// alert("Logout failed");
				});
		} else {
			getItemWithUserId(state.userData.id)
				.then((return_array) => {
					setItemDataArray(return_array);
				})
				.catch((error) => {
					// console.error(error);
				});
		}
	}, []);
	// var sortedNewArray = newArray.sort((a, b) => a.timeStampStart - b.timeStampStart);

	const navigate = useNavigate();
	function funcMoveItemDetail(item_id) {
		navigate(myUrl("s_i_mana_d") + "?item_id=" + String(item_id));
	}

	return (
		<>
			<CommonHeader />
			<p className="g-titlebar2">出品した商品</p>
			{!state.userData.is_seller && (
				<>
					<p className="c88-p9">出品者アカウントでログインしてください。</p>
				</>
			)}
			{state.userData.is_seller && funcIsNullDataArray(itemDataArray) && (
				<>
					<p className="c88-p9">出品履歴はありません</p>
				</>
			)}
			{state.userData.is_seller &&
				itemDataArray.map((item, index) => (
					<div
						className="c86-div2"
						key={index}
						onClick={() => {
							funcMoveItemDetail(item.id);
						}}
					>
						<p className="c86-p5">{statusStr[item.sale_state]}</p>
						<div className="c86-div1">
							<div className="c86-div3">
								<img className="c86-div3img" src={baseUrl + item.image_url} alt="" />
							</div>
							<div>
								<div className="c86-div4">
									<p className="c86-p4">出品ID</p>
									<p className="c86-p1 g-over1">{item.id}</p>
								</div>

								<div className="c86-div4">
									<p className="c86-p4">商品名</p>
									<p className="c86-p1 g-over2">{item.name}</p>
								</div>

								<div className="c86-div4">
									<p className="c86-p4">販売金額</p>
									<p className="c86-p1">{int2currencyStr(item.bulk_price)} / セット</p>
								</div>

								<div className="c86-div4">
									<p key={0} className="c86-p4">
										販売日程
									</p>
									<div>
										{"times" in item &&
											item["times"].map((time, index) => (
												<React.Fragment key={index}>
													{index < 4 && <p className="c86-p1">{renderStrYYYYMMDD(time.start_ts)}</p>}
													{index == 4 && <p className="c86-p1">他1日</p>}
												</React.Fragment>
											))}
									</div>
								</div>

								<div className="c86-div4">
									<p className="c86-p4">販売上限</p>
									<p className="c86-p1">
										{IntCountUpOrder(item.orders)} / {item.order_limit_count}
									</p>
								</div>
							</div>
						</div>
					</div>
				))}

			<SupplierFooter colorArray={[0, 1, 0, 0]} />
		</>
	);
};

export default ItemManage;
