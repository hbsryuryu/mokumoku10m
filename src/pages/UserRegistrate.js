// エラー時の赤文字赤枠

import React, { useContext, useState, useEffect } from "react";
import { MyContext } from "../provider/MyContext";
import { useNavigate } from "react-router-dom";
import { myUrl } from "../route/MainRoute.js";

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

const maxLengthDict = {
	last_name: 15,
	first_name: 15,
	last_name_kana: 15,
	first_name_kana: 15,
	nick_name: 15,
	phone_number: 11,
};

const FindPaymentConfirm = () => {
	const { state, setState } = useContext(MyContext);
	const navigate = useNavigate();
	const [pageState, setPageState] = useState(0);

	useEffect(() => {
		window.scrollTo(0, 0);
		if (state.userData.is_guest === false) {
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
	}, []);

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
				navigate(myUrl("b_my_p"));
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

	return (
		<>
			<CommonHeader />
			<div>
				<div>
					<p className="c3-p8 g-t-center">新規会員登録</p>
					{pageState === 0 && (
						<>
							<ul class="g-progressbar">
								<li class="active">個人情報入力</li>
								<li>入力内容確認</li>
								<li>登録完了</li>
							</ul>
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
								<button className="g-btn1 g-btn-clr1" onClick={() => setPageState(2)} disabled={isRegisterBtn}>
									入力内容確認
								</button>
								<br />
								<br />
								<button className="g-btn1 g-btn-clr2" onClick={() => navigate(myUrl("b_my_p"))}>
									キャンセル
								</button>
							</div>
						</>
					)}
					{pageState === 1 && (
						<>
							<ul class="g-progressbar">
								<li class="active">個人情報入力</li>
								<li>入力内容確認</li>
								<li>登録完了</li>
							</ul>

							<div>
								<label className="c3-p1" for="mail_address">
									Usermail:
								</label>
								<input className="g-inp" type="text" id="mail_address" name="mail_address" />
								<br />
								<br />
								<label className="c3-p1" for="password">
									Password:
								</label>
								<input className="g-inp" type="text" id="password" name="password" />
								<br />
								<br />
								<br />
								<br />
								<br />
								<br />
								<button className="g-btn1 g-btn-clr1 g-btn-sp1" onClick={login}>
									ログイン
								</button>

								<button className="g-btn1 g-btn-clr2" onClick={() => setPageState(0)}>
									戻る
								</button>

								<br />
								<br />
							</div>
						</>
					)}
					{pageState === 2 && (
						<>
							<ul class="g-progressbar">
								<li class="complete">個人情報入力</li>
								<li class="active">入力内容確認</li>
								<li>登録完了</li>
							</ul>

							<div>
								<p className="c3-p1">姓</p>
								<p className="c3-p5">{formData2.last_name}</p>
							</div>
							<div>
								<p className="c3-p1">名</p>
								<p className="c3-p5">{formData2.first_name}</p>
							</div>
							<div>
								<p className="c3-p1">姓カナ</p>
								<p className="c3-p5">{formData2.last_name_kana}</p>
							</div>
							<div>
								<p className="c3-p1">名カナ</p>
								<p className="c3-p5">{formData2.first_name_kana}</p>
							</div>
							<div>
								<p className="c3-p1">ニックネーム</p>
								<p className="c3-p5">{formData2.nick_name}</p>
							</div>
							<div>
								<p className="c3-p1">電話番号</p>
								<p className="c3-p5">{formData2.phone_number}</p>
							</div>
							<div>
								<p className="c3-p1">郵便番号</p>
								<p className="c3-p5">{formData2.zipcode}</p>
							</div>
							<div>
								<p className="c3-p1">メールアドレス</p>
								<p className="c3-p5">{formData2.mail_address}</p>
							</div>
							{formData2.password !== "" && (
								<div>
									<p className="c3-p1">パスワード</p>
									<p className="c3-p5">{formData2.password}</p>
								</div>
							)}

							<div>
								<br />
								<br />
								<button className="g-btn1 g-btn-clr1 g-btn-sp1" id="userRegisterBtn" onClick={userRegister}>
									登録する
								</button>
								<button className="g-btn1 g-btn-clr2" onClick={() => setPageState(0)}>
									戻る
								</button>
							</div>
						</>
					)}
				</div>
			</div>
			<BuyerFooter colorArray={[0, 0, 1]} />
		</>
	);
};

export default FindPaymentConfirm;
