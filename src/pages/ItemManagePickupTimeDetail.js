import React, { useContext, useState, useEffect } from "react";
import { MyContext } from "../provider/MyContext";
import { useNavigate } from "react-router-dom";
import { myUrl } from "../route/MainRoute.js";
import { useSearchParams } from "react-router-dom";

// component群
import SupplierFooter from "../components/SupplierFooter";
import FdevGoogleMapMini from "../components/FdevGoogleMapMini";
import CommonHeader from "../components/CommonHeader.js";

//css群
import "../css/c76_ItemManagePickupTimeDetail.css";

//api群
const { getItemList, getMyOrderItemList, getItemWithId } = require("../api/get_data_req");
const { postItemPurchase } = require("../api/post_data_req");

// function群
const { renderStrTimeDate, renderStrTimeTime, renderStrYYYYMMDD, funcNowTimeStr } = require("../js/ts_str.js");
const { funcCountSumOrder, displayStatus, displayOrderCountWithCancel, funcIsNullDataDict } = require("../js/item_search_sort.js");
const { int2currencyStr } = require("../js/currency_str.js");
const req_base_url = require("../js/get_base_url.js");
const baseUrl = req_base_url();

const statusStr = ["販売中", "販売停止"];

const ItemManagePickupTimeDetail = () => {
	const { state, setState } = useContext(MyContext);
	const [searchParams] = useSearchParams();

	const [itemDataDict, setItemDataDict] = useState({});
	const [itemOrderCount, setItemOrderCount] = useState(0);
	const item_id = searchParams.get("item_id");

	useEffect(() => {
		window.scrollTo(0, 0);
		if (item_id !== null || item_id !== "" || typeof item_id !== "string") {
			getItemWithId(item_id)
				.then((return_array) => {
					if (return_array.length !== 0) {
						setItemDataDict(return_array[0]); //stateに商品データ格納
						setItemOrderCount(funcCountSumOrder(return_array[0])); //stateに総発注数格納
					}
				})
				.catch((error) => {
					// console.error(error);
				});
		}
	}, []);

	// ボタンの状態を管理するためのuseStateフック
	const [activeButton, setActiveButton] = React.useState(false);
	const handleButtonClick = (button) => {
		if (activeButton !== button) {
			setActiveButton(button);
		}
	};
	const navigate = useNavigate();
	function move2itemEdit() {
		navigate(myUrl("s_i_edit") + "?item_id=" + String(item_id));
	}

	return (
		<>
			<div>
				<CommonHeader />
				<p className="g-titlebar2">出品した商品</p>
				<div className="switch">
					<button className={activeButton === false ? "active" : ""} onClick={() => handleButtonClick(false)}>
						商品情報
					</button>
					<button className={activeButton === true ? "active" : ""} onClick={() => handleButtonClick(true)}>
						販売状況
					</button>
				</div>
				{Object.keys(itemDataDict).length !== 0 && !activeButton && (
					<>
						<div className="">
							<p className="g-p12">商品情報</p>

							<div className="c76-div12">
								<img className="c76-div12img" src={baseUrl + itemDataDict.image_url} alt="" />
							</div>

							<p className="c76-p1">商品名</p>
							<p className="c76-p23">{itemDataDict.name}</p>
							<p className="c76-p3">{itemDataDict.name.length}/40</p>

							<div>
								<p className="c76-p1">商品説明</p>
								<p className="c76-p23">{itemDataDict.discripsion}</p>
								<p className="c76-p3">{itemDataDict.discripsion.length}/1000</p>
							</div>

							<p className="c76-p1">数量</p>
							<div className="c76-div23">
								<p className="c76-p25">{itemDataDict.bulk_1set_count}</p>
								<span>/ セット</span>
							</div>

							<p className="c76-p1">価格</p>
							<div className="c76-div23">
								<p className="c76-p25">{itemDataDict.bulk_price}</p>
								<span>/ セット</span>
							</div>

							<p className="c76-p1">販売上限</p>
							<div className="c76-div23">
								<p className="c76-p25">{itemDataDict.order_limit_count}</p>
								<span>/ セット</span>
							</div>

							<p className="c76-p1">販売ステータス</p>

							<p className="c76-p23 c76-p26">{statusStr[itemDataDict.sale_state]}</p>

							<p className="g-p12">受渡日程</p>
							<div className="c76-div28">
								{itemDataDict["times"].length !== 0 &&
									itemDataDict["times"].map((time, index) => (
										<p key={index} className="c76-p16">
											<span>{renderStrTimeDate(time.start_ts) + "  " + renderStrTimeTime(time.start_ts) + "  ～  " + renderStrTimeTime(time.end_ts)}</span>
										</p>
									))}
							</div>

							<p className="g-p12">受渡場所：</p>

							<p className="c76-p1">受渡場所</p>
							<p className="c76-p23">{itemDataDict.item_locate_name}</p>
							<p className="c76-p1">受渡場所に関する詳細情報</p>
							<p className="c76-p23">{itemDataDict.item_locate_discripsion}</p>
							<p className="c76-p3">{itemDataDict.item_locate_discripsion.length}/120</p>
						</div>
						<div className="c76-div36">
							<FdevGoogleMapMini latitude={itemDataDict.item_locate_latitude} longitude={itemDataDict.item_locate_longitude} />
						</div>

						<button onClick={move2itemEdit} className="g-btn1 g-btn-clr3 g-btn-sp1">
							編集する
						</button>

						<button className="g-btn1 g-btn-clr2 g-btn-sp1">戻る</button>
					</>
				)}
				{!funcIsNullDataDict(itemDataDict) && activeButton && (
					<>
						<div className="c76-div39">
							<p className="c76-p38">{funcNowTimeStr()}現在</p>

							<div className="c86-div2">
								<p className="c86-p5">{statusStr[itemDataDict.sale_state]}</p>
								<div className="c86-div1">
									<div className="c86-div3">
										<img className="c86-div3img" src={baseUrl + itemDataDict.image_url} alt="" />
									</div>
									<div>
										<div className="c86-div4">
											<p className="c86-p4">出品ID</p>
											<p className="c86-p1">{itemDataDict.id}</p>
										</div>

										<div className="c86-div4">
											<p className="c86-p4">商品名</p>
											<p className="c86-p1 g-over2">{itemDataDict.name}</p>
										</div>

										<div className="c86-div4">
											<p className="c86-p4">販売金額</p>
											<p className="c86-p1">{int2currencyStr(itemDataDict.bulk_price)} /SET</p>
										</div>

										<div className="c86-div4">
											<p className="c86-p4">販売日程</p>
											<div>
												{"times" in itemDataDict &&
													itemDataDict["times"].map((time, index) => (
														<>
															{index < 4 && (
																<p key={index} className="c86-p1">
																	{renderStrYYYYMMDD(time.start_ts)}
																</p>
															)}
															{index === 4 && (
																<p key={index} className="c86-p1">
																	他1日
																</p>
															)}
														</>
													))}{" "}
											</div>
										</div>

										<div className="c86-div4">
											<p className="c86-p4">販売上限</p>
											<p className="c86-p1"> {String(itemOrderCount) + " / " + String(itemDataDict.order_limit_count)}</p>
										</div>
									</div>
								</div>
							</div>
							<p className="c76-p39">
								<span>売上金額</span>
								<span className="c76-span5 g-bold-ff"> {int2currencyStr(itemOrderCount * itemDataDict.bulk_price)}</span>
							</p>
						</div>

						{"times" in itemDataDict &&
							itemDataDict["orders"].map(
								(order, orderIndex) =>
									true && (
										<div className="c76-div43" key={orderIndex}>
											<div className="c76-div46">
												<p className="c76-p45">決済日付</p>
												<p className="c76-p46">{renderStrYYYYMMDD(order.pay_ts)}</p>
											</div>
											<div className="c76-div46">
												<p className="c76-p45">購入ID</p>
												<p className="c76-p46">{order.id}</p>
											</div>
											<div className="c76-div46">
												<p className="c76-p45">受取状況</p>
												<p className="c76-p46">{displayStatus(order)}</p>
											</div>
											<div className="c76-div46">
												<p className="c76-p45">数量</p>
												<p className="c76-p46">{displayOrderCountWithCancel(order)}</p>
											</div>
											<div className="c76-div46">
												<p className="c76-p45">金額</p>
												<p className="c76-p46">{int2currencyStr(itemDataDict.bulk_price * order.order_count)}</p>
											</div>
										</div>
									)
							)}
						{"times" in itemDataDict && funcIsNullDataDict(itemDataDict) && (
							<>
								<p className="c76-p9">販売履歴はありません</p>
							</>
						)}
					</>
				)}
			</div>

			<SupplierFooter colorArray={[0, 1, 0, 0]} />
		</>
	);
};

export default ItemManagePickupTimeDetail;
