// 画像アップロード枠機能
// メール送信機能
// css読み込み元整理 ｃ71に統一
// お問い合わせ内容確認画面

import "../css/c9_smypage.css";

import React, { useEffect, useState, useContext } from "react";
import { MyContext } from "../provider/MyContext";
import { useNavigate } from "react-router-dom";
import { myUrl } from "../route/MainRoute.js";

// component群
import SvgIcon from "../components/SvgIcon.js";
import BuyerFooter from "../components/BuyerFooter";
import FooterLink from "../components/FooterLink.js";
import CommonHeader from "../components/CommonHeader.js";

//css群
import "../css/c71_ContactUs.css";

//api群
const { post_login_req, post_logout_req, postSupplierUserEdit, postContactUs } = require("../api/post_data_req.js");

// function群
const { funcIsLoginErrorCss } = require("../js/function_input.js");
const req_base_url = require("../js/get_base_url");
const baseUrl = req_base_url();

const maxCountUpload = 4;

const defaultIntPassVisible = 1;
const passVisibleArray = ["password", "text"];

const maxLengthDict = {
	contact_subject: 100,
	last_name: 15,
	first_name: 15,
	last_name_kana: 15,
	first_name_kana: 15,
	nick_name: 15,
	phone_number: 11,
	content: 1000,
};

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

	const handleConfirm = () => {
		setIsApiprocess(true);
		postContactUs(formData2, images)
			.then((dataDict) => {
				alert("送信しました。");
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

				setFormData2({
					...formData2,
					[formKey]: compressedDataUrl,
				});
			};
		};
		reader.readAsDataURL(file);
	}

	//新規登録用のフォーム
	const [formData2, setFormData2] = useState({
		contact_subject: "",
		last_name: "",
		first_name: "",
		mail_address: "",
		content: "",
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

	const [images, setImages] = useState([]); // Fileオブジェクトを保存
	const handleImageChange = (event) => {
		const files = Array.from(event.target.files);

		// 既存の画像と新しい画像を結合し、最大4つだけ保持
		if (images.length < maxCountUpload) {
			setImages((prevImages) => {
				const newImages = [...prevImages, ...files];
				return newImages.slice(0, maxCountUpload); // 最初の4つのみを保持
			});
		}
	};
	const removeImagefunc = (index) => {
		const newImages = [...images];
		newImages.splice(index, 1);
		setImages(newImages);
	};

	return (
		<>
			<CommonHeader />
			<p className="g-titlebar">お問い合わせ</p>
			{pageState === 0 && state.userData.is_guest && (
				<>
					<p className="c71-p1">
						お問い合わせ前にログインすると
						<br />
						ご注文状況を元に正確なご案内が可能です。
					</p>
					<button className="c71-btn1 g-btn1 g-btn-clr5" onClick={() => setPageState(1)}>
						ログインはこちら
					</button>
				</>
			)}
			{pageState === 0 && (
				<>
					<div>
						<p className="g-inp-p">件名</p>

						<input className="g-inp" type="text" name="contact_subject" value={formData2.contact_subject} onChange={handleChange2} placeholder="お問い合わせ内容を入力してください" />
						<p className="g-inp-p2u">
							{formData2.contact_subject.length}/{maxLengthDict.contact_subject}
						</p>
					</div>
					<div>
						<p className="g-inp-p">姓</p>

						<input className="g-inp" type="text" name="last_name" value={formData2.last_name} onChange={handleChange2} placeholder="例）山田" />
						<p className="g-inp-p2u">
							{formData2.last_name.length}/{maxLengthDict.last_name}
						</p>
					</div>
					<div>
						<p className="g-inp-p">名</p>
						<input className="g-inp" type="text" name="first_name" value={formData2.first_name} onChange={handleChange2} placeholder="例）太郎" />
						<p className="g-inp-p2u">
							{formData2.first_name.length}/{maxLengthDict.first_name}
						</p>
					</div>

					<div>
						<p className="g-inp-p">メールアドレス</p>
						<input className="g-inp" type="email" name="mail_address" value={formData2.mail_address} onChange={handleChange2} placeholder="例）gofarm@example.com" />
					</div>

					<div>
						<p className="g-inp-p">お問い合わせ内容</p>
						<textarea className="g-txt" type="text" name="content" value={formData2.content} placeholder="お客さまのお困りごとの早期解決のため、「お問い合わせ内容」はできるだけ詳細に記載いただくようにお願いいたします。" onChange={handleChange2} />
						<p className="g-inp-p2u">
							{formData2.content.length}/{maxLengthDict.content}
						</p>
					</div>

					<div className="">
						<input type="file" id="imageInput4" accept="image/*" multiple onChange={handleImageChange} />
						<div style={{ display: "flex", flexWrap: "wrap", marginTop: "10px" }}>
							{images.map((file, index) => {
								const imageUrl = URL.createObjectURL(file);
								return (
									<>
										<img key={index} src={imageUrl} alt={`Uploaded ${index}`} style={{ width: "100px", height: "100px", margin: "5px", objectFit: "cover" }} onLoad={() => URL.revokeObjectURL(imageUrl)} />
										<p onClick={() => removeImagefunc(index)}>x</p>
									</>
								);
							})}
						</div>
						<p>※お問い合わせ内容の写真が添付できます</p>
						<p>※JPEG、PNG形式の写真最大4枚まで添付可能です</p>
					</div>
					<p className="c71-p96">規約規約、プライバシーポリシーに同意の上送信してください</p>
					<button className="g-btn1 g-btn-clr1 g-btn-sp1" onClick={handleConfirm}>
						送信する
					</button>
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
					<p className="">ダミー</p>
				</>
			)}
			<FooterLink />
			<BuyerFooter colorArray={[0, 0, 1]} />
		</>
	);
};

export default SupplierMypage;
