// ユーザーグレード
// 取引カウント
// 住所登録
// 規約ページ作成
// 下書き出品の一覧表示
// ユーザーの情報公開ページ
// aos
// 緑ボタンを黒に

import React, { useEffect, useState, useContext } from "react";
import { MyContext } from "../provider/MyContext";
import { useNavigate } from "react-router-dom";
import { myUrl } from "../route/MainRoute.js";

// component群
import SvgIcon from "../components/SvgIcon.js";
import SupplierFooter from "../components/SupplierFooter";
// import BuyerFooter from "../components/BuyerFooter";
import FooterLink from "../components/FooterLink.js";
import CommonHeader from "../components/CommonHeader.js";

//css群
import "../css/c9_smypage.css";

//api群
const { post_login_req, post_logout_req, postSupplierUserEdit } = require("../api/post_data_req.js");
const { get_user_profile_req } = require("../api/get_data_req.js");

// function群
const { funcIsLoginErrorCss } = require("../js/function_input.js");
const req_base_url = require("../js/get_base_url");
const baseUrl = req_base_url();

const defaultIntPassVisible = 1;
const passVisibleArray = ["password", "text"];

const SupplierMypage = () => {
	const { state, setState } = useContext(MyContext);
	const navigate = useNavigate();

	const [isErrorloginMail, setIsErrorloginMail] = useState(false);
	const [isErrorloginPass, setIsErrorloginPass] = useState(false);

	function resetLoginErr() {
		setIsErrorloginMail(false);
		setIsErrorloginPass(false);
		setIntPassVisible(defaultIntPassVisible);
	}

	// ログイン機能
	function login() {
		const mail_address = document.getElementById("mail_address").value;
		const password = document.getElementById("password").value;

		let isError = false;
		if (mail_address == "") {
			isError = true;
			setIsErrorloginMail(true);
		} else if (isErrorloginMail) {
			setIsErrorloginMail(false);
		}
		if (password == "") {
			isError = true;
			setIsErrorloginPass(true);
		}

		if (!isError) {
			const postDataDict = { mail_address, password };
			post_login_req(postDataDict)
				.then((dataDict) => {
					var newDict = { ...state };
					newDict["userData"] = dataDict;
					setState(newDict);
					setPageState(0);
					// navigate(myUrl("s_i_mana_l"));
					window.scrollTo(0, 0);
				})
				.catch((error) => {
					// alert("Login failed");
					setIsErrorloginPass(true);
				});
		}
	}

	// ログアウト機能
	function logout() {
		post_logout_req()
			.then((dataDict) => {
				var newDict = { ...state };
				newDict["userData"]["is_guest"] = true;
				newDict["userData"]["is_seller"] = false;
				setState(newDict);
				window.scrollTo(0, 0);
			})
			.catch((error) => {
				alert("Logout failed");
			});
	}

	const [pageState, setPageState] = useState(0); // 0生産top 1生産ログイン 2生産編集
	const [isApiprocess, setIsApiprocess] = useState(false);
	const [imgReload, setImgReload] = useState("");
	const [intPassVisible, setIntPassVisible] = useState(defaultIntPassVisible);

	function togglePasswordVisibility() {
		if (intPassVisible === 0) {
			setIntPassVisible(1);
		} else {
			setIntPassVisible(0);
		}
	}

	const [formData, setFormData] = useState({});
	function funcSetFormData() {
		if (!state.userData.is_guest && state.userData.is_seller) {
			return setFormData({
				id: state.userData.id,
				first_name: state.userData.first_name,
				campany_name: state.userData.campany_name,
				campany_discripsion: state.userData.campany_discripsion,
				campany_locate_name: state.userData.campany_locate_name,
				campany_header_image_url: state.userData.campany_header_image_url,
				campany_header_image_base64: state.userData.campany_header_image_base64,
				campany_image_url: state.userData.campany_image_url,
				campany_image_base64: state.userData.campany_image_base64,

				company_feature1_summary: state.userData.company_feature1_summary,
				company_feature1_discripsion: state.userData.company_feature1_discripsion,
				company_feature1_image_url: state.userData.company_feature1_image_url,
				company_feature1_image_base64: state.userData.company_feature1_image_base64,

				company_feature2_summary: state.userData.company_feature2_summary,
				company_feature2_discripsion: state.userData.company_feature2_discripsion,
				company_feature2_image_url: state.userData.company_feature2_image_url,
				company_feature2_image_base64: state.userData.company_feature2_image_base64,

				company_feature3_summary: state.userData.company_feature3_summary,
				company_feature3_discripsion: state.userData.company_feature3_discripsion,
				company_feature3_image_url: state.userData.company_feature3_image_url,
				company_feature3_image_base64: state.userData.company_feature3_image_base64,
			});
		}
	}
	// フォームデータ変更機構
	const handleChange = (e) => {
		const { name, value } = e.target;
		setFormData({
			...formData,
			[name]: value,
		});
	};

	const handleConfirm = () => {
		setIsApiprocess(true);
		const postData = { ...formData };
		postSupplierUserEdit(postData)
			.then((dataDict) => {
				var newDict = { ...state };
				newDict["userData"] = dataDict;
				setState(newDict);
				setImgReload("?edit=" + String(Math.floor(Date.now() / 1000))); //キャッシュ画像対策
				setPageState(0);
				setIsApiprocess(false);
			})
			.catch((error) => {
				setIsApiprocess(false);
			});
	};

	function uploadImg(event, formKey, imgwidth, imgheight) {
		const reader = new FileReader();
		const file = event.target.files[0];
		if (!file) return;

		// イベント設定
		reader.onload = function (e) {
			const img = new Image();
			img.src = e.target.result;
			img.onload = function () {
				const canvas = document.createElement("canvas");
				const ctx = canvas.getContext("2d");

				// 目的のアスペクト比を計算
				const targetAspect = imgwidth / imgheight;
				let cropWidth, cropHeight, cropX, cropY;

				if (img.width / img.height > targetAspect) {
					// 幅が長い場合、余分な幅をカット
					cropHeight = img.height;
					cropWidth = img.height * targetAspect;
					cropX = (img.width - cropWidth) / 2;
					cropY = 0;
				} else {
					// 高さが長い場合、余分な高さをカット
					cropWidth = img.width;
					cropHeight = img.width / targetAspect;
					cropX = 0;
					cropY = (img.height - cropHeight) / 2;
				}

				// クロップ後、リサイズして描画
				canvas.width = imgwidth;
				canvas.height = imgheight;
				ctx.drawImage(img, cropX, cropY, cropWidth, cropHeight, 0, 0, imgwidth, imgheight);
				const compressedDataUrl = canvas.toDataURL("image/jpeg", 0.25);

				setFormData({
					...formData,
					[formKey]: compressedDataUrl,
				});
			};
		};
		reader.readAsDataURL(file);
	}

	// キャッシュ対策込み
	function srcImage(image_base64, imaeg_url) {
		if (image_base64 === "" || image_base64 === undefined) {
			return baseUrl + imaeg_url + imgReload;
		} else {
			return image_base64;
		}
	}

	return (
		<>
			<CommonHeader />
			<p className="g-titlebar2">マイページ</p>
			{pageState === 0 && state.userData.is_guest && (
				<>
					<p className="c9-p12">ログイン</p>
					<button className="c9-btn1 g-btn1 g-btn-clr1" onClick={() => setPageState(1)}>
						ログイン
					</button>
				</>
			)}
			{pageState === 0 && !state.userData.is_guest && (
				<>
					<div className="c9-div8">
						<img className="c9-div8img" src={baseUrl + state.userData.campany_header_image_url + imgReload} alt="" />
						<img className="c9-div9img" src={baseUrl + state.userData.campany_image_url + imgReload} alt="" />
					</div>

					{/* <p>ID：{state.userData.id}</p> */}
					{/* <p>ランク：{state.userData.grade}</p> */}
					{/* <p>取引数：{state.userData.trade_count}</p> */}
					<p className="c9-p23">企業名：{state.userData.campany_name}</p>

					<button
						className="g-btn1 g-btn-clr3 g-btn-sp1"
						onClick={() => {
							funcSetFormData();
							setPageState(2);
						}}
					>
						プロフィールを編集
					</button>

					<button className="g-btn1 g-btn-clr2 g-btn-sp1">公開ページを確認</button>

					<p className="c9-p12">商品・受渡管理</p>
					<p className="c9-p13">住所登録</p>
					<p className="c9-p13" onClick={() => navigate(myUrl("s_i_mana_l"))}>
						出品した商品
					</p>
					<p className="c9-p16">下書き一覧</p>
					<p className="c9-p12">売上管理</p>
					<p className="c9-p13" onClick={() => navigate(myUrl("s_sale_mana"))}>
						売上管理
					</p>
					<p className="c9-p16" onClick={() => navigate(myUrl("s_trans"))}>
						振込申請
					</p>
				</>
			)}
			{pageState === 0 && (
				<>
					<p className="c9-p12">その他</p>
					<p className="c9-p13" onClick={() => navigate(myUrl("priv"))}>
						利用規約
					</p>
					<p className="c9-p13">プライバシーポリシー</p>
					<p className="c9-p13">ご利用ガイド</p>
					<p className="c9-p13">お問い合わせ・ご意見</p>
					<p className="c9-p14" onClick={logout}>
						ログアウト
					</p>
					<p className="c9-p15">バージョン情報</p>
				</>
			)}
			{pageState === 1 && (
				<div>
					<br />
					<br />

					<div className="g-inp-div-sp1">
						<label className="g-inp-label" for="mail_address">
							メールアドレス
						</label>
						<input className={funcIsLoginErrorCss(isErrorloginMail)} type="text" id="mail_address" name="mail_address" placeholder="gofarm@example.com" />
						{isErrorloginMail && <p className="g-p-err">アカウント名を入力してください。</p>}
					</div>

					<div className="g-inp-div-sp1">
						<label className="g-inp-label" for="password">
							パスワード
						</label>
						<div className="g-div-pass">
							<input className={funcIsLoginErrorCss(isErrorloginPass)} type={passVisibleArray[intPassVisible]} id="password" name="password" placeholder="パスワード" />
							<span id="passwordInputSpan" class="toggle-password" onClick={togglePasswordVisibility}>
								{intPassVisible === 0 ? <SvgIcon size={"1.3rem"} color={"#262626"} iconName={"eyeClose"} /> : <SvgIcon size={"1.2rem"} color={"#262626"} iconName={"eyeOpen"} />}
							</span>
							{isErrorloginPass && <p className="g-p-err">パスワードが間違っています。</p>}
						</div>
					</div>
					<br />
					<br />
					<br />
					<button className="g-btn1 g-btn-clr1 g-btn-sp1" onClick={login}>
						ログイン
					</button>

					<button
						className="g-btn1 g-btn-clr2 g-btn-sp1"
						onClick={() => {
							resetLoginErr();
							setPageState(0);
						}}
					>
						戻る
					</button>

					{/* <button className="g-btn1 g-btn-clr4">新規登録ご希望の方はこちら</button> */}
					<button className="g-btn1 g-btn-clr5">パスワードを忘れた方はこちら</button>
				</div>
			)}

			{pageState === 2 && (
				<>
					<div className="c9-div8">
						<div className="c9-div99">
							<img className="c9-div8img" src={srcImage(formData.campany_header_image_base64, state.userData.campany_header_image_url)} alt="" />
							<input
								className="c9-inp99"
								type="file"
								id="imageInput2"
								accept="image/*"
								onChange={(e) => {
									uploadImg(e, "campany_header_image_base64", 320, 112);
								}}
							/>
						</div>
						<div>
							<img className="c9-div9img" src={srcImage(formData.campany_image_base64, state.userData.campany_image_url)} alt="" />
							<input
								className="c9-inp98"
								type="file"
								id="imageInput2"
								accept="image/*"
								onChange={(e) => {
									uploadImg(e, "campany_image_base64", 64, 64);
								}}
							/>
						</div>
					</div>

					<p className="c9-p23">生産者名</p>
					<input className="g-inp" type="text" name="campany_name" value={formData.campany_name} placeholder="必須" onChange={handleChange} />
					<p className="c9-p23">産地住所</p>
					<input className="g-inp" type="text" name="campany_locate_name" value={formData.campany_locate_name} placeholder="必須" onChange={handleChange} />
					<p className="c9-p23">生産者紹介</p>
					<textarea className="g-txt" type="text" name="campany_discripsion" value={formData.campany_discripsion} placeholder="例）埼玉県本庄市の豊かな大地で育てた、こだわりのニンジンをご紹介します。当農園では、自然環境を大切にしながら、丹精込めて育てたニンジンを皆さまにお届けしています。" onChange={handleChange} />

					<p className="c9-p23">こだわり１</p>
					<input className="g-inp" type="text" name="company_feature1_summary" value={formData.company_feature1_summary} placeholder="必須" onChange={handleChange} />
					<div className="c9-div99">
						<img className="c9-div10img" src={srcImage(formData.company_feature1_image_base64, state.userData.company_feature1_image_url)} alt="" />
						<input
							className="c9-inp97"
							type="file"
							id="imageInput2"
							accept="image/*"
							onChange={(e) => {
								uploadImg(e, "company_feature1_image_base64", 320, 112);
							}}
						/>
					</div>
					<textarea className="g-txt" type="text" name="company_feature1_discripsion" value={formData.company_feature1_discripsion} placeholder="必須" onChange={handleChange} />

					<p className="c9-p23">こだわり２</p>
					<input className="g-inp" type="text" name="company_feature2_summary" value={formData.company_feature2_summary} placeholder="必須" onChange={handleChange} />
					<div className="c9-div99">
						<img className="c9-div10img" src={srcImage(formData.company_feature2_image_base64, state.userData.company_feature2_image_url)} alt="" />
						<input
							className="c9-inp97"
							type="file"
							id="imageInput2"
							accept="image/*"
							onChange={(e) => {
								uploadImg(e, "company_feature2_image_base64", 320, 112);
							}}
						/>
					</div>
					<textarea className="g-txt" type="text" name="company_feature2_discripsion" value={formData.company_feature2_discripsion} placeholder="必須" onChange={handleChange} />

					<p className="c9-p23">こだわり３</p>
					<input className="g-inp" type="text" name="company_feature3_summary" value={formData.company_feature3_summary} placeholder="必須" onChange={handleChange} />
					<div className="c9-div99">
						<img className="c9-div10img" src={srcImage(formData.company_feature3_image_base64, state.userData.company_feature3_image_url)} alt="" />
						<input
							className="c9-inp97"
							type="file"
							id="imageInput2"
							accept="image/*"
							onChange={(e) => {
								uploadImg(e, "company_feature3_image_base64", 320, 112);
							}}
						/>
					</div>
					<textarea className="g-txt" type="text" name="company_feature3_discripsion" value={formData.company_feature3_discripsion} placeholder="必須" onChange={handleChange} />

					<div style={{ height: "2em" }}></div>
					<button className="g-btn1 g-btn-clr3 g-btn-sp1" disabled={isApiprocess} onClick={handleConfirm}>
						更新する
					</button>

					<button className="g-btn1 g-btn-clr2 g-btn-sp1" disabled={isApiprocess} onClick={() => setPageState(0)}>
						キャンセル
					</button>
				</>
			)}
			<FooterLink />
			<SupplierFooter colorArray={[0, 0, 0, 1]} />
		</>
	);
};

export default SupplierMypage;
