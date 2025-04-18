// gofarmのロゴ

import React, { useContext } from "react";
import { MyContext } from "../provider/MyContext";
import { useNavigate } from "react-router-dom";
import { myUrl } from "../route/MainRoute.js";

// component群
// import SupplierFooter from "../components/SupplierFooter";
// import BuyerFooter from "../components/BuyerFooter";
import CommonHeader from "../components/CommonHeader.js";

//css群
import "../css/splash.css";

//api群
const { post_login_req, post_logout_req, postSupplierUserEdit } = require("../api/post_data_req.js");
const { get_user_profile_req } = require("../api/get_data_req.js");
const req_base_url = require("../js/get_base_url");
const baseUrl = req_base_url();

// 再レンダリングによる上書を防止

const SVG_ICON1 =
	'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 576 512" width="18" height="15"><path d="M288 32c-80.8 0-145.5 36.8-192.6 80.6C48.6 156 17.3 208 2.5 243.7c-3.3 7.9-3.3 16.7 0 24.6C17.3 304 48.6 356 95.4 399.4C142.5 443.2 207.2 480 288 480s145.5-36.8 192.6-80.6c46.8-43.5 78.1-95.4 93-131.1c3.3-7.9 3.3-16.7 0-24.6c-14.9-35.7-46.2-87.7-93-131.1C433.5 68.8 368.8 32 288 32zM144 256a144 144 0 1 1 288 0 144 144 0 1 1 -288 0zm144-64c0 35.3-28.7 64-64 64c-7.1 0-13.9-1.2-20.3-3.3c-5.5-1.8-11.9 1.6-11.7 7.4c.3 6.9 1.3 13.8 3.2 20.7c13.7 51.2 66.4 81.6 117.6 67.9s81.6-66.4 67.9-117.6c-11.1-41.5-47.8-69.4-88.6-71.1c-5.8-.2-9.2 6.1-7.4 11.7c2.1 6.4 3.3 13.2 3.3 20.3z"/></svg>';

const SVG_ICON2 =
	'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 512" width="20" height="15"><path d="M38.8 5.1C28.4-3.1 13.3-1.2 5.1 9.2S-1.2 34.7 9.2 42.9l592 464c10.4 8.2 25.5 6.3 33.7-4.1s6.3-25.5-4.1-33.7L525.6 386.7c39.6-40.6 66.4-86.1 79.9-118.4c3.3-7.9 3.3-16.7 0-24.6c-14.9-35.7-46.2-87.7-93-131.1C465.5 68.8 400.8 32 320 32c-68.2 0-125 26.3-169.3 60.8L38.8 5.1zM223.1 149.5C248.6 126.2 282.7 112 320 112c79.5 0 144 64.5 144 144c0 24.9-6.3 48.3-17.4 68.7L408 294.5c8.4-19.3 10.6-41.4 4.8-63.3c-11.1-41.5-47.8-69.4-88.6-71.1c-5.8-.2-9.2 6.1-7.4 11.7c2.1 6.4 3.3 13.2 3.3 20.3c0 10.2-2.4 19.8-6.6 28.3l-90.3-70.8zM373 389.9c-16.4 6.5-34.3 10.1-53 10.1c-79.5 0-144-64.5-144-144c0-6.9 .5-13.6 1.4-20.2L83.1 161.5C60.3 191.2 44 220.8 34.5 243.7c-3.3 7.9-3.3 16.7 0 24.6c14.9 35.7 46.2 87.7 93 131.1C174.5 443.2 239.2 480 320 480c47.8 0 89.9-12.9 126.2-32.5L373 389.9z"/></svg>';

const SupplierTop = () => {
	// 注意再レンダリングでここから下すべて再実行される

	//MyContext.Provider経由でstateと更新用setStateをMyContextから読み込んで、
	// stateをこちら側ではstateで変数定義,setStateをこちら側ではsetStateで変数定義
	const { state, setState } = useContext(MyContext);
	const navigate = useNavigate();

	// ログイン機能
	function login() {
		const mail_address = document.getElementById("mail_address").value;
		const password = document.getElementById("passwordInput").value;
		const postDataDict = { mail_address, password };

		post_login_req(postDataDict)
			.then((dataDict) => {
				var newDict = { ...state };
				newDict["userData"] = dataDict;
				setState(newDict);
				navigate(myUrl("s_i_mana_l"));
				window.scrollTo(0, 0);
			})
			.catch((error) => {
				alert("Login failed");
			});
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

	// トークンで自動ログイン
	function getUserProfile() {
		get_user_profile_req()
			.then((dataDict) => {
				var newDict = { ...state };
				newDict["userData"] = dataDict;
				setState(newDict);
				navigate(myUrl("s_i_mana_l"));
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

	const [showSplash, setShowSplash] = React.useState(!state.isFirstload);
	const [fadeOut, setFadeOut] = React.useState(false);

	React.useEffect(() => {
		if (state.userData.is_guest) {
			getUserProfile();
		}
		// 1秒後にフェードアウトを開始
		if (!state.isFirstload) {
			const timer = setTimeout(() => {
				setFadeOut(true);
				setState({ ...state, ["isFirstload"]: true });
			}, 1000);

			// 0.5秒後にスプラッシュ画面を完全に消す
			const removeSplash = setTimeout(() => {
				setShowSplash(false);
			}, 1500);

			return () => {
				clearTimeout(timer);
				clearTimeout(removeSplash);
			};
		}
	}, []);

	function togglePasswordVisibility() {
		var passwordInput = document.getElementById("passwordInput");
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
			{showSplash && <div style={{ backgroundImage: `url(${require("../img/splash1.png")})` }} className={`splash-screen ${fadeOut ? "fade-out" : ""}`}></div>}

			{state.isFirstload && (
				<>
					<CommonHeader />
					<div>
						<br />
						<br />
						<div className="c9-div5">
							<input className="g-inp" type="text" id="mail_address" name="mail_address" placeholder="gofarm@example.com" />
							{/* <p>アカウント名を入力してください。</p> */}
						</div>

						<div className="c9-div5">
							<input className="g-inp" type="text" id="passwordInput" name="password" placeholder="パスワード" />
							<span className="c9-span2" id="passwordInputSpan" class="toggle-password" onClick={togglePasswordVisibility} dangerouslySetInnerHTML={{ __html: SVG_ICON1 }} />
							{/* <p>パスワードを入力してください</p> */}
						</div>
						<br />
						<br />
						<button className="c9-btn1 g-btn1 g-btn-clr1" onClick={login}>
							ログイン
						</button>

						{/* <p>新規登録の方はこちら</p> */}
					</div>
				</>
			)}
		</>
	);
};

export default SupplierTop;
