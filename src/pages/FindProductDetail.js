// 次へ進むロジックの実装
// 1以下の場合、ボタンをグレーアウト

import React, { useContext, useState, useEffect } from "react";
import { MyContext } from "../provider/MyContext";

import { useNavigate } from "react-router-dom";
import { myUrl } from "../route/MainRoute.js";
import { useSearchParams } from "react-router-dom";

// component群
import BuyerFooter from "../components/BuyerFooter";
import FdevGoogleMapMini from "../components/FdevGoogleMapMini";
import CommonHeader from "../components/CommonHeader.js";

//css群
import "../css/c8_FindProductDetail.css";

//api群
const { getItemList, getItemWithId } = require("../api/get_data_req.js");

// function群
const { renderStrTimeDate, renderStrTimeTime } = require("../js/ts_str.js");
const req_base_url = require("../js/get_base_url.js");
const { funcSortTimes } = require("../js/item_search_sort.js");
const baseUrl = req_base_url();

const zeiStr = "(税込)";
const StatusStr = ["販売中", "販売停止"];

const FindProductDetail = () => {
	// 注意再レンダリングでここから下すべて再実行される

	//MyContext.Provider経由でstateと更新用setStateをMyContextから読み込んで、
	// stateをこちら側ではstateで変数定義,setStateをこちら側ではsetStateで変数定義
	const { state, setState } = useContext(MyContext);
	const navigate = useNavigate();

	const [searchParams] = useSearchParams();
	const [itemDataDict, setItemDataDict] = useState({});
	const [itemOrderCount, setItemOrderCount] = useState(0);
	const [isRegisterDict, setIsRegisterDict] = useState({});

	useEffect(() => {
		window.scrollTo(0, 0);
		getItemWithId(searchParams.get("item_id"))
			.then((return_array) => {
				console.log(return_array);
				if (return_array.length !== 0) {
					const sortTimeItemDict = funcSortTimes(return_array[0]);
					setItemDataDict(sortTimeItemDict); //stateに商品データ格納
					setItemOrderCount(funcCountSumOrder(sortTimeItemDict)); //stateに総発注数格納
					setIsRegisterDict(createFirstDict(sortTimeItemDict)); // チェックボタンをlocalIdで管理
				}
			})
			.catch((error) => {
				console.error(error);
			});
	}, []);

	function funcCountSumOrder(itemDict) {
		var orderCount = 0;
		if ("orders" in itemDict) {
			itemDict["orders"].forEach((orderDict) => {
				orderCount += orderDict.order_count;
			});
		}
		return orderCount;
	}

	// 受渡日程ソート機能付き
	function createFirstDict(itemDict) {
		var newDict = {};
		if ("times" in itemDict) {
			itemDict["times"].forEach((time) => {
				newDict[String(time.id)] = false;
			});
		}
		return newDict;
	}
	function pushIsRegisterDict(index, boolean) {
		var newDict = isRegisterDict;
		// 一つだけ選ぶので他初期化
		Object.keys(newDict).map((key) => {
			newDict[key] = false;
		});
		newDict[String(index)] = boolean;
		setIsRegisterDict(newDict);
		console.log(newDict);
		reRenderForm();
	}
	// チェックボタンを再描画させるためのダミー
	function reRenderForm() {
		setItemDataDict({
			...itemDataDict,
			["isreRenderDummy"]: !itemDataDict["isreRenderDummy"],
		});
	}
	const [formData, setFormData] = useState({
		field1: 1,
		field2: "",
	});
	const handleChange = (e) => {
		const { name, value } = e.target;
		setFormData({
			...formData,
			[name]: value,
		});
	};

	function push2StateBuyitemInfo() {
		var isError = false;
		var postDict = {};
		if (formData.field1 == "" || formData.field1 == 0) {
			isError = true;
		} else {
			// チェック識別に使ったitem_time_idをmap
			Object.keys(isRegisterDict).map((key) => {
				if (isRegisterDict[key]) {
					postDict = {
						item_id: itemDataDict.id, //一括出品グループ
						localLocateId: String(key), //詳細時間の２つで特定
						item_time_id: String(key), //詳細時間の２つで特定
						order_count: formData.field1,
						isPaySubmit: false,
					};
				}
			});
		}

		if (!isError && postDict != {}) {
			// console.log("次のステップへ");
			setState({
				...state,
				["selectBuyItem"]: postDict,
			});
			funcMove2paymants(postDict);
		} else {
			alert("必要な項目を入力してください");
		}
	}
	function funcMove2paymants(postDict) {
		navigate(myUrl("b_i_find_p_cf") + "?item_id=" + String(postDict.item_id) + "&item_time_id=" + String(postDict.item_time_id) + "&order_count=" + String(postDict.order_count));
	}

	return (
		<>
			{Object.keys(itemDataDict).length !== 0 && (
				<>
					<CommonHeader />
					<div className="c8-div5">
						<p className="c8-p5">商品詳細</p>
						<div className="c8-div8">
							<img className="c8-div8img" src={baseUrl + itemDataDict.image_url} alt="" />
						</div>

						<div className="c8-div9">
							<p className="c8-p6 g-over2">{itemDataDict.item_name}</p>
							<div className="c8-div11">
								<div>
									<p className="c8-p7 g-bold-ff">
										{Number(itemDataDict.bulk_price).toLocaleString("ja-JP", { style: "currency", currency: "JPY" })}
										<span className="c8-span5">{zeiStr}</span>
									</p>
								</div>
								<div>
									<p>セット数量: {itemDataDict.bulk_1set_count}</p>
									<p className="c8-p8">残り {itemDataDict.order_limit_count - itemOrderCount}</p>
									{/* <p>販売数: {itemOrderCount} / セット</p> */}
									{/* <p>販売上限: {itemDataDict.orderLimitCount} / セット</p> */}
								</div>
							</div>
						</div>
						<p className="c8-p12">商品の説明</p>
						<p className="c8-p16">{itemDataDict.discripsion}</p>

						<div className="c8-div12">
							<p className="c8-p18 g-over1">{itemDataDict.item_locate_name}</p>
							<p className="c8-p19 g-over1">{itemDataDict.campany_name}</p>
							<img className="c8-div12img" src={baseUrl + itemDataDict.seller_user_image_url} alt="" />
						</div>
						<div className="c8-div15">
							<p className="c8-p25">購入点数</p>

							<div className="c8-div25">
								<button
									className="c8-btn1 c8-btn2"
									onClick={() => {
										if (formData.field1 > 1) {
											setFormData({
												...formData,
												["field1"]: parseInt(formData.field1) - 1,
											});
										}
									}}
								></button>
								<p className="c8-inp4">{formData.field1}</p>
								<button
									className="c8-btn1"
									onClick={() => {
										setFormData({
											...formData,
											["field1"]: parseInt(formData.field1) + 1,
										});
									}}
								></button>
							</div>
							<div className="c8-div16">
								<span>
									商品合計<span className="c8-span6">{zeiStr}</span>
								</span>
								<span className="c8-span7 g-bold-ff">{(formData.field1 * itemDataDict.bulk_price).toLocaleString("ja-JP", { style: "currency", currency: "JPY" })}</span>
							</div>

							<p className="c8-p26">受取場所</p>
							<p className="c8-p27 g-over1">{itemDataDict.campany_name}</p>
							<p className="c8-p27">{itemDataDict.item_locate_name}</p>
							<FdevGoogleMapMini latitude={parseFloat(itemDataDict.item_locate_latitude)} longitude={parseFloat(itemDataDict.item_locate_longitude)} />

							<div className="c8-div19">
								<p>受取日程</p>
								{"times" in itemDataDict &&
									itemDataDict["times"].map((time, index) => (
										<div key={index} className="c8-div22">
											<input
												className="c8-div22-checkbox"
												id={"radioBtn" + String(index)}
												type="checkbox"
												onChange={(e) => {
													pushIsRegisterDict(time.id, e.target.checked);
												}}
												checked={isRegisterDict[String(time.id)]}
											></input>

											<div>
												<label className="c8-lab1" htmlFor={"radioBtn" + String(index)}>
													{renderStrTimeDate(time.start_ts) + "  " + renderStrTimeTime(time.start_ts) + "  ～  " + renderStrTimeTime(time.end_ts)}
												</label>
											</div>
										</div>
									))}
							</div>
						</div>
						<button className="g-btn1 g-btn-clr1 g-btn1-font-b" onClick={push2StateBuyitemInfo}>
							購入する
						</button>
					</div>
				</>
			)}
			<BuyerFooter colorArray={[1, 0, 0]} />
		</>
	);
};

export default FindProductDetail;
