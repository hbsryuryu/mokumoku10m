import React, { useContext, useEffect } from "react";
import { MyContext } from "../provider/MyContext";
import { useNavigate } from "react-router-dom";
import { myUrl } from "../route/MainRoute.js";

//css群!!!
import "../css/splash.css";

//api群!!!
import { getCookie } from "../js/function_cookie";

// 再レンダリングによる上書を防止

const debugSplash = false;
// const debugSplash = false;
// document.cookie = "isVisit=yes; path=/; max-age=0;

const Top = () => {
	const { state, setState } = useContext(MyContext);
	const navigate = useNavigate();

	const [showSplash, setShowSplash] = React.useState(!state.isFirstload);
	const [fadeOut, setFadeOut] = React.useState(false);

	useEffect(() => {
		// 1秒後にフェードアウトを開始
		if (!state.isFirstload) {
			const timer = setTimeout(() => {
				setFadeOut(true);
				setState({ ...state, ["isFirstload"]: true });
			}, 1000);

			// 0.5秒後にスプラッシュ画面を完全に消す
			const removeSplash = setTimeout(() => {
				setShowSplash(false);
				if (!debugSplash) {
					if (getCookie("isVisit") === "yes") {
						navigate(myUrl("b_i_find_s"));
					} else {
						navigate(myUrl("onbo"));
					}
				}
			}, 1500);

			return () => {
				clearTimeout(timer);
				clearTimeout(removeSplash);
			};
		} else {
			navigate(myUrl("b_i_find_s"));
		}
	}, []);

	return <>{showSplash && <div style={{ backgroundImage: `url(${require("../img/splash2.png")})` }} className={`splash-screen ${fadeOut ? "fade-out" : ""}`}></div>}</>;
};

export default Top;
