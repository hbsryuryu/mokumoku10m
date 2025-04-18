// 出品失敗時のエラー
// デリートされない
// 時間変更に対してエラーでない
// 同じ時間入力できてしまう
// 購入されていたら数量単位と値段変更不可に
// アップロード画像の元画像メモリ開放ロジック実装　URL.revokeObjectURL(imgUrl);

import React, { useContext, useEffect } from "react";
import { useState } from "react";
import { MyContext } from "../provider/MyContext";

// import Camera from "../components/camera";
import Calendar from "../components/Calendar";
import SupplierFooter from "../components/SupplierFooter";
import FdevGoogleMapRegister from "../components/FdevGoogleMapRegister";
import FdevGoogleMapMini from "../components/FdevGoogleMapMini";
import SvgIcon from "../components/SvgIcon.js";
import CommonHeader from "../components/CommonHeader.js";
import "../css/c23_itemRegister.css";
import "../css/FdevGoogleMapmini.css";
import "../css/c68_FdevGoogleMapRegister.css";

import { useNavigate } from "react-router-dom";
import { myUrl } from "../route/MainRoute.js";

//api群
const { getItemList, getItemWithUserId, getMyOrderItemList, get_user_profile_req } = require("../api/get_data_req");
const { postItemPurchase, postItemRegistrate, postItemEdit } = require("../api/post_data_req");

// function群
const { renderStrTimeDate, renderStrTimeTime, renderStrYYYYMMDD } = require("../js/ts_str.js");
const { int2currencyStr } = require("../js/currency_str.js");
const { IntCountUpOrder } = require("../js/item_search_sort.js");
const { uploadImg } = require("../js/function_image.js");
const req_base_url = require("../js/get_base_url.js");
const baseUrl = req_base_url();

const statusStr = ["販売中", "販売停止"];
const maxLengthDict = {
	field1: 40,
	field4: 1000,
};

function ItemCreator(props) {
	const navigate = useNavigate();
	const { state, setState } = useContext(MyContext);
	useEffect(() => {
		window.scrollTo(0, 0);
		if (state.userData.is_guest) {
			get_user_profile_req()
				.then((dataDict) => {
					var newDict = { ...state };
					newDict["userData"] = dataDict;
					setState(newDict);
				})
				.catch((error) => {
					if (!state.userData.is_guest) {
						var newDict = { ...state };
						newDict["userData"]["is_guest"] = true;
						newDict["userData"]["is_seller"] = false;
						setState(newDict);
					}
				});
		}
	}, []);

	// 全体レンダリング回避用、部分レンダリングstate
	const formData = props.formData;
	const setFormData = props.setFormData;
	// const [formData, setFormData] = useState({
	// 	isreRenderDummy: false,
	// 	img64: "",
	// 	field1: "",
	// 	field2: "",
	// 	field3: "",
	// 	field4: "",
	// 	field5: "",
	// 	field6: "0",
	// 	timeArray: [],
	// 	locate_name: "",
	// 	locate_discripsion: "",
	// 	longitude: 138.678574,
	// 	latitude: 36.556637,
	// 	isUseGeoApi: false,
	// });
	const pageState = props.pageState;
	const setPageState = props.setPageState;
	// const [pageState, setPageState] = useState(0);
	// フォームデータ変更機構
	const handleChange = (e) => {
		const { name, value } = e.target;
		// 文字数制限
		if (!(name in maxLengthDict && maxLengthDict[name] < value.length)) {
			setFormData({
				...formData,
				[name]: value,
			});
		}
	};

	// componentから画像データをもらうための機構
	const [cameraData, setCameraData] = useState(formData["img64"]);

	// htmlタグからイベント返り値もらって、useState含めて関数へ
	function uploadImgfunc(event) {
		uploadImg(event, cameraData, setCameraData);
	}

	// form受渡日程ソート機能付き
	const [isDisplayPlaceDict, setIsDisplayPlaceDict] = useState(false);
	function pushPlaceArray(dataDict) {
		var newData = { ...formData };
		newData["timeArray"].push(dataDict);
		var sortedLocateArray = newData["timeArray"].sort((a, b) => a.start_ts - b.start_ts);
		sortedLocateArray.map((timeDict, index) => {
			sortedLocateArray[index]["localTimeId"] = index;
		});
		newData["timeArray"] = sortedLocateArray; //index振りなおした時間配列
		setFormData(newData);
	}
	function reverseDisplayPlaceDict() {
		setIsDisplayPlaceDict(!isDisplayPlaceDict);
	}

	const [intEventId, setIntEventId] = useState(0);
	function funcRegisterItem(is_draft, is_delete) {
		var postData = {
			name: formData.field1,
			bulk_1set_count: formData.field2,
			bulk_price: parseInt(formData.field3),
			discripsion: formData.field4,
			category: "デバック人参",
			order_limit_count: parseInt(formData.field5),
			sale_state: parseInt(formData.field6), //0販売中　1販売停止
			image_base64: cameraData,
			is_draft: is_draft, //ボタン次第で変わる
			item_locate_name: formData.locate_name,
			item_locate_discripsion: formData.locate_discripsion,
			item_locate_longitude: formData.longitude,
			item_locate_latitude: formData.latitude,
			item_locate_is_use_geo_api: true,
			times: formData["timeArray"],
		};

		return postData;
	}

	const handleConfirm = (is_draft, is_delete, eventId) => {
		const tempPostDict = funcRegisterItem(is_draft, is_delete);
		if (formData.image_url === "") {
			postItemRegistrate(tempPostDict)
				.then((isSuccess) => {
					setIntEventId(eventId);
					setPageState(4);
				})
				.catch((error) => {
					// console.error(error);
				});
		} else {
			tempPostDict["id"] = formData.id;
			tempPostDict["is_delete"] = is_delete;
			postItemEdit(tempPostDict)
				.then((isSuccess) => {
					setIntEventId(eventId);
					setPageState(4);
				})
				.catch((error) => {
					// console.error(error);
				});
		}
	};

	useEffect(() => {
		window.scrollTo(0, 0); // ページ遷移時にスクロール位置をトップにリセット
	}, [pageState]);
	const [nextStepBtn, setNextStepBtn] = useState({
		btn1: true,
		btn2: true,
		btn3: true,
	});

	// 入力監視
	useEffect(() => {
		if (pageState === 0) {
			if (formData.field1 != "" && formData.field2 != "" && formData.field3 != "" && formData.field4 != "" && formData.field5 != "" && (cameraData != "" || formData.image_url)) {
				if (nextStepBtn.btn1) {
					nextStepBtnChange("btn1", false);
				}
			} else {
				if (!nextStepBtn.btn1) {
					nextStepBtnChange("btn1", true);
				}
			}
		} else if (pageState === 1) {
			if (formData.timeArray.length !== 0) {
				if (nextStepBtn.btn2) {
					nextStepBtnChange("btn2", false);
				}
			} else {
				if (!nextStepBtn.btn2) {
					nextStepBtnChange("btn2", true);
				}
			}
		} else if (pageState === 2) {
			if (formData.locate_name != "" && formData.locate_discripsion != "") {
				if (nextStepBtn.btn3) {
					nextStepBtnChange("btn3", false);
				}
			} else {
				if (!nextStepBtn.btn3) {
					nextStepBtnChange("btn3", true);
				}
			}
		}
	}, [formData, cameraData, pageState]);

	const nextStepBtnChange = (key, value) => {
		setNextStepBtn({
			...nextStepBtn,
			[key]: value,
		});
	};

	function removeTime(index) {
		var newData = { ...formData };
		var newTimeArray = [...newData["timeArray"]];

		newTimeArray.splice(index, 1);

		newTimeArray.map((timeDict, index) => {
			newTimeArray[index]["localTimeId"] = index;
		});
		newData["timeArray"] = newTimeArray; //index振りなおした時間配列
		setFormData(newData);
	}

	const [attributes, setAttributes] = useState({
		"data-aos": "fade",
		// "data-aos1": "fade-up",
		// className: "my-class",
		// style: { color: 'red', fontSize: '20px' },
		// onClick: () => alert("Button clicked!"), // イベントハンドラもここで管理
	});

	return (
		<>
			<CommonHeader />
			<p className="g-titlebar2">出品登録</p>
			<div {...attributes}>
				{!state.userData.is_seller && (
					<>
						<p className="c88-p9">出品者アカウントでログインしてください。</p>
					</>
				)}
				{state.userData.is_seller && pageState === 0 && (
					<>
						<ul class="g-progressbar5">
							<li class="active">商品情報</li>
							<li>受取日程</li>
							<li>受取場所</li>
							<li>確認</li>
							<li>出品完了</li>
						</ul>
						<p className="g-p12 c23-p1">商品名</p>
						<div className="c23-div5">
							{formData.image_url === "" && (
								<>
									{cameraData === "" && (
										<div className="fileBtn">
											<input type="file" id="imageInput" accept="image/*" onChange={uploadImgfunc} />
										</div>
									)}
									{cameraData != "" && (
										<div className="c23-div39">
											<img className="c23-div5img" src={cameraData} alt="" />
											<div className="c23-div41" onClick={() => setCameraData("")}>
												<SvgIcon size={"1.5rem"} color={"#262626"} iconName={"cross"} />
											</div>
										</div>
									)}
								</>
							)}
							{formData.image_url !== "" && (
								<>
									{cameraData === "" && (
										<div className="c23-div39">
											<div className="fileBtn3">
												<input type="file" id="imageInput3" accept="image/*" onChange={uploadImgfunc} />
											</div>
											<img className="c23-div5img" onClick={() => setCameraData("")} src={baseUrl + formData.image_url} alt="" />
										</div>
									)}
									{cameraData != "" && (
										<div className="c23-div39">
											<img className="c23-div5img" src={cameraData} alt="" />
											<div className="c23-div41" onClick={() => setCameraData("")}>
												<SvgIcon size={"1.5rem"} color={"#262626"} iconName={"cross"} />
											</div>
										</div>
									)}
								</>
							)}

							<div>
								<p className="c23-p1">商品名</p>
								<input className="g-inp" type="text" name="field1" value={formData.field1} placeholder="必須" onChange={handleChange} />
								<p className="c23-p3">
									{formData.field1.length}/{maxLengthDict.field1}
								</p>
							</div>

							<div>
								<p className="c23-p1">商品説明</p>
								<textarea className="g-txt" type="text" name="field4" value={formData.field4} placeholder="例）朝一番に収穫した市場には出回ない新鮮なにんじんです。" onChange={handleChange} />
								<p className="c23-p3">
									{formData.field4.length}/{maxLengthDict.field4}
								</p>
							</div>

							<div>
								<p className="c23-p1">数量</p>
								<input className="g-inp-mini" type="text" name="field2" value={formData.field2} placeholder="必須：10個、5kg" onChange={handleChange} />
								<span>/ セット</span>
							</div>

							<div>
								<p className="c23-p1">価格</p>
								<input className="g-inp-mini" type="number" name="field3" value={formData.field3} placeholder="必須" onChange={handleChange} />
								<span>/ セット</span>
							</div>

							<div>
								<p className="c23-p1">販売上限</p>
								<input className="g-inp-mini" type="text" name="field5" value={formData.field5} placeholder="必須" onChange={handleChange} />
								<span>/ セット</span>
							</div>

							<div>
								<p className="c23-p1">販売ステータス</p>
								<select className="c23-se2" value={formData.field6} name="field6" onChange={handleChange}>
									<option value="0">{statusStr[0]}</option>
									<option value="1">{statusStr[1]}</option>
								</select>
							</div>

							<button className="g-btn1 g-btn-clr3" disabled={nextStepBtn.btn1} onClick={() => setPageState(1)}>
								次へ
							</button>
						</div>
					</>
				)}
				{pageState === 1 && (
					<>
						<ul class="g-progressbar5">
							<li class="complete">商品情報</li>
							<li class="active">受取日程</li>
							<li>受取場所</li>
							<li>確認</li>
							<li>出品完了</li>
						</ul>
						<p className="g-p12 c23-p1">受渡日の追加</p>
						<Calendar reverseDisplayPlaceDict={reverseDisplayPlaceDict} pushPlaceArray={pushPlaceArray} placeArrayCount={formData["timeArray"].length} />
						<p className="g-p12 c23-p1">受渡日程</p>
						<div className="c23-div15">
							{formData["timeArray"].length === 0 && (
								<>
									<p className="c23-p9">受渡日程を追加してください。</p>
								</>
							)}
							{formData["timeArray"].length != 0 &&
								formData["timeArray"].map((time, timeIndex) => (
									<p key={timeIndex} className="c23-p16">
										<span>{renderStrTimeDate(time.start_ts) + "  " + renderStrTimeTime(time.start_ts) + "  ～  " + renderStrTimeTime(time.end_ts)}</span>
										<span
											className="c23-span16"
											onClick={() => {
												removeTime(timeIndex);
											}}
										>
											✖
										</span>
									</p>
								))}
						</div>
						<button className="g-btn1 g-btn-clr3 g-btn-sp1" disabled={nextStepBtn.btn2} onClick={() => setPageState(2)}>
							次へ
						</button>

						<button className="g-btn1 g-btn-clr2" onClick={() => setPageState(0)}>
							戻る
						</button>
					</>
				)}
				{pageState === 2 && (
					<>
						<ul class="g-progressbar5">
							<li class="complete">商品情報</li>
							<li class="complete">受取日程</li>
							<li class="active">受取場所</li>
							<li>確認</li>
							<li>出品完了</li>
						</ul>
						<p className="g-p12 c23-p1">登録住所</p>
						<p className="c23-p6">{state.userData.campany_locate_name}</p>
						<p className="g-p12 c23-p1">受取場所の指定</p>
						<p className="c23-p5">登録住所と受渡場所が異なる場合は、地図でピンを動かして指定してください。</p>
						<FdevGoogleMapRegister formData={formData} setFormData={setFormData} />
						<button className="g-btn1 g-btn-clr3 g-btn-sp1" disabled={nextStepBtn.btn3} onClick={() => setPageState(3)}>
							次へ
						</button>

						<button className="g-btn1 g-btn-clr2" onClick={() => setPageState(1)}>
							戻る
						</button>
					</>
				)}
				{pageState === 3 && (
					<>
						<ul class="g-progressbar5">
							<li class="complete">商品情報</li>
							<li class="complete">受取日程</li>
							<li class="complete">受取場所</li>
							<li class="active">確認</li>
							<li>出品完了</li>
						</ul>
						<div className="">
							<p className="g-p12">商品情報</p>

							{cameraData != "" && (
								<div className="c23-div12">
									<img className="c23-div12img" src={cameraData} alt="" />
								</div>
							)}

							{cameraData === "" && (
								<div className="c23-div12">
									<img className="c23-div12img" src={baseUrl + formData.image_url} alt="" />
								</div>
							)}

							<p className="c23-p1">商品名</p>
							<p className="c23-p23">{formData.field1}</p>
							<p className="c23-p3">{formData.field1.length}/40</p>

							<div>
								<p className="c23-p1">商品説明</p>
								<p className="c23-p23">{formData.field4}</p>
								<p className="c23-p3">{formData.field4.length}/1000</p>
							</div>

							<p className="c23-p1">数量</p>
							<div className="c23-div23">
								<p className="c23-p25">{formData.field2}</p>
								<span>/ セット</span>
							</div>

							<p className="c23-p1">価格</p>
							<div className="c23-div23">
								<p className="c23-p25">{formData.field3}</p>
								<span>/ セット</span>
							</div>

							<p className="c23-p1">販売上限</p>
							<div className="c23-div23">
								<p className="c23-p25">{formData.field5}</p>
								<span>/ セット</span>
							</div>

							<p className="c23-p1">販売ステータス</p>

							<p className="c23-p23 c23-p26">{statusStr[formData.field6]}</p>

							<p className="g-p12">受渡日程</p>
							<div className="c23-div28">
								{formData["timeArray"].length != 0 &&
									formData["timeArray"].map((locate, index) => (
										<p key={index} className="c23-p16">
											<span>{renderStrTimeDate(locate.start_ts) + "  " + renderStrTimeTime(locate.start_ts) + "  ～  " + renderStrTimeTime(locate.end_ts)}</span>
										</p>
									))}
							</div>

							<p className="g-p12">受渡場所</p>

							<p className="c23-p1">受渡場所</p>
							<p className="c23-p23">{formData.locate_name}</p>
							<p className="c23-p1">受渡場所に関する詳細情報</p>
							<p className="c23-p23">{formData.locate_discripsion}</p>
							<p className="c23-p3">{formData.locate_discripsion.length}/120</p>
						</div>
						<div className="c23-div36">
							<FdevGoogleMapMini latitude={formData.latitude} longitude={formData.longitude} />
						</div>

						<button className="g-btn1 g-btn-clr3 g-btn-sp1" onClick={() => handleConfirm(false, false, 0)}>
							{formData.image_url === "" && "登録"}
							{formData.image_url !== "" && "変更"}
						</button>

						<button className="g-btn1 g-btn-clr2 g-btn-sp1" onClick={() => setPageState(2)}>
							戻る
						</button>

						<button className="g-btn1 g-btn-clr2 g-btn-sp1" onClick={() => handleConfirm(true, false, 1)}>
							{formData.image_url === "" && "下書きに保存する"}
							{formData.image_url !== "" && "出品を一時停止にする"}
						</button>
						{formData.image_url !== "" && (
							<>
								<button className="g-btn1 g-btn-clr4 g-btn-sp1" onClick={() => handleConfirm(false, true, 2)}>
									商品情報を削除する
								</button>
							</>
						)}
					</>
				)}
				{pageState === 4 && (
					<>
						<ul class="g-progressbar5">
							<li class="complete">商品情報</li>
							<li class="complete">受取日程</li>
							<li class="complete">受取場所</li>
							<li class="complete">確認</li>
							<li class="active">出品完了</li>
						</ul>
						<div className="c23-div37">
							<p className="c23-p37">
								{formData.image_url !== "" && intEventId === 0 && "変更しました"}
								{formData.image_url === "" && intEventId === 0 && "出品が完了しました"}
								{intEventId === 1 && "下書きへの登録が完了しました"}
								{intEventId === 2 && "商品情報の削除が完了しました"}
							</p>
							<button className="c23-btn25" onClick={() => navigate(myUrl("s_i_mana_l"))}>
								OK
							</button>
						</div>
					</>
				)}
			</div>
			{formData.image_url === "" && <SupplierFooter colorArray={[1, 0, 0, 0]} />}
			{formData.image_url !== "" && <SupplierFooter colorArray={[0, 1, 0, 0]} />}
		</>
	);
}

export default ItemCreator;
