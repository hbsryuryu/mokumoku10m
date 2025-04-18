// 新規登録画面で商品表示されてない
// 販売停止の商品購入できてしまう
// パスワード目隠し機能

import React, { useContext, useState, useEffect } from "react";
import { MyContext } from "../provider/MyContext";
import { Link } from "react-router-dom";

import { useNavigate } from "react-router-dom";
import { myUrl } from "../route/MainRoute.js";
import { useSearchParams } from "react-router-dom";

// component群
import BuyerFooter from "../components/BuyerFooter";
import CommonHeader from "../components/CommonHeader.js";

//css群
import "../css/c3_FindPaymentConfirm.css";

//api群
const { getItemList, getItemWithId, get_user_profile_req } = require("../api/get_data_req.js");
const { postItemPurchase, post_login_req, post_logout_req, post_user_register_req } = require("../api/post_data_req.js");

// function群
const { renderStrTimeDate, renderStrTimeTime } = require("../js/ts_str.js");
const { funcCountSumOrder } = require("../js/item_search_sort.js");

const req_base_url = require("../js/get_base_url.js");
const baseUrl = req_base_url();

const zeiStr = "(税込)";
const maxLengthDict = {
	last_name: 15,
	first_name: 15,
	last_name_kana: 15,
	first_name_kana: 15,
	nick_name: 15,
	phone_number: 11,
};

const SVG_ICON1 =
	'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 576 512" width="18" height="15"><path d="M288 32c-80.8 0-145.5 36.8-192.6 80.6C48.6 156 17.3 208 2.5 243.7c-3.3 7.9-3.3 16.7 0 24.6C17.3 304 48.6 356 95.4 399.4C142.5 443.2 207.2 480 288 480s145.5-36.8 192.6-80.6c46.8-43.5 78.1-95.4 93-131.1c3.3-7.9 3.3-16.7 0-24.6c-14.9-35.7-46.2-87.7-93-131.1C433.5 68.8 368.8 32 288 32zM144 256a144 144 0 1 1 288 0 144 144 0 1 1 -288 0zm144-64c0 35.3-28.7 64-64 64c-7.1 0-13.9-1.2-20.3-3.3c-5.5-1.8-11.9 1.6-11.7 7.4c.3 6.9 1.3 13.8 3.2 20.7c13.7 51.2 66.4 81.6 117.6 67.9s81.6-66.4 67.9-117.6c-11.1-41.5-47.8-69.4-88.6-71.1c-5.8-.2-9.2 6.1-7.4 11.7c2.1 6.4 3.3 13.2 3.3 20.3z"/></svg>';

const SVG_ICON2 =
	'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 512" width="20" height="15"><path d="M38.8 5.1C28.4-3.1 13.3-1.2 5.1 9.2S-1.2 34.7 9.2 42.9l592 464c10.4 8.2 25.5 6.3 33.7-4.1s6.3-25.5-4.1-33.7L525.6 386.7c39.6-40.6 66.4-86.1 79.9-118.4c3.3-7.9 3.3-16.7 0-24.6c-14.9-35.7-46.2-87.7-93-131.1C465.5 68.8 400.8 32 320 32c-68.2 0-125 26.3-169.3 60.8L38.8 5.1zM223.1 149.5C248.6 126.2 282.7 112 320 112c79.5 0 144 64.5 144 144c0 24.9-6.3 48.3-17.4 68.7L408 294.5c8.4-19.3 10.6-41.4 4.8-63.3c-11.1-41.5-47.8-69.4-88.6-71.1c-5.8-.2-9.2 6.1-7.4 11.7c2.1 6.4 3.3 13.2 3.3 20.3c0 10.2-2.4 19.8-6.6 28.3l-90.3-70.8zM373 389.9c-16.4 6.5-34.3 10.1-53 10.1c-79.5 0-144-64.5-144-144c0-6.9 .5-13.6 1.4-20.2L83.1 161.5C60.3 191.2 44 220.8 34.5 243.7c-3.3 7.9-3.3 16.7 0 24.6c14.9 35.7 46.2 87.7 93 131.1C174.5 443.2 239.2 480 320 480c47.8 0 89.9-12.9 126.2-32.5L373 389.9z"/></svg>';

const FindPaymentConfirm = () => {
	const { state, setState } = useContext(MyContext);
	const navigate = useNavigate();
	const [pageState, setPageState] = useState(0);

	const [searchParams] = useSearchParams();
	const param_item_id = searchParams.get("item_id");
	const param_item_time_id = searchParams.get("item_time_id");
	const param_order_count = searchParams.get("order_count");
	const [itemDataDict, setItemDataDict] = useState({});
	const [itemTimeDataDict, setItemTimeDataDict] = useState({});
	const [itemOrderCount, setItemOrderCount] = useState(0);
	const [isRegisterDict, setIsRegisterDict] = useState({});

	useEffect(() => {
		window.scrollTo(0, 0);
		if (state.userData.is_guest == false) {
			setPageState(2);
		} else {
			get_user_profile_req()
				.then((dataDict) => {
					var newDict = { ...state };
					newDict["userData"] = dataDict;
					setState(newDict);
					setPageState(2);
					window.scrollTo(0, 0);
				})
				.catch((error) => {
					// alert("Logout failed");
				});
		}
		if (isCheckPrams()) {
			getItemWithId(param_item_id)
				.then((return_array) => {
					try {
						setItemDataDict(return_array[0]); //stateに商品データ格納
						setItemOrderCount(funcCountSumOrder(return_array[0])); //stateに総発注数格納
						setItemTimeDataDict(funcPickUpItemTime(return_array[0]));
						setIsRegisterDict(createFirstDict(return_array[0])); // チェックボタンをlocalIdで管理
					} catch (error) {
						// console.log(error)
					}
				})
				.catch((error) => {
					console.error(error);
				});
		} else {
			navigate(myUrl("b_top"));
		}
	}, []);
	// パラメーター有無チェック
	function isCheckPrams() {
		if (param_item_id === null || param_item_time_id === null || param_item_id === null) {
			return false;
		} else if (param_item_id === "" || param_item_time_id === "" || param_order_count === "" || param_order_count === "0") {
			return false;
		} else {
			return true;
		}
	}

	// 時間データ取得
	function funcPickUpItemTime(itemDict) {
		var newDict = {};
		if ("times" in itemDict) {
			itemDict["times"].forEach((time) => {
				if (String(time.id) === param_item_time_id) {
					newDict = { ...time };
				}
			});
		}
		return newDict;
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

	function SubmitOrder() {
		document.getElementById("submitOrderBtn").disabled = true;
		var orderDataDict = {
			create_at: new Date().getTime() / 1000,
			buyer_user_id: parseInt(state.userData.id),
		};
		orderDataDict["order_count"] = parseInt(param_order_count);
		orderDataDict["buyer_user_id"] = String(state.userData.id);

		orderDataDict["item_id"] = String(itemDataDict.id);
		orderDataDict["item_time_id"] = String(itemTimeDataDict.id);
		orderDataDict["seller_user_id"] = String(itemDataDict.seller_user_id);
		orderDataDict["bulk_price"] = parseInt(itemDataDict.bulk_price);

		console.log(orderDataDict);
		postItemPurchase(orderDataDict)
			.then((dataDict) => {
				var isError = false;
				var checkKeyArray = ["is_expire", "is_wrong_order", "is_over_order", "is_db_error", "is_paymant_error", "pay_link_url"];
				checkKeyArray.forEach((checkKey) => {
					if (!(checkKey in dataDict)) {
						isError = true;
					}
				});

				// 状態チェック
				if (isError) {
					alert("接続先が有効ではありません。アプリの再起動をお願いします。");
					document.getElementById("submitOrderBtn").disabled = false;
				} else if (dataDict["is_expire"]) {
					alert("購入期限を過ぎております。");
					document.getElementById("submitOrderBtn").disabled = false;
				} else if (dataDict["is_wrong_order"]) {
					alert("商品データが更新されております。恐れ入りますが、再度購入をお願いします。");
					document.getElementById("submitOrderBtn").disabled = false;
				} else if (dataDict["is_over_order"]) {
					alert("他のお客様が購入したため、お客様の発注数は発注上限を超えております。");
					document.getElementById("submitOrderBtn").disabled = false;
				} else if (dataDict["is_db_error"]) {
					alert("サーバーが込み合っております。時間をおいてから再度お試しください");
					document.getElementById("submitOrderBtn").disabled = false;
				} else if (dataDict["pay_link_url"] != "") {
					window.location.href = dataDict["pay_link_url"];
				} else {
					alert("時間をおいてから再度お試しください");
					document.getElementById("submitOrderBtn").disabled = false;
				}
			})
			.catch((error) => {
				console.error(error);
				alert("通信が込み合っております。時間をおいてから再度お試しください");
				document.getElementById("submitOrderBtn").disabled = false;
			});
	}

	//新規登録用のフォーム
	const [formData2, setFormData2] = useState({
		isreRenderDummy: false,
		last_name: "",
		first_name: "",
		last_name_kana: "",
		first_name_kana: "",
		nick_name: "",
		phone_number: "",
		zipcode: "",
		mail_address: "",
		password: "",
	});
	// フォームデータ変更機構
	const handleChange2 = (e) => {
		const { name, value } = e.target;
		// 文字数制限
		if (!(name in maxLengthDict && maxLengthDict[name] < value.length)) {
			setFormData2({
				...formData2,
				[name]: value,
			});
		}
	};

	// ログイン機能
	function login() {
		const mail_address = document.getElementById("mail_address").value;
		const password = document.getElementById("password").value;
		const postDataDict = { mail_address, password };

		post_login_req(postDataDict)
			.then((dataDict) => {
				var newDict = { ...state };
				newDict["userData"] = dataDict;
				setState(newDict);
				setPageState(2);
				// alert("Login successful!");
				window.scrollTo(0, 0);
			})
			.catch((error) => {
				alert("Login failed");
			});
	}

	// 新規登録機能
	function userRegister() {
		const postDataDict = { ...formData2 };
		post_user_register_req(postDataDict)
			.then((dataDict) => {
				var newDict = { ...state };
				newDict["userData"] = dataDict;
				setState(newDict);
				setPageState(2);
				window.scrollTo(0, 0);
			})
			.catch((error) => {
				alert(error);
			});
	}
	const [isRadioBtn, setIsRadioBtn] = useState(false);
	const [isRegisterBtn, setIsRegisterBtn] = useState(true);
	const checkFormKeyArray = ["last_name", "first_name", "last_name_kana", "first_name_kana", "nick_name", "phone_number", "zipcode", "mail_address", "password"];
	function funcCheckForm() {
		return checkFormKeyArray.some((c_key) => formData2[c_key] === "");
	}

	useEffect(() => {
		if (!isRadioBtn || funcCheckForm()) {
			if (!isRegisterBtn) {
				setIsRegisterBtn(true);
			}
		} else {
			if (isRegisterBtn) {
				setIsRegisterBtn(false);
			}
		}
	}, [formData2, isRadioBtn]);

	function togglePasswordVisibility() {
		var passwordInput = document.getElementById("password");
		var toggleIcon = document.getElementById("passwordInputSpan");

		if (passwordInput.type === "password") {
			passwordInput.type = "text";
			toggleIcon.innerHTML = SVG_ICON1;
		} else {
			passwordInput.type = "password";
			toggleIcon.innerHTML = SVG_ICON2;
		}
	}

	return (
		<>
			<div>
				<div>
					<CommonHeader />
					<p className="c3-p8 g-t-center">ご注文</p>
					{pageState == 0 && state.userData != {} && (
						<>
							<ul class="g-progressbar">
								<li class="active">受取設定</li>
								<li>購入内容確認</li>
								<li>購入完了</li>
							</ul>

							<p className="g-t-center">ご注文いただくには会員登録が必要です。</p>
							<div>
								<button className="g-btn1 g-btn-clr1" onClick={() => setPageState(1)}>
									ログインはこちら
								</button>
							</div>

							<div>
								<p className="c3-p1">姓</p>

								<input className="g-inp" type="text" name="last_name" value={formData2.last_name} onChange={handleChange2} placeholder="例）山田" />
								<p className="c3-p3">
									{formData2.last_name.length}/{maxLengthDict.last_name}
								</p>
							</div>
							<div>
								<p className="c3-p1">名</p>
								<input className="g-inp" type="text" name="first_name" value={formData2.first_name} onChange={handleChange2} placeholder="例）太郎" />
								<p className="c3-p3">
									{formData2.first_name.length}/{maxLengthDict.first_name}
								</p>
							</div>
							<div>
								<p className="c3-p1">姓カナ</p>

								<input className="g-inp" type="text" name="last_name_kana" value={formData2.last_name_kana} onChange={handleChange2} placeholder="例）ヤマダ" />
								<p className="c3-p3">
									{formData2.last_name_kana.length}/{maxLengthDict.last_name_kana}
								</p>
							</div>
							<div>
								<p className="c3-p1">名カナ</p>
								<input className="g-inp" type="text" name="first_name_kana" value={formData2.first_name_kana} onChange={handleChange2} placeholder="例）タロウ" />
								<p className="c3-p3">
									{formData2.first_name_kana.length}/{maxLengthDict.first_name_kana}
								</p>
							</div>
							<div>
								<p className="c3-p1">ニックネーム</p>
								<input className="g-inp" type="text" name="nick_name" value={formData2.nick_name} onChange={handleChange2} placeholder="例）ゴーファーム太郎" />
								<p className="c3-p3">
									{formData2.nick_name.length}/{maxLengthDict.nick_name}
								</p>
							</div>
							<div>
								<p className="c3-p1">電話番号</p>
								<input className="g-inp" type="text" name="phone_number" value={formData2.phone_number} onChange={handleChange2} placeholder="例）09012341234" />
							</div>
							<div>
								<p className="c3-p1">郵便番号</p>
								<input className="g-inp" type="text" name="zipcode" value={formData2.zipcode} onChange={handleChange2} placeholder="例）1234567" />
							</div>
							<div>
								<p className="c3-p1">メールアドレス</p>
								<input className="g-inp" type="email" name="mail_address" value={formData2.mail_address} onChange={handleChange2} placeholder="例）gofarm@example.com" />
							</div>
							<div>
								<p className="c3-p1">パスワード</p>
								<input className="g-inp" type="text" name="password" value={formData2.password} onChange={handleChange2} />
							</div>
							<div className="c3-div8">
								<div className="c3-div9">
									<input
										className="c3-inp2"
										type="checkbox"
										id="btnkiyaku"
										checked={isRadioBtn}
										onClick={() => {
											setIsRadioBtn(!isRadioBtn);
										}}
									></input>
									<label htmlFor="btnkiyaku">
										<p className="c3-p2">規約規約、プライバシーポリシーに同意します。</p>
									</label>
								</div>
							</div>
							<div>
								<button className="g-btn1 g-btn-clr1" id="userRegisterBtn" onClick={userRegister} disabled={isRegisterBtn}>
									登録する
								</button>
								<br />
								<br />
								<button className="g-btn1 g-btn-clr2" onClick={() => navigate(myUrl("b_i_find_s"))}>
									キャンセル
								</button>
							</div>
						</>
					)}
					{pageState == 1 && state.userData != {} && (
						<>
							<ul class="g-progressbar">
								<li class="active">受取設定</li>
								<li>購入内容確認</li>
								<li>購入完了</li>
							</ul>

							<div>
								<br />
								<br />

								<div className="g-inp-div-sp1">
									<label className="g-inp-label" for="mail_address">
										メールアドレス
									</label>
									<input className="g-inp" type="text" id="mail_address" name="mail_address" placeholder="gofarm@example.com" />
									{/* <p>アカウント名を入力してください。</p> */}
								</div>

								<div className="g-inp-div-sp1">
									<label className="g-inp-label" for="password">
										パスワード
									</label>
									<div className="g-div-pass">
										<input className="g-inp" type="text" id="password" name="password" placeholder="パスワード" />
										<span id="passwordInputSpan" class="toggle-password" onClick={togglePasswordVisibility} dangerouslySetInnerHTML={{ __html: SVG_ICON1 }} />
										{/* <p>パスワードを入力してください</p> */}
									</div>
								</div>
								<br />
								<br />
								<br />
								<button className="g-btn1 g-btn-clr1 g-btn-sp1" onClick={login}>
									ログイン
								</button>

								<button className="g-btn1 g-btn-clr2" onClick={() => setPageState(0)}>
									戻る
								</button>
								{/* <p>新規登録の方はこちら</p> */}
							</div>
						</>
					)}
					{pageState == 2 && state.userData != {} && (
						<>
							<ul class="g-progressbar">
								<li class="complete">受取設定</li>
								<li class="active">購入内容確認</li>
								<li>購入完了</li>
							</ul>

							<div>
								<p className="c3-p1">姓</p>
								<p className="c3-p5">{state.userData.last_name}</p>
							</div>
							<div>
								<p className="c3-p1">名</p>
								<p className="c3-p5">{state.userData.first_name}</p>
							</div>
							<div>
								<p className="c3-p1">姓カナ</p>
								<p className="c3-p5">{state.userData.last_name_kana}</p>
							</div>
							<div>
								<p className="c3-p1">名カナ</p>
								<p className="c3-p5">{state.userData.first_name_kana}</p>
							</div>
							<div>
								<p className="c3-p1">ニックネーム</p>
								<p className="c3-p5">{state.userData.nick_name}</p>
							</div>
							<div>
								<p className="c3-p1">電話番号</p>
								<p className="c3-p5">{state.userData.phone_number}</p>
							</div>
							<div>
								<p className="c3-p1">郵便番号</p>
								<p className="c3-p5">{state.userData.zipcode}</p>
							</div>
							<div>
								<p className="c3-p1">メールアドレス</p>
								<p className="c3-p5">{state.userData.mail_address}</p>
							</div>
							{state.userData.password != "" && (
								<div>
									<p className="c3-p1">パスワード</p>
									<p className="c3-p5">{state.userData.password}</p>
								</div>
							)}

							<div>
								<p className="c3-p15">受取場所</p>
								<p className="c3-p6 g-over1">{itemDataDict.campany_name}</p>
								<p className="c3-p4 g-over1">{itemDataDict.item_locate_name}</p>
								<p className="c3-p4">{itemDataDict.campany_phone_number}</p>
								<p className="c3-p15">受取日時</p>
								<p className="c3-p1">{renderStrTimeDate(itemTimeDataDict.start_ts) + "  " + renderStrTimeTime(itemTimeDataDict.start_ts) + "  ～  " + renderStrTimeTime(itemTimeDataDict.end_ts)}</p>
								<p className="c3-p15">商品詳細</p>
							</div>

							<div>
								<div className="c3-div12">
									<div>
										<p className="c3-p8 g-over2">{itemDataDict.name}</p>
										<p className="c3-p9 g-over1">{itemDataDict.campany_name}</p>
										<p className="c3-p9">数量: {String(parseInt(param_order_count))}</p>
										<div className="c3-div16">
											<p className="c3-p9">商品合計{zeiStr}</p>
											<p className="c3-p12 g-bold-ff">{parseInt(parseInt(param_order_count) * itemDataDict.bulk_price).toLocaleString("ja-JP", { style: "currency", currency: "JPY" })}</p>
										</div>

										<img className="c3-div12img" src={baseUrl + itemDataDict.image_url} alt="" />
									</div>
								</div>

								<br />
								<br />
								<button className="g-btn1 g-btn-clr1 g-btn-sp1" id="submitOrderBtn" onClick={SubmitOrder}>
									購入を確定する
								</button>
								<button className="g-btn1 g-btn-clr2" onClick={() => navigate(myUrl("b_i_find_s"))}>
									キャンセル
								</button>
							</div>
						</>
					)}
				</div>
			</div>
			<BuyerFooter colorArray={[1, 0, 0]} />
		</>
	);
};

export default FindPaymentConfirm;
