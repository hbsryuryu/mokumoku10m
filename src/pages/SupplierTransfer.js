// 入金期日の修正
// 振込ボタンの実装
// キャンセルデータの排除
// 管理画面　ユーザー名と振込したかどうか

import React, { useContext, useState, useEffect } from "react";
import { MyContext } from "../provider/MyContext";
import { Link } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import { myUrl } from "../route/MainRoute.js";
import { useSearchParams } from "react-router-dom";

// component群
import SupplierFooter from "../components/SupplierFooter";
import CommonHeader from "../components/CommonHeader.js";

//css群
import "../css/c88_SupplierSalesManagement.css";

//api群
const { getItemList, getMyOrderItemList, getItemWithId, getMysaleOrderItemList } = require("../api/get_data_req");
const { postItemPurchase } = require("../api/post_data_req");

// function群
const { renderStrTimeDate, renderStrTimeTime, renderStrYYYYMMDD, funcNowTimeStr } = require("../js/ts_str.js");
const { funcCountSumOrder, funcSortItemIsDone, funcIsNullDataArray, displayStatus, funcIsNullDataDict, funcCountSumOrderPrice } = require("../js/item_search_sort.js");
const { int2currencyStr } = require("../js/currency_str.js");
const req_base_url = require("../js/get_base_url.js");
const baseUrl = req_base_url();

const SupplierTransfer = () => {
	const { state, setState } = useContext(MyContext);

	// 更新はstateそのものなので、更新関数不要
	const [orderDataArray, setOrderDataArray] = useState([]);
	const [itemListFromApi, setItemListFromApi] = useState([]);

	useEffect(() => {
		window.scrollTo(0, 0);
		getMysaleOrderItemList()
			.then((return_array) => {
				// var update_array = funcSortItemIsDone(return_array, false);
				setItemListFromApi(return_array);
				setOrderDataArray(return_array);
			})
			.catch((error) => {
				// console.error(error);
			});
	}, []);

	return (
		<>
			<div>
				<CommonHeader />
				<p className="g-titlebar2">売上管理</p>

				<p className="c88-p56">
					<span className="c88-span7">　</span>
					<span>{renderStrYYYYMMDD(new Date())}</span>
					<span className="c88-span8">　</span>
				</p>

				<div className="c88-div39">
					<p className="c88-p38">{funcNowTimeStr()}現在</p>
					<div className="c88-div40">
						<p className="c88-p39">
							<span>入金期日</span>
							<span className="c88-span6"> {renderStrYYYYMMDD(new Date())}</span>
						</p>
						<p className="c88-p39">
							<span>入金金額</span>
							<span className="c88-span5 g-bold-ff"> {int2currencyStr(funcCountSumOrderPrice(orderDataArray))}</span>
						</p>
					</div>
				</div>
				{!funcIsNullDataArray(orderDataArray) && (
					<>
						<div className="c88-div45">
							<button>振込申請する</button>
						</div>
					</>
				)}

				{!funcIsNullDataArray(orderDataArray) &&
					orderDataArray.map((order, orderIndex) => (
						<div className="c88-div43" key={orderIndex}>
							<div className="c88-div46">
								<p className="c88-p45">{order.id}</p>
							</div>

							<div className="c88-div46">
								<p className="c88-p45">{renderStrYYYYMMDD(order.reciece_ts)}</p>
								<p className="c88-p46">{int2currencyStr(order.items[0].bulk_price * order.order_count)}</p>
							</div>
						</div>
					))}
				{funcIsNullDataArray(orderDataArray) && (
					<>
						<p className="c88-p9">販売履歴はありません</p>
					</>
				)}
			</div>

			<SupplierFooter colorArray={[0, 0, 1, 0]} />
		</>
	);
};

export default SupplierTransfer;
