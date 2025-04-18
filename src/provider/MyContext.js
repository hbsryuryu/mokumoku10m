// useMemoと組み合わせて高速レンダリング

// App.jsから全体にMyContextが提供される
import React, { createContext, useState } from "react";
import { getCookie } from "../js/function_cookie.js";

var init_array = {}; //初期値
init_array["isFirstload"] = false;
init_array["itemList"] = [];
init_array["selectBuyItem"] = {
	itemId: 0,
	localLocateId: 0,
	orderCount: 20,
	isPaySubmit: false,
};
init_array["userData"] = {
	id: 0,
	name: "ゲストです", //のちに廃止
	firstName: "ゲストです",
	lastName: "ゲストです",
	firstNamekana: "ゲストです",
	lastNamekana: "ゲストです",
	nickName: "ゲストです",
	phoneNumber: "12345678912",
	zipcode: "1234567",
	mailAddress: "",
	password: "",
	user_locate_name: "群馬県吾妻郡長野原町林林長野原線",
	user_locate_longitude: 138.678574,
	user_locate_latitude: 36.556637,
	user_locate_is_use_geo_api: true,
	farmName: "デバックXX農園", //のちに廃止
	campanyName: "株式会社デバックXX農園",
	userGrade: 0, //A,B,C,D,E,F,G のちに数字で管理
	payments: { paymentArray: [], isNone: true },
	is_guest: true, //のちのち未ログイン時に使う
	isSeler: false, //DB登録時に必ずfalse上書きでセキュリティ対策
	imageBase64: "",
	imageurl: "",
	tradeCount: 3,
};
const googleMapApiKey = getCookie("session_name");
if (googleMapApiKey !== "") {
	init_array["googleMapApiKey"] = googleMapApiKey;
	document.cookie = "session_name=session_name; path=/; max-age=0;";
} else {
	init_array["googleMapApiKey"] = process.env.REACT_APP_session_name;
}
const MyContext = createContext();

const MyProvider = ({ children }) => {
	const [state, setState] = useState(init_array);
	return <MyContext.Provider value={{ state, setState }}>{children}</MyContext.Provider>;
};

export { MyContext, MyProvider };
