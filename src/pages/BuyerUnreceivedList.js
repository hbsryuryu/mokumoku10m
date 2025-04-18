// 評価するしないの表示ロジックとバックエンドとの通信
// 地図クリックで開く
// comgooglemaps://?q=35.709246,139.716318&center=35.709246,139.716318&zoom=17
// https://tech.manulneko.com/articles/2018/03/13/210

import React, { useContext, useState, useEffect } from "react";
import { MyContext } from "../provider/MyContext";
import { useNavigate } from "react-router-dom";
import { myUrl } from "../route/MainRoute.js";

// component群
import FdevGoogleMapMini from "../components/FdevGoogleMapMini";
import BuyerFooter from "../components/BuyerFooter";
import SvgIcon from "../components/SvgIcon.js";
import CommonHeader from "../components/CommonHeader.js";
import FooterLink from "../components/FooterLink.js";

//css群
import "../css/c0_switch.css";
import "../css/c59_BuyerUnreceivedList.css";

//api群
const { getItemList, getMyOrderItemList } = require("../api/get_data_req");
const { postItemPurchase, postItemReceive, postItemCancel, postOrderCreatePaymantUrl } = require("../api/post_data_req");

// function群
const { renderStrTimeDate, renderStrTimeTime } = require("../js/ts_str");
const { funcSortItemIsDone, funcIsNullDataArray, createDictHyouka, returnHyoukaCss, updateDictHyouka, updateCommentDictHyouka } = require("../js/item_search_sort.js");
const req_base_url = require("../js/get_base_url");
const baseUrl = req_base_url();

const BuyerUnreceivedList = () => {
	const { state, setState } = useContext(MyContext);
	const [itemDataArray, setItemDataArray] = useState([]);
	const [itemRerender, setItemRerender] = useState([]);
	const [itemListFromApi, setItemListFromApi] = useState([]);
	const isDefault_button_state = false;
	const [activeButton, setActiveButton] = useState(isDefault_button_state);

	const [isReqStripe, setIsReqStripe] = useState(false); // 連続でアクセスしないように

	const [hyokaDict, setHyokaDict] = useState({});

	useEffect(() => {
		window.scrollTo(0, 0);
		if (!state.userData.is_guest) {
			getMyOrderItemList()
				.then((return_array) => {
					setItemListFromApi(return_array); //一時保管
					setHyokaDict(createDictHyouka(return_array));
					var update_array = funcSortItemIsDone(return_array, activeButton);
					setItemDataArray(update_array);
				})
				.catch((error) => {
					console.error(error);
				});
		}
	}, [itemRerender]);

	// ボタンの状態を管理するためのuseStateフック
	const handleButtonClick = (button) => {
		if (activeButton != button) {
			setItemDataArray(funcSortItemIsDone(itemListFromApi, button)); //データ更新せずに再レンダリング
			setActiveButton(button);
		}
	};

	const [pageState, setPageState] = useState(0);

	//---------------------------------受取
	const [selectItemDataDict, setSelectItemDataDict] = useState({});
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [modalEventInt, setModalEventInt] = useState(0);
	const handleOpenModal = (itemDict, eventId) => {
		setSelectItemDataDict(itemDict);
		setModalEventInt(eventId);
		setIsModalOpen(true);
	};
	const handleCloseModal = () => {
		setSelectItemDataDict({});
		setIsModalOpen(false);
	};
	const handleConfirm0 = () => {
		var postDataDict = {
			id: selectItemDataDict.orders[0].id,
			item_id: selectItemDataDict.id,
			item_time_id: selectItemDataDict.times[0].id,
		};
		postItemReceive(postDataDict)
			.then((isSuccess) => {
				setIsModalOpen(false); // モーダルを閉じる
				setItemRerender(!itemRerender);
			})
			.catch((error) => {
				// console.error(error);
				setItemRerender(!itemRerender);
			});
	};
	const handleConfirm1 = () => {
		var postDataDict = {
			id: selectItemDataDict.orders[0].id,
			item_id: selectItemDataDict.id,
			item_time_id: selectItemDataDict.times[0].id,
		};
		postItemCancel(postDataDict)
			.then((isSuccess) => {
				setIsModalOpen(false); // モーダルを閉じる
				setItemRerender(!itemRerender);
			})
			.catch((error) => {
				// console.error(error);
				setItemRerender(!itemRerender);
			});
	};
	const handleConfirm2 = (item) => {
		if (!isReqStripe) {
			var postDataDict = {
				id: item.orders[0].id,
				item_id: item.id,
				item_time_id: item.times[0].id,
			};
			postOrderCreatePaymantUrl(postDataDict)
				.then((res_dict) => {
					if (res_dict["pay_link_url"] !== "") {
						setIsReqStripe(false);
						window.location.href = res_dict["pay_link_url"];
					}
				})
				.catch((error) => {
					// console.error(error);
					setItemRerender(!itemRerender);
					setIsReqStripe(false);
				});
		}
	};
	//---------------------------------
	function getbynow(targetDate) {
		// 現在の日付
		const currentDate = new Date();
		const differenceInMilliseconds = new Date(targetDate * 1000) - currentDate;
		const differenceInDays = Math.floor(differenceInMilliseconds / (1000 * 60 * 60 * 24));
		return differenceInDays;
	}
	const selectCssListArray = ["c59-div49 c59-div49-clr12", "c59-div49 c59-div49-clr11"];
	function selectSwichBtn(order_id, intSelected) {
		setHyokaDict(updateDictHyouka(hyokaDict, order_id, intSelected)); // 0無評価　10good 1bad
	}

	function handleChangeHyoka(order_id, strComment) {
		const res_dict = updateCommentDictHyouka(hyokaDict, order_id, strComment);
		if (res_dict.length != 0) {
			setHyokaDict(res_dict);
		}
	}

	return (
		<>
			<CommonHeader />
			<div className="switch">
				<button className={activeButton === false ? "active" : ""} onClick={() => handleButtonClick(false)}>
					未受取
				</button>
				<button className={activeButton === true ? "active" : ""} onClick={() => handleButtonClick(true)}>
					受取済
				</button>
			</div>
			{pageState == 0 && (
				<>
					<div>
						{state.userData.is_guest && (
							<>
								<p className="c88-p9">ログインしてください。</p>
							</>
						)}
						{!state.userData.is_guest && funcIsNullDataArray(itemDataArray) && (
							<>
								<p className="c88-p9">{activeButton ? "受取済はありません" : "未受取はありません"}</p>
							</>
						)}
						{itemDataArray.map((item, index) => (
							<div className="c59-div5" key={index}>
								{item.orders[0].is_cancel && (
									<>
										<p className="c59-p23 c59-p23-clr4">キャンセル</p>
									</>
								)}
								{item.orders[0].is_recieve && (
									<>
										<p className="c59-p23 c59-p23-clr1">受取完了</p>
									</>
								)}
								{!item.orders[0].is_cancel && !item.orders[0].is_recieve && (
									<>
										{getbynow(item.times[0].start_ts) == 0 && (
											<>
												<p className="c59-p23 c59-p23-clr1">受取日</p>
											</>
										)}
										{getbynow(item.times[0].start_ts) > 0 && getbynow(item.times[0].start_ts) < 3 && (
											<>
												<p className="c59-p23 c59-p23-clr2">受取日が近づきました</p>
											</>
										)}
										{(getbynow(item.times[0].start_ts) < 0 || getbynow(item.times[0].start_ts) > 3) && (
											<>
												<p className="c59-p23 c59-p23-clr4">受取日まで{getbynow(item.times[0].start_ts)}日</p>
											</>
										)}
									</>
								)}

								<div key={index} className="c59-div8">
									<div className="c59-div12">
										<img className="c59-div12img" src={baseUrl + item.image_url} alt="" />
									</div>
									<div>
										<p className="c59-p3">{item.name}</p>

										<p className="c59-p4">{item.campany_name}</p>
										<p className="c59-p4">数量： {item.orders[0].is_cancel ? item.orders[0].cancel_order_count : item.orders[0].order_count} / セット</p>

										<p className="c59-p5">
											<span className="c59-span6">{"合計金額（税込）"}</span>
											<span className="c59-span7 g-bold-ff">{((item.orders[0].is_cancel ? item.orders[0].cancel_order_count : item.orders[0].order_count) * item.bulk_price).toLocaleString("ja-JP", { style: "currency", currency: "JPY" })}</span>
										</p>
									</div>
								</div>

								<p className="c59-p6">受取日程・場所</p>

								<p className="c59-p7">受渡時間：{renderStrTimeDate(item.times[0].start_ts) + "  " + renderStrTimeTime(item.times[0].start_ts) + "  ～  " + renderStrTimeTime(item.times[0].end_ts)}</p>

								<p className="c59-p7">{item.campany_name}</p>
								<p className="c59-p7">{item.item_locate_name}</p>
								<p className="c59-p7">{item.campany_phone_number}</p>
								<p className="c59-p6">受取場所に関する詳細</p>
								<p className="c59-p7">{item.item_locate_discripsion}</p>
								<FdevGoogleMapMini latitude={parseFloat(item.item_locate_latitude)} longitude={parseFloat(item.item_locate_longitude)} />

								{!item.orders[0].is_pay && !item.orders[0].is_cancel && (
									<>
										<div className="c59-div46">
											<button onClick={() => handleConfirm2(item)} className="c59-btn1 g-btn-clr1">
												支払う
											</button>
										</div>
										<div className="c59-div46">
											<button onClick={() => handleOpenModal(item, 1)} className="c59-btn1 g-btn-clr2">
												キャンセルする
											</button>
										</div>
									</>
								)}
								{item.orders[0].is_cancel && (
									<>
										<div className="c59-div46">
											<p className="c59-p13">キャンセルしました。</p>
										</div>
									</>
								)}
								{item.orders[0].is_recieve && (
									<>
										<form className="c59-div48">
											<div
												className={returnHyoukaCss(selectCssListArray, hyokaDict, item.orders[0].id, 10)}
												onClick={() => {
													selectSwichBtn(item.orders[0].id, 10);
												}}
											>
												<label className="c59-lab1">
													<SvgIcon size={"2em"} color={"#ce6585"} iconName={"faceSmile"} />
													<p className="c59-p15">良かった</p>
													<input class="js-check" type="radio" name="rs" />
												</label>
											</div>
											<div
												className={returnHyoukaCss(selectCssListArray, hyokaDict, item.orders[0].id, 1)}
												onClick={() => {
													selectSwichBtn(item.orders[0].id, 1);
												}}
											>
												<label className="c59-lab1">
													<SvgIcon size={"2em"} color={"#72b7da"} iconName={"faceFrown"} />
													<p className="c59-p15">残念だった</p>
													<input class="js-check" type="radio" name="rs" />
												</label>
											</div>
										</form>
										<input className="g-inp" type="text" value={hyokaDict[item.orders[0].id]["comment"]} onChange={(e) => handleChangeHyoka(item.orders[0].id, e.value)} />
										<div className="c59-div46">
											<button className="c59-btn1 g-btn-clr2">評価する</button>
										</div>
									</>
								)}
								{item.orders[0].is_pay && !item.orders[0].is_cancel && !item.orders[0].is_recieve && (
									<>
										{getbynow(item.times[0].start_ts) == 0 && (
											<>
												<div className="c59-div46">
													<button onClick={() => handleOpenModal(item, 0)} className="c59-btn1 g-btn-clr1">
														受取確認
													</button>
												</div>
											</>
										)}
										{getbynow(item.times[0].start_ts) > 0 && getbynow(item.times[0].start_ts) <= 3 && (
											<>
												<p className="c59-p13">キャンセルの期間が過ぎています。</p>
												<div className="c59-div46">
													<button className="c59-btn1 g-btn-clr2">お問い合わせ</button>
												</div>
											</>
										)}
										{(getbynow(item.times[0].start_ts) < 0 || getbynow(item.times[0].start_ts) > 3) && (
											<>
												<div className="c59-div46">
													<button onClick={() => handleOpenModal(item, 1)} className="c59-btn1 g-btn-clr2">
														キャンセルする
													</button>
												</div>
											</>
										)}
									</>
								)}
							</div>
						))}
					</div>
				</>
			)}
			{isModalOpen && modalEventInt == 0 && (
				<div className="modalStyle" onClick={handleCloseModal}>
					<div className="modalContentStyle">
						<p>order ID:（{selectItemDataDict.orders[0].id}）</p>
						<p>受け取りを完了しますか？</p>
						<button id="kakunin1" onClick={handleConfirm0}>
							完了
						</button>
						<button id="kakunin2" onClick={handleCloseModal}>
							戻る
						</button>
					</div>
				</div>
			)}
			{isModalOpen && modalEventInt == 1 && (
				<div className="modalStyle" onClick={handleCloseModal}>
					<div className="modalContentStyle">
						<p>order ID:（{selectItemDataDict.orders[0].id}）</p>
						<p>キャンセルしますか？</p>
						<button id="kakunin1" onClick={handleConfirm1}>
							完了
						</button>
						<button id="kakunin2" onClick={handleCloseModal}>
							戻る
						</button>
					</div>
				</div>
			)}
			<FooterLink />
			<BuyerFooter colorArray={[0, 1, 0]} />
		</>
	);
};

export default BuyerUnreceivedList;
